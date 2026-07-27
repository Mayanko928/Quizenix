import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Quizenix" },
      { name: "description", content: "Sign in or create your Quizenix account to save study sets, track XP and streaks." },
      { property: "og:title", content: "Sign in — Quizenix" },
      { property: "og:description", content: "Save your study sets, track XP and streaks with a free Quizenix account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (err) throw err;
        navigate({ to: "/dashboard" });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  };

  return (
    <main className="dark grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)" }} className="text-lg font-semibold">
                Quizenix
              </div>
              <div className="text-xs text-muted-foreground">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </div>
            </div>
          </div>

          <button
            onClick={google}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:border-primary/50"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="relative my-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or with email</span>
            <span className="absolute left-0 right-0 top-1/2 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field
                icon={<Mail className="h-4 w-4" />}
                type="text"
                placeholder="Your name"
                value={name}
                onChange={setName}
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4" />}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  icon,
  value,
  onChange,
  ...rest
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus-within:border-primary">
      <span className="text-muted-foreground">{icon}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.4 29.4 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.9-4.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.2 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.4 29.4 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45.5c5.3 0 10-2 13.6-5.3l-6.3-5.2c-2 1.4-4.5 2.2-7.3 2.2-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.3 41.1 16.1 45.5 24 45.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.2C41.7 35.7 44.5 30.7 44.5 25c0-1.5-.2-3-.9-4.5z" />
    </svg>
  );
}
