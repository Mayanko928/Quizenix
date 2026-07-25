import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({ notes: z.string().min(1).max(200000) });

export type StudyMaterial = {
  flashcards: { id: number; question: string; answer: string }[];
  quiz: {
    id: number;
    difficulty: "easy" | "medium" | "hard";
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }[];
};

const SYSTEM = `You are an expert educational content creator. You generate study materials strictly in the JSON format specified. Never include explanations, markdown formatting, or text outside the JSON object. Only output valid JSON.`;

const JSON_SCHEMA = `{
  "flashcards": [
    { "id": 1, "question": "string", "answer": "string" }
  ],
  "quiz": [
    {
      "id": 1,
      "difficulty": "easy",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswerIndex": 0,
      "explanation": "string"
    }
  ]
}`;

function buildUserPrompt(notes: string) {
  return `Generate study material from the following notes.

NOTES:
"""
${notes}
"""

Requirements:
1. Generate exactly 10 flashcards. Each flashcard has a clear, specific "question" and a concise, accurate "answer" (1-3 sentences). Cover the most important concepts in the notes, avoid duplication, and order them from foundational to advanced.
2. Generate exactly 5 multiple-choice quiz questions based on the same notes, distributed across difficulty levels:
   - 2 "easy" questions (direct recall of facts stated in the notes)
   - 2 "medium" questions (require connecting two ideas from the notes)
   - 1 "hard" question (requires applying or inferring beyond what's explicitly stated)

   Each quiz question must have exactly 4 options, exactly one of which is correct. Options must be plausible and similar in length/style (no obviously wrong "joke" answers). Include a one-sentence explanation for why the correct answer is right.
3. Base everything strictly on the provided notes. Do not introduce facts that aren't in the notes or reasonably inferable from them.
4. Return ONLY a single JSON object matching this exact schema, with no additional commentary:
${JSON_SCHEMA}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

export const generateStudyMaterial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<StudyMaterial> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash-lite");

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserPrompt(data.notes) },
      ],
      providerOptions: {
        lovable: { response_format: { type: "json_object" } },
      },
    });

    const parsed = extractJson(result.text) as StudyMaterial;
    if (!parsed?.flashcards?.length || !parsed?.quiz?.length) {
      throw new Error("Invalid study material returned");
    }
    return parsed;
  });
