import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, Loader2, Pencil } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { Markdown } from "@/components/markdown";
import { askTutor } from "@/lib/tutor.functions";
import { getThread, appendMessages, updateThread } from "@/lib/chat.functions";
import { loadNotes } from "@/lib/study-store";

export const Route = createFileRoute("/_authenticated/tutor_/$threadId")({
  head: () => ({
    meta: [
      { title: "Tutor conversation — Quizenix" },
      { name: "description", content: "Continue your saved AI tutor conversation with full history and teaching modes." },
      { property: "og:title", content: "Tutor conversation — Quizenix" },
      { property: "og:description", content: "Continue your saved AI tutor conversation with full history and teaching modes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

type Msg = { role: "user" | "tutor"; content: string };
type Mode = "default" | "explain-simply" | "analogy" | "real-world" | "coding-example" | "compare" | "professor" | "beginner";

const MODES: { id: Mode; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "explain-simply", label: "Explain simply" },
  { id: "analogy", label: "Give analogy" },
  { id: "real-world", label: "Real-world" },
  { id: "coding-example", label: "Coding example" },
  { id: "compare", label: "Compare concepts" },
  { id: "professor", label: "Like a professor" },
  { id: "beginner", label: "I'm a beginner" },
];

function ThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ask = useServerFn(askTutor);
  const fetchThread = useServerFn(getThread);
  const append = useServerFn(appendMessages);
  const patchThread = useServerFn(updateThread);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["chat-thread", threadId],
    queryFn: () => fetchThread({ data: { id: threadId } }),
  });

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [mode, setMode] = useState<Mode>("default");
  const [title, setTitle] = useState("New chat");
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setNotes(loadNotes()), []);

  useEffect(() => {
    if (!data) return;
    setMsgs(data.messages.map((m) => ({ role: m.role, content: m.content })));
    setTitle(data.thread.title);
    setMode((data.thread.mode as Mode) ?? "default");
    inputRef.current?.focus();
  }, [data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const { answer } = await ask({ data: { question: q, context: notes || undefined, mode } });
      setMsgs((m) => [...m, { role: "tutor", content: answer }]);
      const isFirst = msgs.length === 0;
      const newTitle = isFirst ? q.slice(0, 60) : undefined;
      await append({
        data: {
          threadId,
          messages: [
            { role: "user", content: q },
            { role: "tutor", content: answer },
          ],
          ...(newTitle ? { title: newTitle } : {}),
        },
      });
      if (newTitle) setTitle(newTitle);
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setMsgs((m) => [...m, { role: "tutor", content: `⚠ ${message}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const rename = async () => {
    const next = window.prompt("Rename chat", title);
    if (!next?.trim()) return;
    const t = next.trim().slice(0, 120);
    setTitle(t);
    await patchThread({ data: { id: threadId, title: t } });
    qc.invalidateQueries({ queryKey: ["chat-threads"] });
  };

  const changeMode = async (m: Mode) => {
    setMode(m);
    await patchThread({ data: { id: threadId, mode: m } });
  };

  if (isError) {
    return (
      <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
        <AppNav />
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground">This chat could not be loaded.</p>
          <button
            onClick={() => navigate({ to: "/tutor" })}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to chats
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
      <AppNav />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-5">
        <Link to="/tutor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Chats
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span style={{ fontFamily: "var(--font-display)" }} className="truncate font-semibold">
            {title}
          </span>
          <button aria-label="Rename chat" onClick={rename} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-auto px-5 pb-6">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading conversation…</p>}
        {!isLoading && msgs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ask anything about your notes — this conversation is saved automatically.
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[95%] text-foreground/90">
              <Markdown>{m.content}</Markdown>
            </div>
          ),
        )}
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/40 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  mode === m.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={notes ? "Ask about your notes…" : "Ask anything — paste notes on the home page for context."}
              rows={2}
              className="min-h-[56px] flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="inline-flex h-[56px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
