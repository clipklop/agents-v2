import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import type {
  EvalTarget,
  SingleTurnResult,
  MultiTurnTarget,
  MultiTurnResult,
} from "./types.ts";


const judgeSchema = z.object({
  score: z.number().min(1).max(10).describe("Score from 1 to 10 where 1 is the worst and 10 is the best"),
  reason: z.string().describe("Brief explanation for the evaluation score"),
});

export const llmJudge = async (output: MultiTurnResult, target: MultiTurnTarget) => {
  const result = await generateObject({
    model: openai("gpt-5.4-mini"),
    schema: judgeSchema,
    providerOptions: {
      openai: {
        reasoningEffort: "high",
      },
    },
    schemaDescription: "Evaluation of an AI agent response",
    messages: [
      {
        role: "system",
        content: `You are an expert evaluator for AI agent responses. Please assess the following output based on the target criteria:
          Scoring criteria: 
            10: Response fully addresses the query and is highly accurate;
            7-9: Response is mostly relevant and accurate;
            4-6: Response is partially relevant and accurate;
            1-3: Response is completely irrelevant or inaccurate`
      },
      {
        role: "user",
        content: `Task: ${target.originalTask}
        Tools called: ${JSON.stringify(output.toolCallOrder)}
        Tools results provides: ${JSON.stringify(target.mockToolResults)}
          
        Agent's final answer:
          ${output.text}

        Evaluate if this response correctly uses the tool results to answer the task`,
      }
    ],
  });

  return result.object.score / 10;
};

/**
 * Evaluator: Precision/recall score for tool selection.
 * Returns a score between 0 and 1 based on correct selections.
 * For secondary prompts.
 */
export function toolSelectionScore(
  output: SingleTurnResult,
  target: EvalTarget,
): number {
  if (!target.expectedTools?.length) {
    return output.selectedAny ? 0.5 : 1;
  }

  const expected = new Set(target.expectedTools);
  const selected = new Set(output.toolNames);

  const hits = output.toolNames.filter((t) => expected.has(t)).length;
  const precision = selected.size > 0 ? hits / selected.size : 0;
  const recall = expected.size > 0 ? hits / expected.size : 0;

  // Simple F1-ish score
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}
