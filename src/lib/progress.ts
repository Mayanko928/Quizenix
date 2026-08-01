/** Pure helpers for mastery, confidence and progress presentation. */

export const MASTERY_LEVELS = [
  "Not Started",
  "Learning",
  "Practicing",
  "Almost Mastered",
  "Mastered",
  "Expert",
] as const;

export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["Very Low", "Low", "Medium", "High", "Very High"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export function masteryFor(accuracy: number, attempts: number): MasteryLevel {
  if (attempts === 0) return "Not Started";
  if (attempts < 3 || accuracy < 50) return "Learning";
  if (accuracy < 70) return "Practicing";
  if (accuracy < 85) return "Almost Mastered";
  if (accuracy < 95 || attempts < 10) return "Mastered";
  return "Expert";
}

export function masteryProgress(level: MasteryLevel) {
  return Math.round((MASTERY_LEVELS.indexOf(level) / (MASTERY_LEVELS.length - 1)) * 100);
}

/** 0-100 confidence blending accuracy, volume and recency. */
export function confidenceScore(opts: {
  accuracy: number;
  attempts: number;
  daysSinceReview: number | null;
}) {
  const volume = Math.min(1, opts.attempts / 12);
  const recency =
    opts.daysSinceReview === null ? 0.4 : Math.max(0, 1 - opts.daysSinceReview / 21);
  const score = opts.accuracy * 0.65 + volume * 100 * 0.2 + recency * 100 * 0.15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function confidenceLabel(score: number): ConfidenceLevel {
  if (score < 25) return "Very Low";
  if (score < 45) return "Low";
  if (score < 65) return "Medium";
  if (score < 85) return "High";
  return "Very High";
}

export function masteryTone(level: MasteryLevel) {
  switch (level) {
    case "Not Started":
      return "text-muted-foreground border-border";
    case "Learning":
      return "text-destructive border-destructive/40";
    case "Practicing":
      return "text-amber-400 border-amber-400/40";
    case "Almost Mastered":
      return "text-primary border-primary/40";
    default:
      return "text-emerald-400 border-emerald-400/40";
  }
}

export function levelTitle(level: number) {
  const titles = [
    "Explorer",
    "Learner",
    "Scholar",
    "Thinker",
    "Achiever",
    "Strategist",
    "Analyst",
    "Mentor",
    "Master",
    "Luminary",
  ];
  return titles[Math.min(titles.length - 1, Math.max(0, level - 1))];
}

/** XP needed to reach a level, mirroring the server formula level = floor(sqrt(xp/50))+1. */
export function xpForLevel(level: number) {
  return Math.pow(Math.max(0, level - 1), 2) * 50;
}

export function levelProgress(totalXp: number, level: number) {
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = Math.round(((totalXp - start) / Math.max(1, next - start)) * 100);
  return { start, next, pct: Math.max(0, Math.min(100, pct)) };
}
