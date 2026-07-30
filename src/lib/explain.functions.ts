import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const EXPLAIN_LENSES = [
  "simpler",
  "detailed",
  "analogy",
  "visual",
  "code",
  "math",
  "practical",
  "animation",
  "history",
] as const;

export type ExplainLens = (typeof EXPLAIN_LENSES)[number];

const Input = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(4000),
  lens: z.enum(EXPLAIN_LENSES),
  topic: z.string().max(200).optional(),
});

const lensInstruction: Record<ExplainLens, string> = {
  simpler: "Re-explain it as simply as possible, as if to a curious 12-year-old. Short sentences.",
  detailed: "Give the rigorous, complete explanation a professor would give, with the underlying reasoning.",
  analogy: "Teach it through one vivid everyday analogy, then connect each part of the analogy back to the concept.",
  visual: "Describe a mental picture or diagram (in words, using a small ASCII sketch if useful) that makes it click.",
  code: "Show a short, correct code example in the most relevant language, with brief inline comments.",
  math: "Give the mathematical/formal treatment: notation, formula, and a worked micro-example.",
  practical: "Show one concrete practical application and how a professional would actually use this.",
  animation: "Describe, step by step, an animation that would illustrate this concept over time.",
  history: "Explain where this idea came from, who developed it, and what problem it originally solved.",
};

export const explainBetter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const system = `You are Quizenix, an expert AI tutor turning a flashcard into a mini-lesson. ${lensInstruction[data.lens]} Be accurate and concise (max ~180 words). Use plain text with short bullets; no headings, no code fences unless showing code.`;

    const prompt = `${data.topic ? `Topic: ${data.topic}\n` : ""}Flashcard question: ${data.question}\nFlashcard answer: ${data.answer}`;

    const result = await generateText({ model, system, prompt });
    return { text: result.text.trim() };
  });
