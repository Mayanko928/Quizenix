export type Rating = "forgot" | "very-hard" | "hard" | "medium" | "easy" | "very-easy";

export const RATINGS: { key: Rating; label: string; tone: string }[] = [
  { key: "forgot", label: "Forgot", tone: "destructive" },
  { key: "very-hard", label: "Very hard", tone: "destructive" },
  { key: "hard", label: "Hard", tone: "primary" },
  { key: "medium", label: "Medium", tone: "primary" },
  { key: "easy", label: "Easy", tone: "success" },
  { key: "very-easy", label: "Very easy", tone: "success" },
];

/** Fixed spaced-repetition ladder in days. */
const LADDER = [1, 3, 7, 15, 30, 90];

const STEP: Record<Rating, number> = {
  forgot: -99,
  "very-hard": -2,
  hard: -1,
  medium: 1,
  easy: 1,
  "very-easy": 2,
};

export type CardReview = {
  step: number;
  nextReviewAt: number;
  lastRating: Rating;
  reps: number;
};

const REVIEW_KEY = "quizenix:reviews";
const NOTES_KEY = "quizenix:cardnotes";
const TAGS_KEY = "quizenix:cardtags";
const BOOKMARK_KEY = "quizenix:bookmarks";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getReviews(): Record<string, CardReview> {
  return read<Record<string, CardReview>>(REVIEW_KEY, {});
}

export function rateCard(cardId: number, rating: Rating): CardReview {
  const all = getReviews();
  const prev = all[String(cardId)];
  const prevStep = prev?.step ?? 0;
  const raw = rating === "forgot" ? 0 : prevStep + STEP[rating];
  const step = Math.max(0, Math.min(LADDER.length - 1, raw));
  const next: CardReview = {
    step,
    nextReviewAt: Date.now() + LADDER[step] * 86400000,
    lastRating: rating,
    reps: (prev?.reps ?? 0) + 1,
  };
  all[String(cardId)] = next;
  write(REVIEW_KEY, all);
  return next;
}

export function intervalLabel(step: number) {
  const d = LADDER[Math.max(0, Math.min(LADDER.length - 1, step))];
  return d === 1 ? "tomorrow" : d < 30 ? `in ${d} days` : d === 30 ? "in 1 month" : "in 3 months";
}

export function getNote(cardId: number): string {
  return read<Record<string, string>>(NOTES_KEY, {})[String(cardId)] ?? "";
}

export function setNote(cardId: number, note: string) {
  const all = read<Record<string, string>>(NOTES_KEY, {});
  if (note.trim()) all[String(cardId)] = note;
  else delete all[String(cardId)];
  write(NOTES_KEY, all);
}

export function getTags(cardId: number): string[] {
  return read<Record<string, string[]>>(TAGS_KEY, {})[String(cardId)] ?? [];
}

export function setTags(cardId: number, tags: string[]) {
  const all = read<Record<string, string[]>>(TAGS_KEY, {});
  if (tags.length) all[String(cardId)] = tags;
  else delete all[String(cardId)];
  write(TAGS_KEY, all);
  return tags;
}

export function getBookmarks(): number[] {
  return read<number[]>(BOOKMARK_KEY, []);
}

export function toggleBookmark(cardId: number): number[] {
  const cur = getBookmarks();
  const next = cur.includes(cardId) ? cur.filter((x) => x !== cardId) : [...cur, cardId];
  write(BOOKMARK_KEY, next);
  return next;
}
