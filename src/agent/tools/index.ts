import { dateTime } from "./dateTime.ts";
import { readFile, writeFile, deleteFile, listFiles } from "./file.ts"
// All tools combined for the agent

export const tools = {
    dateTime,
    readFile,
    writeFile,
    listFiles,
    deleteFile
};

