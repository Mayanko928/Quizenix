import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { PROMPT_INJECTION_DEFENSE, wrapUntrusted } from "./prompt-safety";
import {
  buildSystemPrompt,
  GROUNDING_RULES_LABELLED,
  LEARNING_PHILOSOPHY,
  TEACHING_DEPTH,
} from "./ai-identity";

const Input = z.object({
  question: z.string().min(1).max(4000),
  context: z.string().max(200000).optional(),
  mode: z
    .enum([
      "explain-simply",
      "analogy",
      "coding-example",
      "real-world",
      "compare",
      "professor",
      "beginner",
      "default",
    ])
    .default("default"),
});

const modeInstruction: Record<string, string> = {
  "explain-simply": "Explain like I'm 12. Short sentences.",
  analogy: "Teach using a vivid everyday analogy first, then the technical answer.",
  "coding-example": "Include a short, correct code example in the most relevant language.",
  "real-world": "Anchor the explanation in a concrete real-world application or scenario.",
  compare: "Compare and contrast the key related concepts in a small table-like list.",
  professor: "Teach like a passionate university professor — structured, rigorous, with intuition.",
  beginner: "Assume zero background. Build from first principles.",
  default: "Be a warm, precise tutor. Encourage the student.",
};

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ answer: string }> => {
    (await import("./rate-limit.server")).guard("ai.tutor", 30, 60_000, { mode: data.mode });

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const system = buildSystemPrompt(
      PROMPT_INJECTION_DEFENSE,
      GROUNDING_RULES_LABELLED,
      LEARNING_PHILOSOPHY,
      TEACHING_DEPTH,
      `Focus on CONCEPTUAL MASTERY. ${modeInstruction[data.mode]} Be concise, accurate, and teach — never dump text. Use markdown-lite (bold, short bullets) sparingly. End with one short active-recall question that checks whether the student understood.`,
    );

    const prompt = data.context
      ? `Student's study notes:\n${wrapUntrusted(data.context.slice(0, 40000), "study notes")}\n\nStudent's question:\n${wrapUntrusted(data.question, "student question")}`
      : wrapUntrusted(data.question, "student question");

    const result = await generateText({ model, system, prompt });
    return { answer: result.text.trim() };
  });
