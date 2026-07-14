import { tools } from "./tools/index.js";
export type ToolName = keyof typeof tools;

export const executeTool = async (name:string, args:any) => {
    const tool = tools[name as ToolName];

    if (!tool) {
        return "Invalid tool"
    }

    const execute = tool.execute;
    if (!execute) {
        return "The tool doesn't have an execution"
    }

    const result = await execute(args, {
        toolCallId: "",
        messages: [],
        // Provide an empty context to satisfy the execution API; concrete
        // implementations can extend this as needed.
        context: {} as any,
    });

    return String(result);
};
