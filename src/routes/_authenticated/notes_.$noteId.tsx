import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, Eye, Loader2, Pencil, Sparkles, Star, Trash2 } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { Markdown } from "@/components/markdown";
import { getNote, updateNote, deleteNote } from "@/lib/notes.functions";
import { askTutor } from "@/lib/tutor.functions";

export const Route = createFileRoute("/_authenticated/notes_/$noteId")({
  head: () => ({
    meta: [
      { title: "Note editor — Quizenix" },
      { name: "description", content: "Write markdown study notes with live preview, tags and AI assistance." },
      { property: "og:title", content: "Note editor — Quizenix" },
      { property: "og:description", content: "Write markdown study notes with live preview, tags and AI assistance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoteEditor,
});

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", prompt: "Summarize these notes into a tight study summary." },
  { id: "expand", label: "Explain more", prompt: "Explain these notes in more depth, filling gaps a student would have." },
  { id: "bullets", label: "Key points", prompt: "Turn these notes into crisp key-point bullets." },
  { id: "quizme", label: "Quiz me", prompt: "Write 5 active-recall questions (with answers) from these notes." },
] as const;

function NoteEditor() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchNote = useServerFn(getNote);
  const save = useServerFn(updateNote);
  const remove = useServerFn(deleteNote);
  const ask = useServerFn(askTutor);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => fetchNote({ data: { id: noteId } }),
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiOut, setAiOut] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    setTitle(data.title);
    setContent(data.content);
    setTags(data.tags);
    setFavorite(data.is_favorite);
  }, [data]);

  // Debounced autosave
  useEffect(() => {
    if (!hydrated.current) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await save({ data: { id: noteId, title: title.trim() || "Untitled note", content, tags, is_favorite: favorite } });
        setStatus("saved");
        qc.invalidateQueries({ queryKey: ["notes"] });
      } catch {
        setStatus("idle");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, tags, favorite, noteId, save, qc]);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").slice(0, 40);
    if (!t || tags.includes(t) || tags.length >= 20) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const runAi = async (action: (typeof AI_ACTIONS)[number]) => {
    if (!content.trim()) return;
    setAiBusy(action.id);
    setAiOut(null);
    try {
      const { answer } = await ask({ data: { question: action.prompt, context: content, mode: "default" } });
      setAiOut(answer);
    } catch (e) {
      setAiOut(`⚠ ${e instanceof Error ? e.message : "AI request failed"}`);
    } finally {
      setAiBusy(null);
    }
  };

  const exportMd = () => {
    const url = URL.createObjectURL(new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w\- ]+/g, "").slice(0, 60) || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError) {
    return (
      <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
        <AppNav />
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground">This note could not be loaded.</p>
          <Link to="/notes" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Back to notes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
      <AppNav />
      <div className="mx-auto w-full max-w-3xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Notes
          </Link>
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-muted-foreground">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
            </span>
            <button
              aria-label={preview ? "Edit note" : "Preview note"}
              onClick={() => setPreview((p) => !p)}
              className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
            >
              {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              aria-label={favorite ? "Unfavorite note" : "Favorite note"}
              onClick={() => setFavorite((f) => !f)}
              className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
            >
              <Star className={`h-4 w-4 ${favorite ? "fill-warning text-warning" : ""}`} />
            </button>
            <button aria-label="Export as markdown" onClick={exportMd} className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground">
              <Download className="h-4 w-4" />
            </button>
            <button
              aria-label="Delete note"
              onClick={async () => {
                if (!window.confirm("Delete this note permanently?")) return;
                await remove({ data: { id: noteId } });
                qc.invalidateQueries({ queryKey: ["notes"] });
                navigate({ to: "/notes" });
              }}
              className="rounded-lg p-2 text-muted-foreground transition hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading note…</p>
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Note title"
              placeholder="Untitled note"
              style={{ fontFamily: "var(--font-display)" }}
              className="mt-5 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground"
            />

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:text-destructive"
                >
                  #{t} ×
                </button>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                aria-label="Add tag"
                placeholder="add tag"
                className="w-24 rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-xs outline-none focus:border-primary"
              />
            </div>

            {preview ? (
              <div className="mt-5 min-h-[50vh] rounded-2xl border border-border bg-card/40 p-5">
                {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                aria-label="Note content"
                placeholder="Write in markdown — # headings, **bold**, - lists, `code`…"
                className="mt-5 min-h-[50vh] w-full resize-y rounded-2xl border border-border bg-card/40 p-5 font-mono text-sm leading-relaxed outline-none focus:border-primary"
              />
            )}

            <div className="mt-5 rounded-2xl border border-border bg-card/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> AI on this note
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => runAi(a)}
                    disabled={!!aiBusy || !content.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                  >
                    {aiBusy === a.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    {a.label}
                  </button>
                ))}
              </div>
              {aiOut && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <Markdown>{aiOut}</Markdown>
                  <button
                    onClick={() => {
                      setContent((c) => `${c}\n\n---\n\n${aiOut}`);
                      setAiOut(null);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    <Check className="h-3.5 w-3.5" /> Insert into note
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
