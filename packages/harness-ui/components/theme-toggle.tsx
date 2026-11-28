"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect } from "react";

import { DASHBOARD_THEME_STORAGE_KEY, resolveDashboardTheme, type DashboardTheme } from "@/lib/theme";

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyDashboardTheme(theme: DashboardTheme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

function currentDashboardTheme(): DashboardTheme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  // Dev Strict Mode remounts clear `data-theme` back to the server attribute.
  // Re-apply the same resolution the boot script used, before paint.
  useLayoutEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyDashboardTheme(resolveDashboardTheme(readStoredTheme(), prefersDark));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = (): void => {
      const stored = readStoredTheme();
      if (stored === "light" || stored === "dark") return;
      applyDashboardTheme(resolveDashboardTheme(null, media.matches));
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function chooseTheme(next: DashboardTheme): void {
    applyDashboardTheme(next);
    try {
      localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page when storage is blocked.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Switch color theme"
      title="Switch color theme"
      onClick={() => chooseTheme(currentDashboardTheme() === "dark" ? "light" : "dark")}
    >
      <Sun className="theme-icon theme-icon-for-light" aria-hidden="true" />
      <Moon className="theme-icon theme-icon-for-dark" aria-hidden="true" />
      <span className="theme-label theme-label-for-light">Light</span>
      <span className="theme-label theme-label-for-dark">Dark</span>
    </button>
  );
}
