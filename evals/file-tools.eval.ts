import { evaluate } from "@lmnr-ai/lmnr";
import { toolSelectionScore } from "./evaluators.ts";

import type { EvalData, EvalTarget, SingleTurnResult } from "./types.ts";
import dataset from "./data/file-tools.json" with { type: "json" };
import { singleTurnExecutorMocks } from "./executors.ts";

const executor = async (evalData: EvalData): Promise<SingleTurnResult> => {
  return await singleTurnExecutorMocks(evalData);
}

evaluate({
  data: dataset as any,
  executor,
  evaluators: {
    selectionScore: (output: SingleTurnResult, target: EvalTarget) => { 
        if (target?.category === "secondary") return 1;
        return toolSelectionScore(output, target);
    },
  },
  groupName: "file-tools-selection",
  config: {
    projectApiKey: process.env.LMNR_PROJECT_API_KEY ?? process.env.LMNR_API_KEY,
  },
});
