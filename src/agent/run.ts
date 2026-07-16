import { generateText, type AgentCallParameters, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, aiSdkTelemetry } from "@lmnr-ai/lmnr";

import { tools } from "./tools/index.js";
import { executeTool } from "./executeTools.js";
import { SYSTEM_PROMPT } from "./system/prompt.js";

import type { AgentCallbacks } from "../types.js";

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
        // messages: [
        //     ...conversationHistory,
        //     { role: "user", content: userMessage },
        // ],
        system: SYSTEM_PROMPT,
        tools,
        telemetry: {
            integrations: aiSdkTelemetry(),
        },
    });

    await Laminar.flush();

    console.log(text, toolCalls);

    toolCalls.forEach(async element => {
        console.log(await executeTool(element.toolName, element.input));
    });

    try {
        callbacks?.onComplete?.(text);
    } catch (e) {
        // ignore callback errors
    }

    const newHistory: ModelMessage[] = [
        ...conversationHistory,
        { role: "assistant", content: text },
    ];

    return newHistory;
};

// Example invocation for manual testing (commented out)
// runAgent("What's the current date?", [], {
//   onToken: () => {},
//   onToolCallStart: () => {},
//   onToolCallEnd: () => {},
//   onComplete: () => {},
//   onToolApproval: async () => false,
// });
