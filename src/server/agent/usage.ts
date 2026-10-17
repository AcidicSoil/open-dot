import "server-only";

export type UsageProfile = "default" | "conserve";

const configured = process.env.DOTS_CHATGPT_USAGE ?? "default";
if (configured !== "default" && configured !== "conserve") {
  throw new Error(`Invalid DOTS_CHATGPT_USAGE "${configured}". Expected "default" or "conserve".`);
}

export const chatGPTUsage: {
  profile: UsageProfile;
  reasoning: { effort: "low" } | undefined;
  maxOutputTokens: number | undefined;
  maxSteps: number | undefined;
  localTitles: boolean;
} = configured === "conserve"
  ? { profile: "conserve", reasoning: { effort: "low" }, maxOutputTokens: 2048, maxSteps: 8, localTitles: true }
  : { profile: "default", reasoning: undefined, maxOutputTokens: undefined, maxSteps: undefined, localTitles: false };
