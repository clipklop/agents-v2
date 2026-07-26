import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";

const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the converstation so far that preserves:
1. Key decisions and conclusions reached
2. Important context and facts mentioned
3. Any pending tasks or questions
4. The overall purpose and goals of the conversation

Be concise but complete. The summary should allow the conversation to continue naturally.
Conversation to summarize:
`;

/**
 * Format messages array as readable text for summarization
 */
function messagesToText(messages: ModelMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role.toUpperCase();
      const content = extractMessageText(msg);
      return `[${role}]: ${content}`;
    })
    .join("\n\n");
}

/**
 * Compact a conversation by summarizing it with an LLM.
 *
 * Takes the current messages (excluding system prompt) and returns a new
 * messages array with:
 * - A user message containing the summary
 * - An assistant acknowledgment
 *
 * The system prompt should be prepended by the caller.
 */
export async function compactConversation(
  messages: ModelMessage[],
  model: string = "gpt-5.4-mini",
): Promise<any> {
  // Filter out system messages - they're handled separately
  const conversationMessages = messages.filter((msg) => msg.role !== "system");
  if (conversationMessages.length === 0) {
    return [];
  }

  const conversationText = messagesToText(conversationMessages);

  const summary = await generateText({
    model: openai(model),
    prompt: `${SUMMARIZATION_PROMPT}${conversationText}`,
  });

  const compactedMessages = [
    {
      role: "user",
      content: `[CONVERSATION SUMMARY]\n The following content is a summary of the conversation so far: ${summary}. Please continue the conversation where you left off.`
    },
    { role: "assistant",
      content: "I've summarized the conversation for you and I'm ready to continue." 
    },
  ];
  return compactedMessages;
}
