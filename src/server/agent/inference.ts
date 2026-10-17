import "server-only";
import OpenAI from "openai";
import type { Response, ResponseCreateParamsNonStreaming, ResponseOutputItem } from "openai/resources/responses/responses";
import type { ProviderBinding } from "./client";
import { recordChatGPTFailure } from "./chatgpt";
import { chatGPTUsage } from "./usage";

export function inferenceError(error: unknown): Error {
  if (error instanceof OpenAI.APIError) {
    const code = error.code ?? "request_failed";
    return new Error(`Model request failed (${error.status ?? "network"}, ${code}).${error.requestID ? ` Request ${error.requestID}.` : ""} Check the selected account, model, and usage in Settings.`);
  }
  return error instanceof Error ? error : new Error("The model request failed.");
}

export function terminalError(response: Response): Error {
  return new Error(`Model response ${response.status}: ${response.error?.code ?? response.incomplete_details?.reason ?? "unknown"}. Check account access and usage in Settings. No other billing provider was used.`);
}

export async function completedResponse(binding: ProviderBinding, params: Omit<ResponseCreateParamsNonStreaming, "model">, signal?: AbortSignal): Promise<Response> {
  try {
    const stream = await binding.client.responses.create({
      ...params,
      model: binding.model,
      ...(binding.stateless ? { store: false } : {}),
      ...(binding.provider === "chatgpt" && chatGPTUsage.maxOutputTokens ? { max_output_tokens: chatGPTUsage.maxOutputTokens } : {}),
      ...(binding.provider === "chatgpt" && chatGPTUsage.reasoning ? { reasoning: chatGPTUsage.reasoning } : {}),
      stream: true,
    }, { signal });
    let final: Response | null = null;
    const completedItems = new Map<number, ResponseOutputItem>();
    for await (const event of stream) {
      if (event.type === "response.output_item.done") completedItems.set(event.output_index, event.item);
      else if (event.type === "response.completed") final = event.response.output.length ? event.response : { ...event.response, output: [...completedItems].sort(([a], [b]) => a - b).map(([, item]) => item) };
      else if (event.type === "response.failed" || event.type === "response.incomplete") {
        if (binding.accountId && event.response.error?.code) recordChatGPTFailure(binding.accountId, event.response.error.code);
        throw terminalError(event.response);
      }
      else if (event.type === "error") {
        if (binding.accountId && event.code) recordChatGPTFailure(binding.accountId, event.code);
        throw new Error(`Model stream failed (${event.code ?? "unknown"}).`);
      }
    }
    if (!final) throw new Error("The model stream ended without completion.");
    return { ...final, output_text: final.output.filter((item) => item.type === "message").flatMap((item) => item.content).filter((part) => part.type === "output_text").map((part) => part.text).join("") };
  } catch (error) {
    if (binding.accountId && error instanceof OpenAI.APIError && error.code) recordChatGPTFailure(binding.accountId, error.code);
    throw inferenceError(error);
  }
}
