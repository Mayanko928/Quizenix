import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrainCircuit, ArrowRight, Zap, AlertCircle, Eye } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateStudyMaterial } from "../lib/generate.functions";
import { saveStudyMaterial, clearStudyMaterial } from "../lib/study-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlashGenius — Turn your Notes into Flashcards & Quizzes" },
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
      if (/429/.test(msg)) setError("Rate limited — please wait a moment and try again.");
      else if (/402/.test(msg)) setError("AI credits exhausted. Please add credits to your workspace.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="dark min-h-screen w-full bg-background text-foreground selection:bg-primary/30"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FlashGenius
          </span>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Link
            to="/flashcards"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            Flashcards
          </Link>
          <Link
            to="/quiz"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            Quiz
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-7xl items-center px-6 pb-20 pt-6 md:px-12 lg:min-h-[calc(100vh-88px)] lg:px-20 lg:py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left */}
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
                New · Quiz Generation Engine
              </div>
              <h1
                className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl xl:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Turn your Notes into{" "}
                <span className="text-primary">Flashcards</span> & Quizzes.
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground md:text-xl">
                Transform messy lecture notes, PDFs, or articles into structured
                study material in seconds using advanced AI.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste your study notes here…"
                  disabled={loading}
                  className="h-48 w-full resize-none rounded-2xl border border-border bg-card p-5 text-[15px] leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] text-muted-foreground/70">
                  {notes.length.toLocaleString()} chars
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <Zap className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
                  {loading ? "Generating…" : "Generate Study Kit"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => {
                    clearStudyMaterial();
                    navigate({ to: "/flashcards" });
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                  Try a sample
                </button>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right — Product preview */}
          <div className="relative hidden h-[520px] items-center justify-center lg:flex">
            <div className="absolute h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
            <div className="relative w-full max-w-md">
              {/* Back card */}
              <div className="absolute inset-0 -translate-y-2 rotate-[-6deg] rounded-3xl border border-border bg-card opacity-40" />
              <div className="absolute inset-0 translate-y-2 rotate-[3deg] rounded-3xl border border-border bg-card opacity-60" />

              {/* Main card */}
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-destructive/30" />
                    <div className="h-3 w-3 rounded-full bg-primary/30" />
                    <div className="h-3 w-3 rounded-full bg-success/30" />
                  </div>
                  <div className="font-mono text-xs tracking-widest text-primary">
                    CARD 04 / 12
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <span
                      className="inline-block rounded-md bg-border/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Biological Psychology
                    </span>
                    <h3
                      className="text-2xl font-semibold leading-snug"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      What is the primary function of the Myelin Sheath in neurons?
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <div className="rounded-lg bg-border/50 p-2">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm italic text-muted-foreground">
                      Reveal answer…
                    </span>
                  </div>
                </div>

                <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -right-6 top-[22%] flex rotate-[10deg] items-center gap-3 rounded-2xl border-2 border-background bg-primary p-4 text-primary-foreground shadow-[var(--shadow-glow)]">
                <div className="rounded-lg bg-white/20 p-2">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="pr-2">
                  <div className="text-[10px] font-bold uppercase opacity-80">
                    AI Analysis
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    High Accuracy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature chips */}
      <section className="mx-auto grid max-w-7xl gap-3 px-6 pb-20 sm:grid-cols-3 md:px-12 lg:px-20">
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
        <FeatureCard
          title="Instant AI"
          desc="Notes in, structured study kit out — in seconds."
          to="/flashcards"
          navigate={navigate}
        />
      </section>
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
      className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-card/70"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}
