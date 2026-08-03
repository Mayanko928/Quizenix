import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MessageCircle,
  Plus,
  Search,
  Star,
  Trash2,
  Pencil,
  Download,
  Loader2,
} from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { listThreads, createThread, updateThread, deleteThread, getThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor Chats — Quizenix" },
      { name: "description", content: "All your saved AI tutor conversations — search, rename, continue or export them." },
      { property: "og:title", content: "AI Tutor Chats — Quizenix" },
      { property: "og:description", content: "All your saved AI tutor conversations — search, rename, continue or export them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TutorHome,
});

function TutorHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const update = useServerFn(updateThread);
  const remove = useServerFn(deleteThread);
  const fetchThread = useServerFn(getThread);
  const [q, setQ] = useState("");

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => fetchThreads(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["chat-threads"] });

  const newChat = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: ({ id }) => {
      invalidate();
      navigate({ to: "/tutor/$threadId", params: { threadId: id } });
    },
  });
  const patch = useMutation({
    mutationFn: (vars: { id: string; title?: string; is_favorite?: boolean }) => update({ data: vars }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(needle));
  }, [threads, q]);

  const exportChat = async (id: string, title: string) => {
    const { messages } = await fetchThread({ data: { id } });
    const md = `# ${title}\n\n${messages
      .map((m) => `**${m.role === "user" ? "You" : "Quizenix"}**\n\n${m.content}\n`)
      .join("\n---\n\n")}`;
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w\- ]+/g, "").slice(0, 60) || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
      <AppNav />
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold">
              AI Tutor chats
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every conversation is saved privately to your account.
            </p>
          </div>
          <button
            onClick={() => newChat.mutate()}
            disabled={newChat.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {newChat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New chat
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your chats…"
            aria-label="Search chats"
            className="w-full rounded-xl border border-border bg-card/50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-5 space-y-2">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading your chats…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {threads.length ? "No chats match that search." : "No chats yet — start one and it'll be saved here."}
              </p>
            </div>
          )}
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-3 transition hover:border-primary/40"
            >
              <Link
                to="/tutor/$threadId"
                params={{ threadId: t.id }}
                className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(t.updated_at).toLocaleString()} · {t.mode}
                </span>
              </Link>
              <button
                aria-label={t.is_favorite ? "Unfavorite chat" : "Favorite chat"}
                onClick={() => patch.mutate({ id: t.id, is_favorite: !t.is_favorite })}
                className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
              >
                <Star className={`h-4 w-4 ${t.is_favorite ? "fill-warning text-warning" : ""}`} />
              </button>
              <button
                aria-label="Rename chat"
                onClick={() => {
                  const title = window.prompt("Rename chat", t.title);
                  if (title?.trim()) patch.mutate({ id: t.id, title: title.trim().slice(0, 120) });
                }}
                className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                aria-label="Export chat"
                onClick={() => exportChat(t.id, t.title)}
                className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                aria-label="Delete chat"
                onClick={() => {
                  if (window.confirm("Delete this chat permanently?")) del.mutate(t.id);
                }}
                className="rounded-lg p-2 text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
