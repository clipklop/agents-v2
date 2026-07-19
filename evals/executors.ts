import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { aiSdkTelemetry } from "@lmnr-ai/lmnr";
import { z } from "zod";
import { SYSTEM_PROMPT } from "../src/agent/system/prompt.ts";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { buildMockedTools } from "./utils.ts";
import { ToolCall } from "../dist/ui/index";

const TOOL_DEFINITIONS: any = {
  readFile: {
    description: "Reads the contents of a file at the specified path.",
    parameters: z.object({
      path: z.string().describe("The path to the file to read."),
    }),
  },
  writeFile: {
    description: "Writes content to a file at the specified path.",
    parameters: z.object({
      path: z.string().describe("The path to the file to write."),
      content: z.string().describe("The content to write to the file."),
    }),
  },
  listFiles: {
    description: "Lists all files in the specified directory.",
    parameters: z.object({
      path: z.string().describe("The path to the directory to list."),
    }),
  },
  deleteFile: {
    description: "Deletes a file at the specified path.",
    parameters: z.object({
      path: z.string().describe("The path to the file to delete."),
    }),
  },
  runCommand: {
    description: "Execute a shell command in the terminal and returns the output.",
    parameters: z.object({
      command: z.string().describe("The shell command to execute."),
    }),
  },
} 

export const singleTurnExecutorMocks = async (evalData: EvalData) => {
  const availableTools: ToolSet = {};
  for (const toolName of evalData.tools) {
    const def = TOOL_DEFINITIONS[toolName];
    if (!def) {
      throw new Error(`Tool ${toolName} is not defined.`);
    }
    availableTools[toolName] = tool({
      description: def.description,
      inputSchema: def.parameters,
    });
  }
  const { toolCalls } = await generateText({
    model: openai(evalData.config?.model ?? "gpt-5.4-mini"),
    instructions: evalData.systemPrompt ?? SYSTEM_PROMPT,
    prompt: evalData.prompt,
    tools: availableTools,
    stopWhen: stepCountIs(1),
    temperature: evalData.config?.temperature ?? undefined,
    telemetry: {
      integrations: aiSdkTelemetry(),
    },
  });

  const calls = toolCalls.map(call => ({
    toolName: call.toolName,
    args: "args" in call ? call.args : {},
  }));
  const toolNames = calls.map(call => call.toolName);
  const selectedAny = calls.length > 0;

  return {
    toolCalls: calls,
    toolNames,
    selectedAny,
  } as SingleTurnResult;
};

export const multiTurnWithMocks = async (data: MultiTurnEvalData) => {
  // Implementation for multi-turn evaluation with mocks
  const tool = buildMockedTools(data.mockTools);

  const message: ModelMessages[] = data.messages ?? [
    { role: "system", content:  SYSTEM_PROMPT },
    { role: "user", content: data.prompt! }
  ];

  const result = await generateText({
    model: openai(data.config?.model ?? "gpt-5.4-mini"),
    // instructions: data.systemPrompt ?? SYSTEM_PROMPT,
    messages: message,
    tools: tool,
    stopWhen: stepCountIs(data.config?.maxSteps ?? 20),
  });

  const allToolCalls: string[] = [];
  const steps = result.steps.map((step) => {
    const stepToolCalls = (step.toolCalls ?? []).map((tc) => {
      allToolCalls.push(tc.toolName);
      return {
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : {}
      };
    });

    const stepResults = (step.staticToolResults ?? []).map((tr) => ({
      toolName: tr.toolName,
      result: "results" in tr ? tr.results : tr,
    }));
    
    return {
      toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
      toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
      text: step.text || undefined,
    };
  });

  const toolsUsed = [...new Set(allToolCalls)];
  return {
    text: result.text,
    steps,
    toolUsed,
    toolCallOrder: allToolCalls,
  };
};
