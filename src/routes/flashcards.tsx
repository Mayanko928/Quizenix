import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { dummyFlashcards } from "../lib/dummy-data";
import {
  getFavorites,
  loadStudyMaterial,
  toggleFavorite,
} from "../lib/study-store";
import type { Flashcard } from "../lib/generate.functions";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Quizenix" },
      {
        name: "description",
        content:
          "AI-generated flashcards with hints, analogies, real-world examples and common mistakes.",
      },
      { property: "og:title", content: "Flashcards — Quizenix" },
      {
        property: "og:description",
        content:
          "AI-generated flashcards with hints, analogies, real-world examples and common mistakes.",
      },
    ],
  }),
  component: FlashcardsPage,
});

function toRichCard(f: { front: string; back: string }, i: number): Flashcard {
  return { id: i + 1, question: f.front, answer: f.back };
}

function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>(() =>
    dummyFlashcards.map(toRichCard),
  );
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [favs, setFavs] = useState<number[]>([]);

  useEffect(() => {
    const m = loadStudyMaterial();
    if (m?.flashcards?.length) setCards(m.flashcards);
    setFavs(getFavorites());
  }, []);

  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;
  const isFav = useMemo(() => favs.includes(card?.id ?? -1), [favs, card]);

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setShowHint(false);
    setShowExtras(false);
    setTimeout(() => {
      setIdx((i) => Math.min(cards.length - 1, Math.max(0, i + dir)));
    }, 120);
  };

  const diffColor =
    card?.difficulty === "hard"
      ? "text-destructive"
      : card?.difficulty === "medium"
        ? "text-primary"
        : "text-success";

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-4">
            {card?.difficulty && (
              <span className={`text-xs uppercase tracking-widest ${diffColor}`}>
                {card.difficulty}
              </span>
            )}
            <span className="text-sm tabular-nums text-muted-foreground">
              Card{" "}
              <span className="font-medium text-foreground">{idx + 1}</span> of{" "}
              {cards.length}
            </span>
          </div>
        </header>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="group relative h-[420px] w-full max-w-md [perspective:1200px]"
            aria-label="Flip card"
          >
            <div className={`card-flip relative h-full w-full ${flipped ? "flipped" : ""}`}>
              <div className="card-face absolute inset-0 flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-primary">
                    Question
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavs(toggleFavorite(card.id));
                    }}
                    role="button"
                    className={`grid h-8 w-8 place-items-center rounded-lg border border-border transition hover:border-primary/50 ${isFav ? "text-primary" : "text-muted-foreground"}`}
                    aria-label="Favorite"
                  >
                    <Star className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
                  </span>
                </div>
                <p className="text-center text-2xl font-medium leading-snug">
                  {card.question}
                </p>
                <span className="text-center text-xs text-muted-foreground">
                  Tap to reveal answer
                </span>
              </div>
              <div className="card-face card-back absolute inset-0 flex flex-col justify-between overflow-auto rounded-3xl border border-primary/40 bg-card p-7 shadow-[var(--shadow-glow)]">
                <span className="text-xs uppercase tracking-widest text-primary">
                  Answer
                </span>
                <div className="space-y-3">
                  <p className="text-center text-lg leading-relaxed text-foreground/90">
                    {card.answer}
                  </p>
                  {card.explanation && (
                    <p className="text-center text-sm text-muted-foreground">
                      {card.explanation}
                    </p>
                  )}
                </div>
                <span className="text-center text-xs text-muted-foreground">
                  Tap to flip back
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {card?.hint && (
            <button
              onClick={() => setShowHint((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
              {showHint ? "Hide hint" : "Hint"}
            </button>
          )}
          {(card?.example || card?.memoryTrick || card?.commonMistake) && (
            <button
              onClick={() => setShowExtras((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {showExtras ? "Hide teaching pack" : "Analogy · Example · Pitfall"}
            </button>
          )}
          <Link
            to="/tutor"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            <Target className="h-3.5 w-3.5 text-primary" />
            Ask AI Tutor
          </Link>
        </div>

        {showHint && card?.hint && (
          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground/90">
            <span className="font-semibold text-primary">Hint · </span>
            {card.hint}
          </div>
        )}
        {showExtras && (
          <div className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
            {card?.memoryTrick && (
              <p>
                <span className="font-semibold text-primary">Memory trick · </span>
                {card.memoryTrick}
              </p>
            )}
            {card?.example && (
              <p>
                <span className="font-semibold text-primary">Real world · </span>
                {card.example}
              </p>
            )}
            {card?.commonMistake && (
              <p>
                <span className="font-semibold text-destructive">Common mistake · </span>
                {card.commonMistake}
              </p>
            )}
            {card?.relatedConcepts?.length ? (
              <p className="text-muted-foreground">
                Related: {card.relatedConcepts.join(" · ")}
              </p>
            ) : null}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3">
          <button
            onClick={() => go(-1)}
            disabled={idx === 0}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm transition hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={() => {
              setIdx(0);
              setFlipped(false);
              setShowHint(false);
              setShowExtras(false);
            }}
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
