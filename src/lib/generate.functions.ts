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

function computeCounts(notes: string) {
  const chars = notes.length;
  // Scale with note length: ~1 flashcard per 300 chars, clamped 6..60
  const flashcards = Math.max(6, Math.min(60, Math.round(chars / 300)));
  // ~1 quiz question per 700 chars, clamped 3..25
  const quizTarget = Math.max(3, Math.min(25, Math.round(chars / 700)));
  const easy = Math.max(1, Math.round(quizTarget * 0.4));
  const hard = Math.max(1, Math.round(quizTarget * 0.2));
  const medium = Math.max(1, quizTarget - easy - hard);
  return { flashcards, quiz: easy + medium + hard, easy, medium, hard };
}

function buildUserPrompt(notes: string) {
  const { flashcards, quiz, easy, medium, hard } = computeCounts(notes);
  return `Generate study material from the following notes.

NOTES:
"""
${notes}
"""

Requirements:
1. Generate exactly ${flashcards} flashcards. Each has a clear, specific "question" and a concise, accurate "answer" (1-3 sentences). Cover every major concept, sub-topic, definition, and example in the notes — scale breadth to the material. Avoid duplication and order them from foundational to advanced.
2. Generate exactly ${quiz} multiple-choice quiz questions based on the same notes, distributed across difficulty levels:
   - ${easy} "easy" questions (direct recall of facts stated in the notes)
   - ${medium} "medium" questions (require connecting two ideas from the notes)
   - ${hard} "hard" questions (require applying or inferring beyond what's explicitly stated)

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
      system: SYSTEM,
      prompt: buildUserPrompt(data.notes),
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
