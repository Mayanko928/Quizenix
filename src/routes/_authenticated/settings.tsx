import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/app-nav";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, deleteMyData, exportMyData } from "@/lib/privacy.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Privacy & Security — Quizenix" },
      {
        name: "description",
        content:
          "Control your Quizenix data: export everything you own, delete documents, notes or AI chat history, or remove your account entirely.",
      },
      { property: "og:title", content: "Privacy & Security — Quizenix" },
      {
        property: "og:description",
        content: "Export your data, delete AI history, or remove your Quizenix account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const SCOPES = [
  { scope: "documents" as const, label: "Uploaded documents & study sets", note: "Removes generated flashcards, quizzes and revision material." },
  { scope: "chats" as const, label: "AI tutor history", note: "Deletes every chat thread and its messages." },
  { scope: "notes" as const, label: "Notes", note: "Deletes all notes you have written." },
  { scope: "reviews" as const, label: "Review & progress history", note: "Clears spaced-repetition and progress records." },
];

function SettingsPage() {
  const navigate = useNavigate();
  const runExport = useServerFn(exportMyData);
  const runDelete = useServerFn(deleteMyData);
  const runDeleteAccount = useServerFn(deleteMyAccount);

  const [busy, setBusy] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function handleExport() {
    setBusy("export");
    try {
      const result = await runExport({ data: undefined });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quizenix-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export has downloaded.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(scope: (typeof SCOPES)[number]["scope"], label: string) {
    if (!window.confirm(`Permanently delete: ${label}? This cannot be undone.`)) return;
    setBusy(scope);
    try {
      await runDelete({ data: { scope } });
      toast.success(`${label} deleted.`);
    } catch {
      toast.error("Delete failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteAccount() {
    setBusy("account");
    try {
      await runDeleteAccount({ data: { confirm: "DELETE" } });
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Account deletion failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-background px-4 pb-24 pt-8 lg:pb-10 lg:pl-64">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Privacy & security
            </div>
            <h1 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-semibold tracking-tight">
              Your data, your control
            </h1>
            <p className="text-sm text-muted-foreground">
              Quizenix stores only what you upload and create. Your material is never used to train models, and
              nothing is shared with other users. Everything here is permanent.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-card/50 p-5">
            <h2 className="text-lg font-semibold">Export personal data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download a machine-readable JSON copy of your profile, documents, notes, chats and progress.
            </p>
            <button
              onClick={handleExport}
              disabled={busy !== null}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busy === "export" ? "Preparing…" : "Export my data"}
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-card/50 p-5">
            <h2 className="text-lg font-semibold">Delete specific data</h2>
            <ul className="mt-4 space-y-3">
              {SCOPES.map((s) => (
                <li
                  key={s.scope}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.note}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(s.scope, s.label)}
                    disabled={busy !== null}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {busy === s.scope ? "Deleting…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This erases your account and every document, note, chat and progress record permanently. Type
              <span className="mx-1 font-mono font-semibold text-foreground">DELETE</span> to confirm.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-label="Type DELETE to confirm account deletion"
                placeholder="DELETE"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[200px]"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== "DELETE" || busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {busy === "account" ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
