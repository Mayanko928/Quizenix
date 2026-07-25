import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { dummyFlashcards } from "../lib/dummy-data";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — FlashGenius" },
      { name: "description", content: "Flip through AI-generated flashcards to review key concepts." },
      { property: "og:title", content: "Flashcards — FlashGenius" },
      { property: "og:description", content: "Flip through AI-generated flashcards to review key concepts." },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const cards = dummyFlashcards;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setTimeout(() => {
      setIdx((i) => Math.min(cards.length - 1, Math.max(0, i + dir)));
    }, 120);
  };

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-sm tabular-nums text-muted-foreground">
            Card <span className="font-medium text-foreground">{idx + 1}</span> of {cards.length}
          </span>
        </header>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="group relative h-[380px] w-full max-w-md [perspective:1200px]"
            aria-label="Flip card"
          >
            <div
              className={`card-flip relative h-full w-full ${flipped ? "flipped" : ""}`}
            >
              {/* Front */}
              <div className="card-face absolute inset-0 flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
                <span className="text-xs uppercase tracking-widest text-primary">Question</span>
                <p className="text-center text-2xl font-medium leading-snug">
                  {card.front}
                </p>
                <span className="text-center text-xs text-muted-foreground">Tap to flip</span>
              </div>
              {/* Back */}
              <div className="card-face card-back absolute inset-0 flex flex-col justify-between rounded-3xl border border-primary/40 bg-card p-7 shadow-[var(--shadow-glow)]">
                <span className="text-xs uppercase tracking-widest text-primary">Answer</span>
                <p className="text-center text-lg leading-relaxed text-foreground/90">
                  {card.back}
                </p>
                <span className="text-center text-xs text-muted-foreground">Tap to flip back</span>
              </div>
            </div>
          </button>
        </div>

        <footer className="flex items-center justify-between gap-3">
          <button
            onClick={() => go(-1)}
            disabled={idx === 0}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm transition hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={() => { setIdx(0); setFlipped(false); }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted"
            aria-label="Restart"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            disabled={idx === cards.length - 1}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </footer>

        <div className="mt-4 text-center">
          <Link to="/quiz" className="text-sm text-primary hover:underline">
            Ready? Take the quiz →
          </Link>
        </div>
      </div>
    </main>
  );
}
