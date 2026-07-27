import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
} from "lucide-react";
import { getDashboard, getStudySet, deleteStudySet } from "@/lib/study.functions";
import { saveStudyMaterial, saveNotes } from "@/lib/study-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Quizenix" },
      { name: "description", content: "Your Quizenix dashboard: XP, streak, accuracy and saved study sets." },
      { property: "og:title", content: "Dashboard — Quizenix" },
      { property: "og:description", content: "Track your XP, streak and progress across every study set." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dashFn = useServerFn(getDashboard);
  const openFn = useServerFn(getStudySet);
  const delFn = useServerFn(deleteStudySet);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashFn(),
  });

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
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

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

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold md:text-4xl">
          Your dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">Track your progress and pick up where you left off.</p>

        {isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<Trophy className="h-5 w-5" />} label="Total XP" value={data.stats.total_xp} sub={`Level ${data.stats.level}`} />
              <Stat icon={<Flame className="h-5 w-5" />} label="Current streak" value={`${data.stats.current_streak}d`} sub={`Best ${data.stats.longest_streak}d`} />
              <Stat icon={<Target className="h-5 w-5" />} label="Accuracy" value={`${data.accuracy}%`} sub={`${data.totalAttempts} answers`} />
              <Stat icon={<BookOpen className="h-5 w-5" />} label="Study sets" value={data.sets.length} sub="Saved" />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
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

              <div>
                <h2 style={{ fontFamily: "var(--font-display)" }} className="mb-3 text-lg font-semibold">
                  Weak spots
                </h2>
                {data.weakTopics.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                    Answer a few quiz questions and we'll surface topics to focus on here.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {data.weakTopics.map((w) => (
                      <li key={w.topic} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{w.topic}</span>
                          <span className="text-xs text-muted-foreground">
                            {w.accuracy}% · {w.attempts}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                          <div
                            className={`h-full rounded-full ${w.accuracy < 50 ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${w.accuracy}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/tutor"
                  className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4 text-sm transition hover:border-primary/50"
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

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)" }} className="mt-3 text-3xl font-bold">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
