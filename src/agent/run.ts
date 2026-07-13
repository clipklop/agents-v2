import { generateText, type AgentCallParameters, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { tools } from "./tools";
import { executeTool } from "./executeTools";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types";

const MODEL_NAME = "gpt-5.4-mini";

export const runAgent = async (
    userMessage: string, 
    conversationHistory: ModelMessage[],
    callbacks: AgentCallbacks,
) => {
    const { text, toolCalls } = await generateText({
        model: openai(MODEL_NAME),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools,
    });
    console.log(text, toolCalls);

    toolCalls.forEach(async element => {
        console.log(await executeTool(element.toolName, element.input));
    });
};

runAgent("What's the current date?");
