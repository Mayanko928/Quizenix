import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { PROMPT_INJECTION_DEFENSE, wrapUntrusted } from "./prompt-safety";
import { buildSystemPrompt, GROUNDING_RULES_LABELLED, LEARNING_PHILOSOPHY } from "./ai-identity";
import { EXPLAIN_LENSES, LENS_INSTRUCTION } from "./explain-lenses";

export const explainBetter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        answer: z.string().min(1).max(4000),
        lens: z.enum(EXPLAIN_LENSES),
        topic: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ text: string }> => {
    (await import("./rate-limit.server")).guard("ai.explain", 30, 60_000, { lens: data.lens });

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const system = buildSystemPrompt(
      PROMPT_INJECTION_DEFENSE,
      GROUNDING_RULES_LABELLED,
      LEARNING_PHILOSOPHY,
      `You are turning a flashcard into a mini-lesson. ${LENS_INSTRUCTION[data.lens]} Be accurate and concise (max ~180 words). Use plain text with short bullets; no headings, no code fences unless showing code. If you go beyond what the card and topic state, mark it **General knowledge**.`,
    );

    const prompt = wrapUntrusted(
      `${data.topic ? `Topic: ${data.topic}\n` : ""}Flashcard question: ${data.question}\nFlashcard answer: ${data.answer}`,
      "flashcard",
    );

    const result = await generateText({ model, system, prompt });
    return { text: result.text.trim() };
  });
