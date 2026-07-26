import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";
import { askTutor } from "../lib/tutor.functions";
import { loadNotes } from "../lib/study-store";

export const Route = createFileRoute("/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — Quizenix" },
      { name: "description", content: "Chat with an AI tutor that explains simply, gives analogies and real-world examples." },
      { property: "og:title", content: "AI Tutor — Quizenix" },
      { property: "og:description", content: "Chat with an AI tutor that explains simply, gives analogies and real-world examples." },
    ],
  }),
  component: TutorPage,
});

type Msg = { role: "user" | "tutor"; text: string };
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

function TutorPage() {
  const ask = useServerFn(askTutor);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<Mode>("default");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "tutor", text: "Hi! I'm your Quizenix tutor. Ask me anything about your notes, or pick a mode below." },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { answer } = await ask({ data: { question: q, context: notes || undefined, mode } });
      setMsgs((m) => [...m, { role: "tutor", text: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMsgs((m) => [...m, { role: "tutor", text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span style={{ fontFamily: "var(--font-display)" }} className="font-semibold">
            AI Tutor
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-auto px-5 pb-6">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground/90"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/40 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={notes ? "Ask about your notes…" : "Ask anything — for context, paste your notes on the home page first."}
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
