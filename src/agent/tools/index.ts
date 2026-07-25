import { dateTime } from "./dateTime.ts";
import { readFile, writeFile, deleteFile, listFiles } from "./file.ts"
import { webSearch } from "./webSearch.ts";

// All tools combined for the agent
export const tools = {
    dateTime,
    webSearch,
    readFile,
    writeFile,
    listFiles,
    deleteFile
};

