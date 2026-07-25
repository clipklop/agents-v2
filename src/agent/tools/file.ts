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
            throw new Error(`Failed to read file at ${filePath}: ${error}`);
        }
    },
});

export const writeFile = tool({
    description: "Writes content to a file at the given path. Creates the file if it does not exist, and overwrites it if it does.",
    inputSchema: z.object({
        filePath: z.string().describe("The path to the file you want to write to.").min(1, "File path cannot be empty"),
        content: z.string().describe("The content you want to write to the file."),
    }),
    execute: async ({ filePath, content }) => {
        try {
            const absolutePath = nodePath.resolve(filePath);
            
            const dir = nodePath.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(absolutePath, content, 'utf-8');
            return `Successfully wrote ${content.length} characters to file at ${filePath}`;
        } catch (error) {
            throw new Error(`Failed to write to file at ${filePath}: ${error}`);
        }
    },
});

export const listFiles = tool({
    description: "List all the files and directories in a given directory path.",
    inputSchema: z.object({
        directoryPath: z.string().describe("The path to the directory you want to list files from.").min(1, "Directory path cannot be empty"),
    }),
    execute: async ({ directoryPath }) => {
        try {
            const absolutePath = nodePath.resolve(directoryPath);
            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            const items = entries.map(entry => {
                const type = entry.isFile() ? 'file' : entry.isDirectory() ? 'directory' : 'other';
                return `${type}: ${entry.name}`;
            });
            return items.length > 0 ? items.join('\n') : `No files or directories found in ${directoryPath}`;
        } catch (error) {
            throw new Error(`Failed to list files in directory at ${directoryPath}: ${error}`);
        }
    }, 
});

export const deleteFile = tool({
    description: "Deletes a file at the given path. Use with caution as this operation cannot be undone.",
    inputSchema: z.object({
        filePath: z.string().describe("The path to the file you want to delete.").min(1, "File path cannot be empty"),
    }),
    execute: async ({ filePath }) => {
        try {
            const absolutePath = nodePath.resolve(filePath);
            await fs.unlink(absolutePath);
            return `Successfully deleted file at ${filePath}`;
        } catch (error) {
            throw new Error(`Failed to delete file at ${filePath}: ${error}`);
        }
    },
});
