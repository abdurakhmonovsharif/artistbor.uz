"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const didLoadTheme = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("artistbor_theme") as Theme | null;
    const nextTheme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    window.queueMicrotask(() => {
      didLoadTheme.current = true;
      setThemeState(nextTheme);
    });
  }, []);

  useEffect(() => {
    if (!didLoadTheme.current) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("artistbor_theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
