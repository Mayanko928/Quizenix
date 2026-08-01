import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  Trophy,
  Target,
  BookOpen,
  ArrowRight,
  Plus,
  LogOut,
  BrainCircuit,
  Trash2,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Circle,
  Lightbulb,
  GraduationCap,
  Clock,
  Layers,
} from "lucide-react";
import { getDashboard, getStudySet, deleteStudySet } from "@/lib/study.functions";
import { getProgress } from "@/lib/progress.functions";
import { saveStudyMaterial, saveNotes } from "@/lib/study-store";
import { levelProgress, levelTitle, masteryProgress, masteryTone } from "@/lib/progress";
import { getReviews } from "@/lib/srs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Daily Dashboard — Quizenix" },
      {
        name: "description",
        content:
          "Your daily study mission, topic mastery, confidence meter, learning insights and exam readiness — all in one place.",
      },
      { property: "og:title", content: "Daily Dashboard — Quizenix" },
      {
        property: "og:description",
        content: "Track mastery, confidence and exam readiness across every topic you study.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dashFn = useServerFn(getDashboard);
  const progFn = useServerFn(getProgress);
  const openFn = useServerFn(getStudySet);
  const delFn = useServerFn(deleteStudySet);

  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const { data: prog } = useQuery({ queryKey: ["progress"], queryFn: () => progFn() });

  const [dueCards, setDueCards] = useState(0);
  useEffect(() => {
    const reviews = Object.values(getReviews());
    setDueCards(reviews.filter((r) => r.nextReviewAt <= Date.now()).length);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const openSet = async (id: string, target: "flashcards" | "quiz" | "revision") => {
    const row = await openFn({ data: { id } });
    saveStudyMaterial(row.material as any);
    saveNotes(row.notes);
    navigate({ to: `/${target}` });
  };

  const remove = async (id: string) => {
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["progress"] });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const lvl = useMemo(
    () => levelProgress(data?.stats.total_xp ?? 0, data?.stats.level ?? 1),
    [data?.stats.total_xp, data?.stats.level],
  );

  const mission = prog?.mission;
  const missionItems = mission
    ? [
        { label: `Answer ${mission.questionsTarget} quiz questions`, done: mission.questionsToday >= mission.questionsTarget, progress: `${mission.questionsToday}/${mission.questionsTarget}` },
        { label: `Review ${mission.flashcardsTarget} flashcards`, done: dueCards === 0, progress: `${dueCards} due` },
        { label: "Revise your weak topic of the day", done: false, progress: mission.weakTopicOfTheDay ?? "—" },
        { label: "Study for 30 focused minutes", done: mission.questionsToday >= 15, progress: `${Math.min(30, mission.questionsToday * 2)}/30 min` },
      ]
    : [];
  const missionDone = missionItems.filter((m) => m.done).length;

  return (
    <main className="dark min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span style={{ fontFamily: "var(--font-display)" }} className="text-lg font-semibold">
            Quizenix
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New study set
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold md:text-4xl">
          Today’s plan
        </h1>
        <p className="mt-1 text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · one focused
          session at a time.
        </p>

        {isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            {/* Daily mission */}
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
                    <Target className="h-4 w-4" /> Daily mission
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {missionDone}/{missionItems.length || 4} complete
                  </span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {missionItems.map((m) => (
                    <li key={m.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        {m.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={m.done ? "text-muted-foreground line-through" : ""}>{m.label}</span>
                      </span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">{m.progress}</span>
                    </li>
                  ))}
                  {!mission && <li className="text-sm text-muted-foreground">Generate a study set to unlock today’s mission.</li>}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    to="/flashcards"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
                  >
                    Start reviewing <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/quiz"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm hover:border-primary/50"
                  >
                    Take a quiz
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <GraduationCap className="h-4 w-4 text-primary" /> Exam readiness
                </div>
                <div style={{ fontFamily: "var(--font-display)" }} className="mt-3 text-4xl font-bold">
                  {prog?.readiness ?? 0}%
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all"
                    style={{ width: `${prog?.readiness ?? 0}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {(prog?.readiness ?? 0) >= 80
                    ? "You’re in strong shape — keep revising weak spots."
                    : (prog?.readiness ?? 0) >= 50
                      ? "Solid base. More practice on weak topics will lift this fast."
                      : "Early days — build coverage with quizzes and flashcards."}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<Trophy className="h-5 w-5" />}
                label="Level"
                value={`${data.stats.level} · ${levelTitle(data.stats.level)}`}
                sub={`${data.stats.total_xp} XP · ${lvl.next - data.stats.total_xp} to next`}
                bar={lvl.pct}
              />
              <Stat
                icon={<Flame className="h-5 w-5" />}
                label="Current streak"
                value={`${data.stats.current_streak}d`}
                sub={`Best ${data.stats.longest_streak}d`}
              />
              <Stat
                icon={<Target className="h-5 w-5" />}
                label="Accuracy"
                value={`${data.accuracy}%`}
                sub={`${data.totalAttempts} answers`}
              />
              <Stat
                icon={<Layers className="h-5 w-5" />}
                label="Cards due"
                value={dueCards}
                sub={`${prog?.topics.length ?? 0} topics tracked`}
              />
            </div>

            {/* Progress + insights */}
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                    Subject progress
                  </h2>
                  {!prog?.subjects.length ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
                      Complete a quiz and your subjects, chapters and topics will break down here.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {prog.subjects.map((s) => (
                        <SubjectRow key={s.id} subject={s} />
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                    Recent study sets
                  </h2>
                  {data.sets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                      <Sparkles className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">No study sets yet.</p>
                      <Link
                        to="/"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
                      >
                        <Plus className="h-4 w-4" /> Create your first
                      </Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {data.sets.map((s) => (
                        <li
                          key={s.id}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{s.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => openSet(s.id, "flashcards")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:border-primary/50 hover:text-primary"
                            >
                              Flashcards
                            </button>
                            <button
                              onClick={() => openSet(s.id, "quiz")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:border-primary/50 hover:text-primary"
                            >
                              Quiz
                            </button>
                            <button
                              onClick={() => openSet(s.id, "revision")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:border-primary/50 hover:text-primary"
                            >
                              Revision
                            </button>
                            <button
                              onClick={() => remove(s.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                    AI insights
                  </h2>
                  {!prog?.insights.length ? (
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                      Answer a few more questions and personalised observations will appear here.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {prog.insights.map((i) => (
                        <li key={i} className="flex gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                          <span className="text-muted-foreground">{i}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                    Weak concepts
                  </h2>
                  {!prog?.weakTopics.length ? (
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                      Nothing flagged yet — nice.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {prog.weakTopics.map((w) => (
                        <li key={w.topic} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{w.topic}</span>
                            <span className="text-xs text-muted-foreground">
                              {w.accuracy}% · {w.attempts}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                            <div
                              className={`h-full rounded-full ${w.accuracy < 50 ? "bg-destructive" : "bg-amber-400"}`}
                              style={{ width: `${w.accuracy}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {w.daysSinceReview === 0 ? "Reviewed today" : `Last reviewed ${w.daysSinceReview}d ago`} ·
                            next in {w.nextReviewInDays}d
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {!!prog?.strongTopics.length && (
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                      Strong concepts
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {prog.strongTopics.map((t) => (
                        <span
                          key={t.topic}
                          className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400"
                        >
                          {t.topic} · {t.accuracy}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  to="/tutor"
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-sm transition hover:border-primary/50"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Ask the AI Tutor
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SubjectRow({
  subject,
}: {
  subject: {
    id: string;
    title: string;
    attempts: number;
    accuracy: number;
    completion: number;
    topics: {
      topic: string;
      accuracy: number;
      attempts: number;
      mastery: string;
      confidence: number;
      confidenceLabel: string;
      difficulty: string;
      daysSinceReview: number | null;
      nextReviewInDays: number;
      needsRevision: boolean;
    }[];
  };
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <BookOpen className="h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold">{subject.title}</span>
            <span className="flex-shrink-0 text-sm font-semibold text-primary">{subject.completion}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
            <div className="h-full rounded-full bg-primary" style={{ width: `${subject.completion}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {subject.topics.length} topics · {subject.accuracy}% accuracy · {subject.attempts} answers
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-4">
          {subject.topics.length === 0 && (
            <p className="text-xs text-muted-foreground">No quiz data for this set yet.</p>
          )}
          {subject.topics.map((t) => (
            <div key={t.topic} className="rounded-lg border border-border/70 bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm capitalize">{t.topic}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${masteryTone(t.mastery as any)}`}>
                  {t.mastery}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${masteryProgress(t.mastery as any)}%` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-3">
                <span>Accuracy {t.accuracy}%</span>
                <span>Confidence {t.confidenceLabel}</span>
                <span className="capitalize">Difficulty {t.difficulty}</span>
                <span>
                  Last reviewed {t.daysSinceReview === 0 ? "today" : `${t.daysSinceReview}d ago`}
                </span>
                <span>Next review in {t.nextReviewInDays}d</span>
                <span className={t.needsRevision ? "text-amber-400" : "text-emerald-400"}>
                  {t.needsRevision ? "Revision needed" : "On track"}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                  style={{ width: `${t.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  bar?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)" }} className="mt-3 truncate text-2xl font-bold">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-primary" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
