import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, X, Trophy, RotateCcw } from "lucide-react";
import { dummyQuiz } from "../lib/dummy-data";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — FlashGenius" },
      { name: "description", content: "Test yourself with multiple choice questions and instant feedback." },
      { property: "og:title", content: "Quiz — FlashGenius" },
      { property: "og:description", content: "Test yourself with multiple choice questions and instant feedback." },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const questions = dummyQuiz;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const progress = ((idx + (selected !== null ? 1 : 0)) / questions.length) * 100;

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  const reset = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const message =
      pct >= 80 ? "Outstanding!" : pct >= 50 ? "Nice work!" : "Keep practicing!";
    return (
      <main className="dark min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Trophy className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{message}</h1>
          <p className="mt-2 text-muted-foreground">You finished the quiz.</p>

          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
            <div className="text-5xl font-semibold tabular-nums">
              <span className="gradient-text">{score}</span>
              <span className="text-muted-foreground">/{questions.length}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{pct}% correct</div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex w-full gap-3">
            <button
              onClick={reset}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm transition hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <Link
              to="/"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCorrect = selected !== null && selected === q.answerIndex;
  const isWrong = selected !== null && selected !== q.answerIndex;

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-sm tabular-nums text-muted-foreground">
            Question <span className="font-medium text-foreground">{idx + 1}</span> of {questions.length}
          </span>
        </header>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-10 flex-1">
          <h2 className="text-2xl font-medium leading-snug sm:text-3xl">
            {q.question}
          </h2>

          <div className="mt-8 grid gap-3">
            {q.options.map((opt, i) => {
              const isPicked = selected === i;
              const isAnswer = i === q.answerIndex;
              let cls =
                "flex items-center justify-between rounded-xl border bg-card px-4 py-4 text-left text-[15px] transition ";
              if (selected === null) {
                cls += "border-border hover:border-primary/50 hover:bg-muted/50";
              } else if (isAnswer) {
                cls += "border-success/60 bg-success/10 text-foreground";
              } else if (isPicked) {
                cls += "border-destructive/60 bg-destructive/10 text-foreground";
              } else {
                cls += "border-border opacity-50";
              }
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={selected !== null}
                  className={cls}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-border text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                  {selected !== null && isAnswer && (
                    <Check className="h-5 w-5 text-success" />
                  )}
                  {isPicked && !isAnswer && (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div
              className={`mt-6 rounded-xl border p-4 text-sm ${
                isCorrect
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {isCorrect ? "Correct! Nicely done." : isWrong ? `Not quite — the answer is "${q.options[q.answerIndex]}".` : ""}
            </div>
          )}
        </div>

        <footer className="mt-6">
          <button
            onClick={next}
            disabled={selected === null}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            {idx + 1 === questions.length ? "See results" : "Next question"}
          </button>
        </footer>
      </div>
    </main>
  );
}
