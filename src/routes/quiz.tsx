import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, X, Trophy, RotateCcw, Info } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { dummyQuiz } from "../lib/dummy-data";
import { loadStudyMaterial } from "../lib/study-store";
import type { QuizItem } from "../lib/generate.functions";
import { recordQuizAttempts } from "../lib/study.functions";
import { useAuth } from "../hooks/use-auth";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — Quizenix" },
      {
        name: "description",
        content:
          "Adaptive multiple-choice quizzes with per-answer explanations and misconception coaching.",
      },
      { property: "og:title", content: "Quiz — Quizenix" },
      {
        property: "og:description",
        content:
          "Adaptive multiple-choice quizzes with per-answer explanations and misconception coaching.",
      },
    ],
  }),
  component: QuizPage,
});

function toRichQuiz(q: { question: string; options: string[]; answerIndex: number }, i: number): QuizItem {
  return {
    id: i + 1,
    difficulty: "easy",
    question: q.question,
    options: q.options,
    correctAnswerIndex: q.answerIndex,
    explanation: "",
  };
}

function QuizPage() {
  const [questions, setQuestions] = useState<QuizItem[]>(() =>
    dummyQuiz.map(toRichQuiz),
  );
  const record = useServerFn(recordQuizAttempts);
  const { user } = useAuth();
  const attemptsRef = useRef<{ questionId: number; difficulty: "easy" | "medium" | "hard"; correct: boolean }[]>([]);
  const submittedRef = useRef(false);
  useEffect(() => {
    const m = loadStudyMaterial();
    if (m?.quiz?.length) setQuestions(m.quiz);
  }, []);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongIds, setWrongIds] = useState<number[]>([]);

  const q = questions[idx];
  const progress = ((idx + (selected !== null ? 1 : 0)) / questions.length) * 100;

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const isCorrect = i === q.correctAnswerIndex;
    attemptsRef.current.push({
      questionId: q.id,
      difficulty: (q.difficulty ?? "medium") as "easy" | "medium" | "hard",
      correct: isCorrect,
    });
    if (isCorrect) setScore((s) => s + 1);
    else setWrongIds((w) => [...w, q.id]);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
      if (user && !submittedRef.current && attemptsRef.current.length) {
        submittedRef.current = true;
        record({ data: { attempts: attemptsRef.current } }).catch((e) => console.warn(e));
      }
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
    setWrongIds([]);
    attemptsRef.current = [];
    submittedRef.current = false;
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const message = pct >= 80 ? "Outstanding!" : pct >= 50 ? "Nice work!" : "Keep practicing!";
    return (
      <main className="min-h-screen bg-background text-foreground">
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
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            {wrongIds.length > 0 && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-xs text-muted-foreground">
                <span className="font-semibold text-destructive">Weak spots · </span>
                {wrongIds.length} concept{wrongIds.length > 1 ? "s" : ""} to revisit. Ask the AI Tutor to explain them.
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full gap-3">
            <button onClick={reset} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm transition hover:bg-muted">
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <Link to="/tutor" className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:brightness-110">
              Ask Tutor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCorrect = selected !== null && selected === q.correctAnswerIndex;
  const isWrong = selected !== null && selected !== q.correctAnswerIndex;

  return (
    <main className="min-h-screen bg-background text-foreground">
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
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-8 flex-1">
          {q.difficulty && (
            <span className="text-xs uppercase tracking-widest text-primary">
              {q.difficulty}
            </span>
          )}
          <h2 className="mt-2 text-2xl font-medium leading-snug sm:text-3xl">{q.question}</h2>

          <div className="mt-8 grid gap-3">
            {q.options.map((opt, i) => {
              const isPicked = selected === i;
              const isAnswer = i === q.correctAnswerIndex;
              let cls = "flex items-center justify-between rounded-xl border bg-card px-4 py-4 text-left text-[15px] transition ";
              if (selected === null) cls += "border-border hover:border-primary/50 hover:bg-muted/50";
              else if (isAnswer) cls += "border-success/60 bg-success/10 text-foreground";
              else if (isPicked) cls += "border-destructive/60 bg-destructive/10 text-foreground";
              else cls += "border-border opacity-50";
              return (
                <button key={i} onClick={() => pick(i)} disabled={selected !== null} className={cls}>
                  <span className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-border text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                  {selected !== null && isAnswer && <Check className="h-5 w-5 text-success" />}
                  {isPicked && !isAnswer && <X className="h-5 w-5 text-destructive" />}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="mt-6 space-y-3">
              <div className={`rounded-xl border p-4 text-sm ${isCorrect ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                {isCorrect
                  ? "Correct! Nicely done."
                  : `Not quite — the answer is "${q.options[q.correctAnswerIndex]}".`}
              </div>
              {q.explanation && (
                <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground/90">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="font-semibold text-primary">Why</div>
                    <div>{q.explanation}</div>
                    {isWrong && q.misconception && (
                      <div className="mt-2 text-muted-foreground">
                        <span className="font-semibold text-destructive">Misconception · </span>
                        {q.misconception}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
