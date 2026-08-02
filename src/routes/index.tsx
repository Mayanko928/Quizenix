import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  BrainCircuit,
  ArrowRight,
  Zap,
  AlertCircle,
  Eye,
  Upload,
  Sparkles,
  Target,
  MessageCircle,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  FileText,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateStudyMaterial } from "../lib/generate.functions";
import { saveStudySet } from "../lib/study.functions";
import { ocrImage } from "../lib/ocr.functions";
import {
  saveStudyMaterial,
  clearStudyMaterial,
  saveNotes,
} from "../lib/study-store";
import { useAuth } from "../hooks/use-auth";
import {
import { ThemeToggle } from "@/components/theme-toggle";
  ACCEPT_ATTR,
  formatBytes,
  isAcceptedFile,
  parseFile,
  type ParseProgress,
} from "../lib/file-parser";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quizenix — Your AI Study Coach" },
      {
        name: "description",
        content:
          "Quizenix turns notes, PDFs and lectures into a concept map, flashcards, quizzes and an AI tutor — built for real understanding, not memorization.",
      },
      { property: "og:title", content: "Quizenix — Your AI Study Coach" },
      {
        property: "og:description",
        content:
          "Concept maps, adaptive quizzes, flashcards and an AI tutor — Quizenix helps you actually understand what you study.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const LOADING_STAGES = [
  "Reading document",
  "Building concept graph",
  "Generating flashcards",
  "Creating quiz",
  "Finalizing your study kit",
];

type FileEntry = {
  name: string;
  size: number;
  status: "reading" | "extracting" | "ocr" | "done" | "error";
  message?: string;
  chars?: number;
};

function Landing() {
  const navigate = useNavigate();
  const generate = useServerFn(generateStudyMaterial);
  const save = useServerFn(saveStudySet);
  const ocr = useServerFn(ocrImage);
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const runStages = () => {
    setStage(0);
    stageTimer.current && clearInterval(stageTimer.current);
    stageTimer.current = setInterval(() => {
      setStage((s) => Math.min(LOADING_STAGES.length - 1, s + 1));
    }, 1400);
  };
  const stopStages = () => {
    stageTimer.current && clearInterval(stageTimer.current);
    stageTimer.current = null;
  };

  const updateFile = (name: string, patch: Partial<FileEntry>) =>
    setFiles((cur) => cur.map((f) => (f.name === name ? { ...f, ...patch } : f)));

  const handleGenerate = async () => {
    setError(null);
    const trimmed = notes.trim();
    if (!trimmed) {
      clearStudyMaterial();
      navigate({ to: "/flashcards" });
      return;
    }
    setLoading(true);
    runStages();
    try {
      saveNotes(trimmed);
      const material = await generate({ data: { notes: trimmed } });
      saveStudyMaterial(material);
      if (user) {
        const title = material.title?.slice(0, 120) || trimmed.slice(0, 60).replace(/\s+/g, " ") + "…";
        try {
          await save({ data: { title, notes: trimmed, material: material as any } });
        } catch (e) {
          console.warn("Save failed", e);
        }
      }
      navigate({ to: "/flashcards" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      if (/429/.test(msg)) setError("Rate limited — please wait a moment and try again.");
      else if (/402/.test(msg))
        setError("AI credits exhausted. Please add credits to your workspace.");
      else setError(msg);
    } finally {
      stopStages();
      setLoading(false);
    }
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(fileList);
    const rejected = incoming.filter((f) => !isAcceptedFile(f));
    if (rejected.length) {
      setError(
        `Unsupported: ${rejected.map((f) => f.name).join(", ")}. Try PDF, DOCX, PPTX, XLSX, TXT, MD or an image.`,
      );
    }
    const accepted = incoming.filter(isAcceptedFile);
    if (!accepted.length) return;

    setFiles((cur) => [
      ...cur,
      ...accepted.map<FileEntry>((f) => ({ name: f.name, size: f.size, status: "reading" })),
    ]);

    const onProgress = (p: ParseProgress) =>
      updateFile(p.file, { status: p.stage as FileEntry["status"], message: p.message });

    let combined = "";
    for (const file of accepted) {
      try {
        const result = await parseFile(file, (d) => ocr({ data: d }), onProgress);
        if (result.text) combined += (combined ? "\n\n" : "") + `# ${file.name}\n${result.text}`;
        updateFile(file.name, {
          status: result.text ? "done" : "error",
          message: result.warning ?? (result.text ? undefined : "No text extracted"),
          chars: result.text.length,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to read file";
        updateFile(file.name, { status: "error", message: msg });
      }
    }
    if (combined) setNotes((cur) => (cur ? cur + "\n\n" + combined : combined));
  };

  const removeFile = (name: string) => setFiles((cur) => cur.filter((f) => f.name !== name));


  return (
    <main
      className="min-h-screen w-full bg-background text-foreground selection:bg-primary/30"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Quizenix
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle className="mr-1" />
          <div className="hidden items-center gap-1 sm:flex">
          <Link to="/flashcards" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
            Flashcards
          </Link>
          <Link to="/quiz" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
            Quiz
          </Link>
          <Link to="/revision" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
            Revision
          </Link>
          <Link to="/tutor" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
            AI Tutor
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="ml-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary/50"
            >
              Sign in
            </Link>
          )}
          </div>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-7xl items-center px-6 pb-16 pt-4 md:px-12 lg:min-h-[calc(100vh-88px)] lg:px-20 lg:py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
                AI Study Coach · beta
              </div>
              <h1
                className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl xl:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Understand it.{" "}
                <span className="text-primary">Don't just memorize</span> it.
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground md:text-xl">
                Drop your notes and Quizenix builds a concept map, teaches every idea with
                analogies, then drills you with adaptive flashcards, quizzes and exam questions.
              </p>
            </div>

            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.length) await handleFiles(e.dataTransfer.files);
                }}
                className={`relative rounded-2xl border ${dragOver ? "border-primary bg-primary/5" : "border-border bg-card"} transition-colors`}
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste notes, or drop PDF / DOCX / PPTX / XLSX / TXT / MD / image…"
                  disabled={loading}
                  className="h-48 w-full resize-none rounded-2xl bg-transparent p-5 pb-12 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
                />
                <div className="pointer-events-none absolute bottom-3 right-4 font-mono text-[10px] text-muted-foreground/70">
                  {notes.length.toLocaleString()} chars
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload files
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={ACCEPT_ATTR}
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.length) await handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {files.length > 0 && (
                <ul className="space-y-1.5 rounded-xl border border-border bg-card p-2">
                  {files.map((f) => (
                    <li key={f.name} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs">
                      <FileStatusIcon status={f.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{f.name}</span>
                          <span className="shrink-0 text-muted-foreground/70">· {formatBytes(f.size)}</span>
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {f.status === "done"
                            ? f.message ?? `Extracted ${f.chars?.toLocaleString() ?? 0} chars`
                            : f.status === "error"
                              ? f.message ?? "Failed"
                              : f.message ??
                                (f.status === "ocr"
                                  ? "Running OCR"
                                  : f.status === "extracting"
                                    ? "Extracting text"
                                    : "Reading")}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(f.name)}
                        className="rounded p-1 text-muted-foreground/70 hover:bg-background hover:text-foreground"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}


              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <Zap className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
                  {loading ? "Analyzing…" : "Build my study kit"}
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

              {loading && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                  {LOADING_STAGES.map((s, i) => {
                    const state = i < stage ? "done" : i === stage ? "active" : "wait";
                    return (
                      <div key={s} className="flex items-center gap-3 text-sm">
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                            state === "done"
                              ? "bg-success text-success-foreground"
                              : state === "active"
                                ? "bg-primary text-primary-foreground animate-pulse"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {state === "done" ? "✓" : i + 1}
                        </span>
                        <span
                          className={
                            state === "wait"
                              ? "text-muted-foreground/60"
                              : "text-foreground"
                          }
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative hidden h-[520px] items-center justify-center lg:flex">
            <div className="absolute h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 -translate-y-2 rotate-[-6deg] rounded-3xl border border-border bg-card opacity-40" />
              <div className="absolute inset-0 translate-y-2 rotate-[3deg] rounded-3xl border border-border bg-card opacity-60" />

              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-destructive/30" />
                    <div className="h-3 w-3 rounded-full bg-primary/30" />
                    <div className="h-3 w-3 rounded-full bg-success/30" />
                  </div>
                  <div className="font-mono text-xs tracking-widest text-primary">
                    CONCEPT 04 / 12
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <span
                      className="inline-block rounded-md bg-border/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Neuroscience
                    </span>
                    <h3
                      className="text-2xl font-semibold leading-snug"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Why does the myelin sheath make neurons faster?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Think of it as insulation on a wire — the signal jumps between gaps
                      instead of leaking along the whole length.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <div className="rounded-lg bg-border/50 p-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm italic text-muted-foreground">
                      Tap for hint · analogy · example
                    </span>
                  </div>
                </div>

                <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
              </div>

              <div className="absolute -right-6 top-[22%] flex rotate-[10deg] items-center gap-3 rounded-2xl border-2 border-background bg-primary p-4 text-primary-foreground shadow-[var(--shadow-glow)]">
                <div className="rounded-lg bg-white/20 p-2">
                  <Target className="h-5 w-5" />
                </div>
                <div className="pr-2">
                  <div className="text-[10px] font-bold uppercase opacity-80">
                    Weakness detected
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Practice queued
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-6 pb-20 sm:grid-cols-2 md:px-12 lg:grid-cols-4 lg:px-20">
        <FeatureCard icon={<Sparkles className="h-4 w-4" />} title="Concept map" desc="AI understands your notes before generating anything." to="/flashcards" navigate={navigate} />
        <FeatureCard icon={<BookOpen className="h-4 w-4" />} title="Flashcards" desc="Hints, mnemonics, examples & common mistakes." to="/flashcards" navigate={navigate} />
        <FeatureCard icon={<GraduationCap className="h-4 w-4" />} title="Exam mode" desc="2 / 5 / 10 / 15-mark questions with model answers." to="/revision" navigate={navigate} />
        <FeatureCard icon={<MessageCircle className="h-4 w-4" />} title="AI Tutor" desc="Ask for analogies, examples, or 'explain like I'm 12'." to="/tutor" navigate={navigate} />
      </section>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-center text-xs text-muted-foreground md:px-12 lg:px-20">
        Quizenix · built for conceptual mastery, not memorization.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  to,
  navigate,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: "/flashcards" | "/quiz" | "/tutor" | "/revision";
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <button
      onClick={() => navigate({ to })}
      className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-card/70"
    >
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-2 text-base font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
            {icon}
          </span>
          {title}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}

function FileStatusIcon({ status }: { status: FileEntry["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />;
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
}

