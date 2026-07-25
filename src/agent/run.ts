import { generateText, streamText, tool, type AgentCallParameters, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, aiSdkTelemetry } from "@lmnr-ai/lmnr";

import { tools } from "./tools/index.js";
import { executeTool } from "./executeTools.js";
import { SYSTEM_PROMPT } from "./system/prompt.js";

import type { AgentCallbacks, ToolCallInfo } from "../types.js";
import { filterCompatibleMessages } from "./system/filterMessages.js";

const MODEL_NAME = "gpt-5.4-mini";

Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export const runAgent = async (
    userMessage: string,
    conversationHistory: ModelMessage[],
    callbacks: AgentCallbacks,
): Promise<ModelMessage[]> => {
    const workingHistory = filterCompatibleMessages(conversationHistory)
    const messages: ModelMessage[] = [
        ...workingHistory,
        { role: "user", content: userMessage },
    ];
    let fullResponse = "";
    while ( true ) {
        const result = streamText({
            model: openai(MODEL_NAME),
            instructions: SYSTEM_PROMPT,
            messages,
            tools,
            telemetry: {
                integrations: aiSdkTelemetry(),
            },
        });

        const toolCalls: ToolCallInfo[] = [];
        let currentText = "";
        try {
            for await ( const chunk of result.fullStream ) {
                if ( chunk.type === "error" ) {
                    throw chunk.error instanceof Error
                        ? chunk.error
                        : new Error(String(chunk.error));
                }
                if ( chunk.type === "text-delta" ) {
                    currentText += chunk.text;
                    callbacks.onToken(chunk.text);
                }
                if ( chunk.type === "tool-call" ) {
                    const input = "input" in chunk ? chunk.input : {};
                    toolCalls.push({
                        toolCallId: chunk.toolCallId,
                        toolName: chunk.toolName,
                        args: input as any,
                    });
                    callbacks.onToolCallStart(chunk.toolName, input);
                }
            }
        } catch (e) {
            throw e instanceof Error ? e : new Error(String(e));
        }

        fullResponse += currentText;

        const finishReason = await result.finishReason;
        if (finishReason !== "tool-calls" || toolCalls.length === 0) {
            const responseMessage = await result.response;
            messages.push(...responseMessage.messages);
            break;
        }
        // adding generated tool calls to response
        const responseMessage = await result.response;
        messages.push(...responseMessage.messages);
        // adding the result of tool calls to response
        // otherwise LLM won't know that it called the tool before
        for ( const tc of toolCalls ) {
            const result = await executeTool(tc.toolName, tc.args);
            callbacks.onToolCallEnd(tc.toolName, result);
            messages.push({
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: tc.toolCallId,
                        toolName: tc.toolName,
                        output: { type: "text", value: "result"},
                    }
                ],
            });
        }
    }
    callbacks.onComplete(fullResponse);
    await Laminar.flush();
    return messages;
};
