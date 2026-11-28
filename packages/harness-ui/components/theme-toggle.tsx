"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect } from "react";

import { readStoredDashboardTheme, resolveDashboardTheme, DASHBOARD_THEME_STORAGE_KEY, type DashboardTheme } from "@/lib/dashboard-theme";

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyResolvedTheme(): DashboardTheme {
  const theme = resolveDashboardTheme(readStoredDashboardTheme(globalThis.localStorage), prefersDark());
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

export function ThemeToggle() {
  useLayoutEffect(() => {
    applyResolvedTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredDashboardTheme(globalThis.localStorage)) return;
      applyResolvedTheme();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next: DashboardTheme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      globalThis.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, next);
    } catch {
      // The attribute still switches the page for this visit.
    }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      <Sun className="theme-toggle-icon when-light" aria-hidden="true" size={15} />
      <Moon className="theme-toggle-icon when-dark" aria-hidden="true" size={15} />
      <span className="when-light">Light</span>
      <span className="when-dark">Dark</span>
      <span className="visually-hidden when-light"> mode. Switch to dark mode.</span>
      <span className="visually-hidden when-dark"> mode. Switch to light mode.</span>
    </button>
  );
}
