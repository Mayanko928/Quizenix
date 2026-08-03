import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Plus, Search, Star, Trash2, Loader2 } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { listNotes, createNote, updateNote, deleteNote } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "My Notes — Quizenix" },
      { name: "description", content: "Write and organise markdown study notes, with AI help built in." },
      { property: "og:title", content: "My Notes — Quizenix" },
      { property: "og:description", content: "Write and organise markdown study notes, with AI help built in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesHome,
});

function NotesHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchNotes = useServerFn(listNotes);
  const create = useServerFn(createNote);
  const update = useServerFn(updateNote);
  const remove = useServerFn(deleteNote);
  const [q, setQ] = useState("");

  const { data: notes = [], isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => fetchNotes() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes"] });

  const newNote = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: ({ id }) => {
      invalidate();
      navigate({ to: "/notes/$noteId", params: { noteId: id } });
    },
  });
  const patch = useMutation({
    mutationFn: (vars: { id: string; is_favorite: boolean }) => update({ data: vars }),
    onSuccess: invalidate,
  });
  const del = useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: invalidate });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.content.toLowerCase().includes(needle) ||
        n.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [notes, q]);

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-0 lg:pl-60">
      <AppNav />
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold">
              My notes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Markdown notes, saved privately to your account.</p>
          </div>
          <button
            onClick={() => newNote.mutate()}
            disabled={newNote.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {newNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New note
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, content and tags…"
            aria-label="Search notes"
            className="w-full rounded-xl border border-border bg-card/50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-5 space-y-2">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading your notes…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {notes.length ? "No notes match that search." : "No notes yet — create your first one."}
              </p>
            </div>
          )}
          {filtered.map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-3 transition hover:border-primary/40"
            >
              <Link
                to="/notes/$noteId"
                params={{ noteId: n.id }}
                className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block truncate text-sm font-medium">{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {new Date(n.updated_at).toLocaleDateString()} ·{" "}
                  {n.content.replace(/\s+/g, " ").slice(0, 80) || "Empty note"}
                </span>
                {n.tags.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {n.tags.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </span>
                )}
              </Link>
              <button
                aria-label={n.is_favorite ? "Unfavorite note" : "Favorite note"}
                onClick={() => patch.mutate({ id: n.id, is_favorite: !n.is_favorite })}
                className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
              >
                <Star className={`h-4 w-4 ${n.is_favorite ? "fill-warning text-warning" : ""}`} />
              </button>
              <button
                aria-label="Delete note"
                onClick={() => {
                  if (window.confirm("Delete this note permanently?")) del.mutate(n.id);
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
