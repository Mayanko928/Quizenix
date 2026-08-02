import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  NotebookPen,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Target,
  Wand2,
} from "lucide-react";
import { dummyFlashcards } from "../lib/dummy-data";
import { getFavorites, loadStudyMaterial, toggleFavorite } from "../lib/study-store";
import type { Flashcard, FlashcardType } from "../lib/generate.functions";
import { explainBetter } from "../lib/explain.functions";
import { EXPLAIN_LENSES, LENS_LABEL, type ExplainLens } from "../lib/explain-lenses";
import {
  RATINGS,
  getBookmarks,
  getNote,
  getReviews,
  getTags,
  intervalLabel,
  rateCard,
  setNote,
  setTags,
  toggleBookmark,
  type CardReview,
  type Rating,
} from "../lib/srs";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Quizenix" },
      {
        name: "description",
        content:
          "Premium AI flashcards: 3D flip, teaching packs, Explain Better lessons and spaced repetition.",
      },
      { property: "og:title", content: "Flashcards — Quizenix" },
      {
        property: "og:description",
        content:
          "Premium AI flashcards: 3D flip, teaching packs, Explain Better lessons and spaced repetition.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlashcardsPage,
});

const TYPE_LABEL: Record<FlashcardType, string> = {
  definition: "Definition",
  concept: "Concept",
  formula: "Formula",
  comparison: "Comparison",
  "true-false": "True / False",
  "fill-blank": "Fill in the blank",
  diagram: "Diagram",
  code: "Code",
  application: "Application",
  interview: "Interview",
  "memory-trick": "Memory trick",
  "real-world": "Real world",
  "visual-thinking": "Visual thinking",
  "exam-revision": "Exam revision",
  challenge: "AI challenge",
};

function toRichCard(f: { front: string; back: string }, i: number): Flashcard {
  return { id: i + 1, question: f.front, answer: f.back };
}

function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>(() => dummyFlashcards.map(toRichCard));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [favs, setFavs] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [reviews, setReviews] = useState<Record<string, CardReview>>({});
  const [note, setNoteState] = useState("");
  const [tags, setTagsState] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [lens, setLens] = useState<ExplainLens | null>(null);
  const [lesson, setLesson] = useState<string>("");
  const [loadingLens, setLoadingLens] = useState<ExplainLens | null>(null);
  const [copied, setCopied] = useState(false);
  const touchX = useRef<number | null>(null);
  const explain = useServerFn(explainBetter);

  useEffect(() => {
    const m = loadStudyMaterial();
    if (m?.flashcards?.length) setCards(m.flashcards);
    setFavs(getFavorites());
    setBookmarks(getBookmarks());
    setReviews(getReviews());
  }, []);

  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;
  const isFav = useMemo(() => favs.includes(card?.id ?? -1), [favs, card]);
  const isBookmarked = useMemo(() => bookmarks.includes(card?.id ?? -1), [bookmarks, card]);
  const review = card ? reviews[String(card.id)] : undefined;

  useEffect(() => {
    if (!card) return;
    setNoteState(getNote(card.id));
    setTagsState(getTags(card.id));
  }, [card?.id]);

  const resetCardState = () => {
    setFlipped(false);
    setShowHint(false);
    setShowNotes(false);
    setLens(null);
    setLesson("");
    setTagDraft("");
  };

  const go = useCallback(
    (dir: 1 | -1) => {
      resetCardState();
      setTimeout(() => {
        setIdx((i) => Math.min(cards.length - 1, Math.max(0, i + dir)));
      }, 140);
    },
    [cards.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const runLens = async (l: ExplainLens) => {
    if (!card) return;
    setLens(l);
    setLoadingLens(l);
    setLesson("");
    try {
      const res = await explain({
        data: { question: card.question, answer: card.answer, lens: l, topic: card.topic },
      });
      setLesson(res.text);
    } catch {
      setLesson("Couldn't generate that explanation right now. Please try again.");
    } finally {
      setLoadingLens(null);
    }
  };

  const rate = (r: Rating) => {
    if (!card) return;
    const next = rateCard(card.id, r);
    setReviews((prev) => ({ ...prev, [String(card.id)]: next }));
    if (idx < cards.length - 1) go(1);
  };

  const share = async () => {
    if (!card) return;
    const text = `${card.question}\n\n${card.answer}\n\n— Quizenix`;
    try {
      if (navigator.share) await navigator.share({ title: "Quizenix flashcard", text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {}
  };

  const addTag = () => {
    const t = tagDraft.trim();
    if (!card || !t || tags.includes(t)) return setTagDraft("");
    setTagsState(setTags(card.id, [...tags, t]));
    setTagDraft("");
  };

  const diffTone =
    card?.difficulty === "hard"
      ? "border-destructive/40 text-destructive"
      : card?.difficulty === "medium"
        ? "border-primary/40 text-primary"
        : "border-success/40 text-success";

  if (!card) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(50rem 30rem at 15% -10%, color-mix(in oklab, var(--primary) 22%, transparent), transparent), radial-gradient(40rem 24rem at 110% 110%, color-mix(in oklab, var(--accent) 18%, transparent), transparent)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-sm tabular-nums text-muted-foreground">
            Card <span className="font-medium text-foreground">{idx + 1}</span> of {cards.length}
          </span>
        </header>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
          />
        </div>

        <div
          className="flex flex-1 items-center justify-center py-6"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          }}
        >
          <div
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label="Flip card"
            className="relative h-[460px] w-full max-w-md cursor-pointer [perspective:1400px]"
          >
            <div className={`card-flip-slow relative h-full w-full ${flipped ? "flipped" : ""}`}>
              {/* FRONT */}
              <div className="card-face glass-card absolute inset-0 flex flex-col justify-between rounded-[28px] p-7 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {card.topic && (
                      <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {card.topic}
                        {card.subtopic ? ` · ${card.subtopic}` : ""}
                      </span>
                    )}
                    {card.type && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                        {TYPE_LABEL[card.type] ?? card.type}
                      </span>
                    )}
                    {card.difficulty && (
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${diffTone}`}>
                        {card.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconBtn
                      label="Favorite"
                      active={isFav}
                      onClick={() => setFavs(toggleFavorite(card.id))}
                    >
                      <Star className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
                    </IconBtn>
                    <IconBtn
                      label="Bookmark"
                      active={isBookmarked}
                      onClick={() => setBookmarks(toggleBookmark(card.id))}
                    >
                      <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
                    </IconBtn>
                    <IconBtn label="Share" onClick={share}>
                      <Share2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>

                <div className="space-y-4 text-center">
                  {card.learningObjective && (
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {card.learningObjective}
                    </p>
                  )}
                  <p className="text-[26px] font-medium leading-snug tracking-tight">{card.question}</p>
                </div>

                <div className="space-y-3">
                  {showHint && card.hint && (
                    <div className="rise-in rounded-xl border border-primary/30 bg-primary/10 p-3 text-left text-sm">
                      <span className="font-semibold text-primary">Hint · </span>
                      {card.hint}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {card.recallSeconds ? `~${card.recallSeconds}s to recall` : "Think, then flip"}
                    </span>
                    {card.hint && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint((s) => !s);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 transition hover:border-primary/50 hover:text-foreground"
                      >
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        {showHint ? "Hide hint" : "AI hint"}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlipped(true);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110"
                  >
                    <RotateCcw className="h-4 w-4" /> Flip card
                  </button>
                </div>
              </div>

              {/* BACK */}
              <div className="card-face card-back glass-card absolute inset-0 flex flex-col gap-4 overflow-auto rounded-[28px] p-7 shadow-[var(--shadow-glow)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-primary">Answer</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {card.importance ? <span>{"★".repeat(card.importance)}</span> : null}
                    {typeof card.examProbability === "number" && (
                      <span className="rounded-full border border-border/60 px-2 py-0.5">
                        {card.examProbability}% exam odds
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-lg leading-relaxed text-foreground/95">{card.answer}</p>

                <div className="space-y-2.5 text-sm">
                  {card.explanation && <Row label="Explanation">{card.explanation}</Row>}
                  {card.example && <Row label="Real world">{card.example}</Row>}
                  {card.memoryTrick && <Row label="Memory trick">{card.memoryTrick}</Row>}
                  {card.commonMistake && (
                    <Row label="Common mistake" tone="destructive">
                      {card.commonMistake}
                    </Row>
                  )}
                  {card.relatedConcepts?.length ? (
                    <p className="text-xs text-muted-foreground">
                      Related: {card.relatedConcepts.join(" · ")}
                    </p>
                  ) : null}
                </div>

                {card.followUp && (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
                    <span className="font-semibold text-primary">Your turn · </span>
                    {card.followUp}
                  </div>
                )}

                <div
                  className="mt-auto flex gap-2 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setFlipped(false)}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card/60 text-sm transition hover:bg-muted"
                  >
                    <RotateCcw className="h-4 w-4" /> Review again
                  </button>
                  <button
                    onClick={() => {
                      setFlipped(false);
                      setTimeout(() => runLens("simpler"), 250);
                    }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110"
                  >
                    <Wand2 className="h-4 w-4" /> Explain better
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {copied && (
          <div className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
            Card copied to clipboard
          </div>
        )}

        {/* Rating — spaced repetition */}
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>How well did you recall this?</span>
            {review && <span>Next review {intervalLabel(review.step)}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                onClick={() => rate(r.key)}
                className={`rounded-xl border bg-card/60 px-2 py-2.5 text-[11px] font-medium transition hover:brightness-125 ${
                  r.tone === "destructive"
                    ? "border-destructive/40 text-destructive"
                    : r.tone === "success"
                      ? "border-success/40 text-success"
                      : "border-primary/40 text-primary"
                } ${review?.lastRating === r.key ? "ring-1 ring-primary" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* Explain better lenses */}
        <section className="mb-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {EXPLAIN_LENSES.map((l) => (
              <button
                key={l}
                onClick={() => runLens(l)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                  lens === l
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {LENS_LABEL[l]}
              </button>
            ))}
            <button
              onClick={() => setShowNotes((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <NotebookPen className="h-3.5 w-3.5 text-primary" />
              My notes
            </button>
            <Link
              to="/tutor"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Target className="h-3.5 w-3.5 text-primary" /> Ask AI Tutor
            </Link>
          </div>

          {(loadingLens || lesson) && (
            <div className="rise-in glass-card rounded-2xl p-4 text-sm leading-relaxed">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {LENS_LABEL[(loadingLens ?? lens) as ExplainLens]} explanation
              </div>
              {loadingLens ? (
                <div className="space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-foreground/90">{lesson}</p>
              )}
            </div>
          )}

          {showNotes && (
            <div className="rise-in mt-2 rounded-2xl border border-border bg-card/60 p-4">
              <textarea
                value={note}
                onChange={(e) => {
                  setNoteState(e.target.value);
                  setNote(card.id, e.target.value);
                }}
                rows={3}
                placeholder="Add a personal note for this card…"
                className="w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary/60"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagsState(setTags(card.id, tags.filter((x) => x !== t)))}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-primary"
                  >
                    {t} ×
                  </button>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag…"
                  className="w-28 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] outline-none focus:border-primary/60"
                />
              </div>
            </div>
          )}
        </section>

        <footer className="flex items-center justify-between gap-3 pb-2">
          <button
            onClick={() => go(-1)}
            disabled={idx === 0}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-card/60 text-sm transition hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={() => {
              resetCardState();
              setIdx(0);
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/60 text-muted-foreground transition hover:bg-muted"
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
        <p className="pb-4 text-center text-[11px] text-muted-foreground">
          Tip: ← → to navigate, Space to flip, swipe on mobile
        </p>
      </div>
    </main>
  );
}

function IconBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-card/50 transition hover:border-primary/50 ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "destructive";
}) {
  return (
    <p className="text-foreground/85">
      <span className={`font-semibold ${tone === "destructive" ? "text-destructive" : "text-primary"}`}>
        {label} ·{" "}
      </span>
      {children}
    </p>
  );
}
