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

export const LENS_INSTRUCTION: Record<ExplainLens, string> = {
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

export const LENS_LABEL: Record<ExplainLens, string> = {
  simpler: "Simpler",
  detailed: "Detailed",
  analogy: "Analogy",
  visual: "Visual",
  code: "Code",
  math: "Math",
  practical: "Practical",
  animation: "Animation",
  history: "History",
};
