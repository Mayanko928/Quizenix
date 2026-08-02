import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { applyTheme, THEME_KEY, resolveTheme, type Theme } from "@/lib/theme";

type Ctx = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx>({ theme: "system", resolved: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setResolved(resolveTheme(stored));
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
    applyTheme(t);
    setResolved(resolveTheme(t));
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
