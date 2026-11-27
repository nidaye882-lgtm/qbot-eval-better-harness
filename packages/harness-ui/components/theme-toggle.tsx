"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  resolveTheme,
  storedThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const satisfies ReadonlyArray<{ value: ThemePreference; label: string; icon: typeof Sun }>;

function applyTheme(preference: ThemePreference) {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = resolveTheme(preference, systemPrefersDark);
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    setPreference(storedThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)));
  }, []);

  function choose(next: ThemePreference) {
    setPreference(next);
    if (next === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    applyTheme(next);
  }

  return (
    <div className="segmented theme-toggle" role="group" aria-label="Appearance">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            className={preference === option.value ? "active" : ""}
            aria-pressed={preference === option.value}
            aria-label={`${option.label} appearance`}
            title={`${option.label} appearance`}
            onClick={() => choose(option.value)}
          >
            <Icon aria-hidden="true" />
            <span className="theme-toggle-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
