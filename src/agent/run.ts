import { generateText, streamText, type AgentCallParameters, type ModelMessage } from "ai";
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
    const { text, toolCalls } = await generateText({
        model: openai(MODEL_NAME),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools,
        telemetry: {
            integrations: aiSdkTelemetry(),
        },
    });

    // await Laminar.flush();

    // console.log(text, toolCalls);

    // toolCalls.forEach(async element => {
    //     console.log(await executeTool(element.toolName, element.input));
    // });

    // try {
    //     callbacks?.onComplete?.(text);
    // } catch (e) {
    //     // ignore callback errors
    // }

    // const newHistory: ModelMessage[] = [
    //     ...workingHistory,
    //     { role: "assistant", content: text },
    // ];

    // return newHistory;
    const workingHistory = filterCompatibleMessages(conversationHistory)
    const messages: ModelMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...workingHistory,
        { role: "user", content: userMessage },
    ];
    let fullResponse = "";
    while ( true ) {
        const result = streamText({
            model: openai(MODEL_NAME),
            messages,
            tools,
            telemetry: {
                integrations: aiSdkTelemetry(),
            },
        });
    }
    await Laminar.flush();
    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";
    let steamError: Error | null = null;
    try {
        for await ( const chunk of result.fullStream) {
            if ( chunk.type === "text-delta" ) {
                currentText += chunk.text
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
        streamError = e as Error;
        if (!currentText && !steamError?.message.includes("No output generated")) {
            throw steamError;
        }
    }
    
    
};
