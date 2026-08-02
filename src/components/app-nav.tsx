import { Link, useRouterState } from "@tanstack/react-router";
import {
  BrainCircuit,
  LayoutDashboard,
  Upload,
  Layers,
  Target,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/", label: "Upload", Icon: Upload },
  { to: "/flashcards", label: "Flashcards", Icon: Layers },
  { to: "/quiz", label: "Quiz", Icon: Target },
  { to: "/revision", label: "Revision", Icon: BookOpen },
  { to: "/tutor", label: "AI Tutor", Icon: MessageCircle },
] as const;

/**
 * Fixed app navigation: collapsible-width sidebar on desktop, bottom bar on mobile.
 * Pages add `lg:pl-60 pb-20 lg:pb-0` to their main element to make room.
 */
export function AppNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/40 backdrop-blur-xl lg:flex">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span style={{ fontFamily: "var(--font-display)" }} className="text-lg font-semibold">
            Quizenix
          </span>
        </Link>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={isActive(to) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive(to)
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4">
          <ThemeToggle className="w-full justify-center" />
        </div>
      </aside>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={isActive(to) ? "page" : undefined}
            className={`flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive(to) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate px-1">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
