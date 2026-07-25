import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, BrainCircuit, Zap, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateStudyMaterial } from "../lib/generate.functions";
import { saveStudyMaterial, clearStudyMaterial } from "../lib/study-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlashGenius — Turn notes into flashcards & quizzes" },
      { name: "description", content: "Paste your notes and instantly generate flashcards and quizzes. Study smarter with FlashGenius." },
      { property: "og:title", content: "FlashGenius — Study smarter" },
      { property: "og:description", content: "Paste your notes, get instant flashcards and quizzes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const generate = useServerFn(generateStudyMaterial);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    const trimmed = notes.trim();
    if (!trimmed) {
      // Explore with sample data
      clearStudyMaterial();
      navigate({ to: "/flashcards" });
      return;
    }
    setLoading(true);
    try {
      const material = await generate({ data: { notes: trimmed } });
      saveStudyMaterial(material);
      navigate({ to: "/flashcards" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      // Friendlier common cases
      if (/429/.test(msg)) setError("Rate limited — please wait a moment and try again.");
      else if (/402/.test(msg)) setError("AI credits exhausted. Please add credits to your workspace.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:pt-16">
        <header className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">FlashGenius</span>
        </header>

        <section className="mt-14 sm:mt-20">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-powered study companion
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Turn any notes into
            <span className="gradient-text"> flashcards</span> &
            <span className="gradient-text"> quizzes.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Paste your lecture notes, textbook chapter, or study guide.
            FlashGenius does the rest.
          </p>
        </section>

        <section className="mt-10">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-ring/60">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your notes here…&#10;&#10;e.g. Photosynthesis is the process by which plants…"
              className="min-h-[220px] w-full resize-y bg-transparent px-3 py-2 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
              disabled={loading}
            />
            <div className="mt-2 flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="px-1 text-xs text-muted-foreground">
                {notes.length.toLocaleString()} characters
              </span>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-70"
              >
                <Zap className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
                {loading ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="mt-3 px-1 text-xs text-muted-foreground">
              Tip: leave it empty to explore with sample study material.
            </p>
          )}
        </section>

        <section className="mt-14 grid gap-3 sm:mt-20 sm:grid-cols-2">
          <FeatureCard
            title="Flashcards"
            desc="Flip through smart cards with a satisfying tap."
            to="/flashcards"
            navigate={navigate}
          />
          <FeatureCard
            title="Quiz mode"
            desc="Test yourself with instant feedback and scoring."
            to="/quiz"
            navigate={navigate}
          />
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  desc,
  to,
  navigate,
}: {
  title: string;
  desc: string;
  to: "/flashcards" | "/quiz";
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <button
      onClick={() => navigate({ to })}
      className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium">{title}</span>
        <span className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary">
          →
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}
