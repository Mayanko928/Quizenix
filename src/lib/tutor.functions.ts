import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const system = `You are Quizenix, an AI Study Coach focused on CONCEPTUAL MASTERY. ${modeInstruction[data.mode]} Be concise, accurate, and teach — never dump text. Use markdown-lite (bold, short bullets) sparingly.`;

    const prompt = data.context
      ? `Student's study notes:\n"""\n${data.context.slice(0, 40000)}\n"""\n\nStudent's question:\n${data.question}`
      : data.question;

    const result = await generateText({ model, system, prompt });
    return { answer: result.text.trim() };
  });
