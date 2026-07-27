import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveStudySet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        notes: z.string().min(1).max(200000),
        material: z.record(z.string(), z.any()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("study_sets")
      .insert({
        user_id: userId,
        title: data.title,
        notes: data.notes,
        material: data.material,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("xp_events").insert({ user_id: userId, amount: 25, reason: "study_set_created" });
    await bumpStreakAndXp(supabase, userId, 25);
    return { id: row.id as string };
  });

export const listStudySets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("study_sets")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const getStudySet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("study_sets")
      .select("id, title, notes, material")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const deleteStudySet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("study_sets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordQuizAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        studySetId: z.string().uuid().nullable().optional(),
        attempts: z
          .array(
            z.object({
              questionId: z.number().int(),
              difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
              correct: z.boolean(),
              topic: z.string().optional(),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.attempts.map((a) => ({
      user_id: userId,
      study_set_id: data.studySetId ?? null,
      question_id: a.questionId,
      difficulty: a.difficulty,
      topic: a.topic ?? null,
      correct: a.correct,
    }));
    const { error } = await supabase.from("quiz_attempts").insert(rows);
    if (error) throw new Error(error.message);
    const correctCount = data.attempts.filter((a) => a.correct).length;
    const xp = correctCount * 10 + 5;
    await supabase.from("xp_events").insert({ user_id: userId, amount: xp, reason: "quiz_completed" });
    await bumpStreakAndXp(supabase, userId, xp);
    return { xpAwarded: xp, correct: correctCount, total: data.attempts.length };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [stats, sets, attempts] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("study_sets")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("quiz_attempts")
        .select("correct, difficulty, topic, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const arr = attempts.data ?? [];
    const total = arr.length;
    const correct = arr.filter((a) => a.correct).length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const weakTopics = Object.entries(
      arr.reduce<Record<string, { c: number; t: number }>>((acc, a) => {
        const k = (a.topic ?? a.difficulty ?? "general") as string;
        acc[k] ??= { c: 0, t: 0 };
        acc[k].t++;
        if (a.correct) acc[k].c++;
        return acc;
      }, {}),
    )
      .map(([topic, v]) => ({ topic, accuracy: Math.round((v.c / v.t) * 100), attempts: v.t }))
      .filter((x) => x.attempts >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
    return {
      stats: stats.data ?? { total_xp: 0, level: 1, current_streak: 0, longest_streak: 0 },
      sets: sets.data ?? [],
      accuracy,
      totalAttempts: total,
      weakTopics,
    };
  });

async function bumpStreakAndXp(supabase: any, userId: string, xp: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: cur } = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
  const totalXp = (cur?.total_xp ?? 0) + xp;
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)) + 1);
  let current = cur?.current_streak ?? 0;
  const last = cur?.last_active_date as string | null;
  if (last === today) {
    // no change to streak
  } else if (last && daysBetween(last, today) === 1) {
    current += 1;
  } else {
    current = 1;
  }
  const longest = Math.max(cur?.longest_streak ?? 0, current);
  await supabase.from("user_stats").upsert({
    user_id: userId,
    total_xp: totalXp,
    level,
    current_streak: current,
    longest_streak: longest,
    last_active_date: today,
  });
}

function daysBetween(a: string, b: string) {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86400000);
}
