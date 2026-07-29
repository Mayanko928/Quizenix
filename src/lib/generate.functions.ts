import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({ notes: z.string().min(1).max(200000) });

export type Flashcard = {
  id: number;
  question: string;
  answer: string;
  explanation?: string;
  hint?: string;
  memoryTrick?: string;
  example?: string;
  commonMistake?: string;
  difficulty?: "easy" | "medium" | "hard";
  relatedConcepts?: string[];
};

export type QuizItem = {
  id: number;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  misconception?: string;
};

export type Concept = {
  name: string;
  summary: string;
  related?: string[];
  importance?: 1 | 2 | 3 | 4 | 5;
  importanceReason?: string;
  difficulty?: "easy" | "medium" | "hard" | "expert" | "research";
  studyMinutes?: number;
  prerequisites?: string[];
  whyItMatters?: string;
};

export type HierarchyNode = {
  name: string;
  kind?: "chapter" | "topic" | "subtopic" | "concept";
  children?: HierarchyNode[];
};

export type KnowledgeGraph = {
  nodes: { id: string; label: string; importance?: 1 | 2 | 3 | 4 | 5 }[];
  edges: { from: string; to: string; relation?: string }[];
};

export type Analysis = {
  overview?: string;
  totalStudyMinutes?: number;
  overallDifficulty?: "easy" | "medium" | "hard" | "expert" | "research";
  learningObjectives?: string[];
  hierarchy?: HierarchyNode;
  knowledgeGraph?: KnowledgeGraph;
};

export type StudyMaterial = {
  title?: string;
  summary?: string;
  cheatSheet?: string[];
  formulaSheet?: string[];
  mindMap?: { root: string; branches: { name: string; children?: string[] }[] };
  concepts?: Concept[];
  analysis?: Analysis;
  flashcards: Flashcard[];
  quiz: QuizItem[];
  examQuestions?: { marks: 2 | 5 | 10 | 15; question: string; answer: string }[];
  interviewQuestions?: { level: "beginner" | "intermediate" | "expert"; question: string; answer: string }[];
};

const SYSTEM = `You are Quizenix — an expert AI Study Coach. Your goal is CONCEPTUAL MASTERY, not memorization. Understand, analyze, connect, teach, explain, challenge and encourage critical thinking. NEVER copy the source text verbatim; always rephrase and teach. Output STRICT JSON only — no markdown, no commentary, no code fences.`;

const JSON_SCHEMA = `{
  "title": "string",
  "summary": "one-paragraph conceptual overview",
  "cheatSheet": ["short bullet", "..."],
  "formulaSheet": ["formula or key rule", "..."],
  "mindMap": { "root": "string", "branches": [{ "name": "string", "children": ["string"] }] },
  "concepts": [{ "name": "string", "summary": "string", "related": ["string"] }],
  "flashcards": [{
    "id": 1, "question": "string", "answer": "string",
    "explanation": "string", "hint": "string", "memoryTrick": "string",
    "example": "real-world example", "commonMistake": "string",
    "difficulty": "easy", "relatedConcepts": ["string"]
  }],
  "quiz": [{
    "id": 1, "difficulty": "easy", "question": "string",
    "options": ["string","string","string","string"],
    "correctAnswerIndex": 0, "explanation": "string",
    "misconception": "why a student might pick the wrong option"
  }],
  "examQuestions": [{ "marks": 5, "question": "string", "answer": "string" }],
  "interviewQuestions": [{ "level": "beginner", "question": "string", "answer": "string" }]
}`;

function computeCounts(notes: string) {
  const chars = notes.length;
  const flashcards = Math.max(6, Math.min(60, Math.round(chars / 300)));
  const quizTarget = Math.max(3, Math.min(25, Math.round(chars / 700)));
  const easy = Math.max(1, Math.round(quizTarget * 0.4));
  const hard = Math.max(1, Math.round(quizTarget * 0.2));
  const medium = Math.max(1, quizTarget - easy - hard);
  const concepts = Math.max(3, Math.min(12, Math.round(chars / 800)));
  return { flashcards, quiz: easy + medium + hard, easy, medium, hard, concepts };
}

function buildUserPrompt(notes: string) {
  const { flashcards, quiz, easy, medium, hard, concepts } = computeCounts(notes);
  return `Analyze the notes below like a great tutor and produce a complete study kit.

NOTES:
"""
${notes}
"""

Requirements:
1. Build a CONCEPT MAP first: identify ${concepts} core concepts. For each, give a short "summary" (1-2 sentences, in your own words) and up to 4 "related" concepts. Include as "concepts".
2. Write a 3-5 sentence "summary" that teaches the big picture (not a copy of the notes).
3. Produce a "cheatSheet" (6-12 crisp bullets) and, if the material has formulas/rules, a "formulaSheet"; otherwise return an empty array.
4. Produce a "mindMap" with a single "root" topic and 3-7 "branches", each with up to 5 "children".
5. Generate exactly ${flashcards} flashcards. Each has: clear "question", concise "answer" (1-3 sentences), teaching "explanation" (why it matters), a helpful "hint", a "memoryTrick" (mnemonic/analogy), a "example" (real-world), a "commonMistake" learners make, "difficulty" (easy|medium|hard) and up to 3 "relatedConcepts". Cover every major concept; order foundational → advanced.
6. Generate exactly ${quiz} MCQs distributed as ${easy} easy (recall), ${medium} medium (connect two ideas), ${hard} hard (apply/infer). Exactly 4 plausible options, one correct, one-sentence "explanation" and a "misconception" describing why a student might pick a wrong option.
7. Generate 4 "examQuestions" spread across marks 2, 5, 10, 15 with model answers scaled to the marks.
8. Generate 4 "interviewQuestions": one beginner, two intermediate, one expert — with strong model answers.
9. Base everything on the notes; do not invent facts unrelated to them, but DO teach, connect and add analogies/examples.
10. Return ONLY one JSON object matching this schema, no extra text:
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
