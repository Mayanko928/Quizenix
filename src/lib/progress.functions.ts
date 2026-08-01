import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildInsights,
  examReadiness,
  subjectProgress,
  todayMission,
  topicProgress,
  type AttemptRow,
} from "./progress-compute";

export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [stats, sets, attempts] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("study_sets").select("id, title, created_at").order("created_at", { ascending: false }).limit(12),
      supabase
        .from("quiz_attempts")
        .select("correct, difficulty, topic, created_at, study_set_id")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const rows = (attempts.data ?? []) as AttemptRow[];
    const setRows = sets.data ?? [];
    const topics = topicProgress(rows);

    return {
      stats: stats.data ?? {
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null as string | null,
      },
      totalAttempts: rows.length,
      accuracy: rows.length ? Math.round((rows.filter((r) => r.correct).length / rows.length) * 100) : 0,
      topics,
      weakTopics: topics.filter((t) => t.accuracy < 70).slice(0, 5),
      strongTopics: [...topics].reverse().filter((t) => t.accuracy >= 80).slice(0, 5),
      subjects: subjectProgress(setRows, rows),
      readiness: examReadiness(topics),
      insights: buildInsights(rows, topics),
      mission: todayMission(rows, topics),
    };
  });
