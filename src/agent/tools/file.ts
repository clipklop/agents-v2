import { tool } from 'ai';
import { z } from 'zod';
import fs from 'node:fs/promises';
import nodePath from 'node:path';

export const readFile = tool({
    description: "Reads the content of a file at the given path.",
    inputSchema: z.object({
        filePath: z.string().describe("The path to the file you want to read.").min(1, "File path cannot be empty"),
    }),
    execute: async ({ filePath }) => {
        try {
            const absolutePath = nodePath.resolve(filePath);
            const content = await fs.readFile(absolutePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
        }
    },
});
