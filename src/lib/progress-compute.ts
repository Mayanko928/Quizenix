import { confidenceLabel, confidenceScore, masteryFor, type MasteryLevel } from "./progress";

export type AttemptRow = {
  correct: boolean;
  difficulty: string | null;
  topic: string | null;
  created_at: string;
  study_set_id: string | null;
};

export type SetRow = { id: string; title: string; created_at: string };

export type TopicProgress = {
  topic: string;
  attempts: number;
  accuracy: number;
  mastery: MasteryLevel;
  confidence: number;
  confidenceLabel: string;
  lastReviewed: string | null;
  daysSinceReview: number | null;
  nextReviewInDays: number;
  needsRevision: boolean;
  difficulty: "easy" | "medium" | "hard";
};

export type SubjectProgress = {
  id: string;
  title: string;
  attempts: number;
  accuracy: number;
  completion: number;
  topics: TopicProgress[];
};

const DAY = 86400000;

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
}

function bucket(rows: AttemptRow[]) {
  const map = new Map<string, AttemptRow[]>();
  for (const r of rows) {
    const key = (r.topic ?? "General").trim() || "General";
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  return map;
}

export function topicProgress(rows: AttemptRow[]): TopicProgress[] {
  return [...bucket(rows).entries()]
    .map(([topic, list]) => {
      const attempts = list.length;
      const accuracy = Math.round((list.filter((r) => r.correct).length / attempts) * 100);
      const last = list
        .map((r) => r.created_at)
        .sort()
        .at(-1)!;
      const d = daysSince(last);
      const conf = confidenceScore({ accuracy, attempts, daysSinceReview: d });
      const mastery = masteryFor(accuracy, attempts);
      const hardShare = list.filter((r) => r.difficulty === "hard").length / attempts;
      return {
        topic,
        attempts,
        accuracy,
        mastery,
        confidence: conf,
        confidenceLabel: confidenceLabel(conf),
        lastReviewed: last,
        daysSinceReview: d,
        nextReviewInDays: Math.max(1, Math.round((accuracy / 100) * 9) + 1),
        needsRevision: accuracy < 70 || d >= 7,
        difficulty: (hardShare > 0.34 ? "hard" : accuracy < 60 ? "hard" : accuracy < 80 ? "medium" : "easy") as
          | "easy"
          | "medium"
          | "hard",
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function subjectProgress(sets: SetRow[], rows: AttemptRow[]): SubjectProgress[] {
  return sets
    .map((s) => {
      const mine = rows.filter((r) => r.study_set_id === s.id);
      const topics = topicProgress(mine);
      const accuracy = mine.length
        ? Math.round((mine.filter((r) => r.correct).length / mine.length) * 100)
        : 0;
      const mastered = topics.filter(
        (t) => t.mastery === "Mastered" || t.mastery === "Expert" || t.mastery === "Almost Mastered",
      ).length;
      const completion = topics.length ? Math.round((mastered / topics.length) * 100) : 0;
      return { id: s.id, title: s.title, attempts: mine.length, accuracy, completion, topics };
    })
    .sort((a, b) => b.attempts - a.attempts);
}

export function examReadiness(topics: TopicProgress[]) {
  if (!topics.length) return 0;
  const avgConf = topics.reduce((s, t) => s + t.confidence, 0) / topics.length;
  const coverage = Math.min(1, topics.reduce((s, t) => s + Math.min(t.attempts, 8), 0) / (topics.length * 8));
  return Math.round(avgConf * 0.7 + coverage * 100 * 0.3);
}

/** Behavioural insights derived from real attempt history. */
export function buildInsights(rows: AttemptRow[], topics: TopicProgress[]): string[] {
  const out: string[] = [];
  if (rows.length < 5) return out;

  const byPart: Record<string, { c: number; t: number }> = {};
  for (const r of rows) {
    const h = new Date(r.created_at).getHours();
    const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "late-night";
    byPart[part] ??= { c: 0, t: 0 };
    byPart[part].t++;
    if (r.correct) byPart[part].c++;
  }
  const parts = Object.entries(byPart)
    .filter(([, v]) => v.t >= 4)
    .map(([k, v]) => ({ k, a: Math.round((v.c / v.t) * 100) }))
    .sort((a, b) => b.a - a.a);
  if (parts.length >= 2 && parts[0].a - parts[parts.length - 1].a >= 10) {
    out.push(
      `You perform better during ${parts[0].k} sessions (${parts[0].a}% vs ${parts[parts.length - 1].a}% in the ${parts[parts.length - 1].k}).`,
    );
  }

  if (topics.length >= 2) {
    const weak = topics[0];
    const strong = topics[topics.length - 1];
    if (strong.accuracy - weak.accuracy >= 15) {
      out.push(`You struggle more with ${weak.topic} (${weak.accuracy}%) than ${strong.topic} (${strong.accuracy}%).`);
    }
  }

  const diff: Record<string, { c: number; t: number }> = {};
  for (const r of rows) {
    const k = r.difficulty ?? "medium";
    diff[k] ??= { c: 0, t: 0 };
    diff[k].t++;
    if (r.correct) diff[k].c++;
  }
  if (diff["hard"]?.t >= 3 && diff["easy"]?.t >= 3) {
    const h = Math.round((diff["hard"].c / diff["hard"].t) * 100);
    const e = Math.round((diff["easy"].c / diff["easy"].t) * 100);
    out.push(`Recall questions sit at ${e}% while applied “hard” questions sit at ${h}% — practise application next.`);
  }

  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const half = Math.floor(sorted.length / 2);
  if (half >= 5) {
    const acc = (list: AttemptRow[]) => Math.round((list.filter((r) => r.correct).length / list.length) * 100);
    const before = acc(sorted.slice(0, half));
    const after = acc(sorted.slice(half));
    if (Math.abs(after - before) >= 8) {
      out.push(
        after > before
          ? `Your accuracy is trending up: ${before}% → ${after}% across your recent sessions.`
          : `Your accuracy has dipped from ${before}% to ${after}% — slow down and revise before adding new material.`,
      );
    }
  }

  const stale = topics.filter((t) => (t.daysSinceReview ?? 0) >= 7);
  if (stale.length) out.push(`${stale.length} topic${stale.length > 1 ? "s haven’t" : " hasn’t"} been revised in over a week.`);

  return out.slice(0, 4);
}

export function todayMission(rows: AttemptRow[], topics: TopicProgress[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todays = rows.filter((r) => r.created_at.slice(0, 10) === today);
  const questionsToday = todays.length;
  const weak = topics.filter((t) => t.needsRevision).slice(0, 3);
  return {
    questionsToday,
    quizzesTarget: 2,
    questionsTarget: 20,
    flashcardsTarget: 20,
    minutesTarget: 30,
    accuracyToday: questionsToday
      ? Math.round((todays.filter((r) => r.correct).length / questionsToday) * 100)
      : 0,
    weakTopicOfTheDay: weak[0]?.topic ?? null,
    recommended: weak.map((t) => t.topic),
  };
}
