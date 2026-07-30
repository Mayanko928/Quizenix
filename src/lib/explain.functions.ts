import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const system = `You are Quizenix, an expert AI tutor turning a flashcard into a mini-lesson. ${LENS_INSTRUCTION[data.lens]} Be accurate and concise (max ~180 words). Use plain text with short bullets; no headings, no code fences unless showing code.`;

    const prompt = `${data.topic ? `Topic: ${data.topic}\n` : ""}Flashcard question: ${data.question}\nFlashcard answer: ${data.answer}`;

    const result = await generateText({ model, system, prompt });
    return { text: result.text.trim() };
  });
