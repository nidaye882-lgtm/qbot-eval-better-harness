"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  APPEARANCE_STORAGE_KEY,
  normalizeAppearance,
  resolveAppearance,
  type AppearancePreference,
} from "@/lib/appearance";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const satisfies ReadonlyArray<{
  value: AppearancePreference;
  label: string;
  Icon: typeof Sun;
}>;

function storedPreference(): AppearancePreference {
  try {
    return normalizeAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function paint(preference: AppearancePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.appearance = resolveAppearance(preference, prefersDark);
}

export function AppearanceSwitch() {
  const [preference, setPreference] = useState<AppearancePreference | null>(null);

  useEffect(() => {
    setPreference(storedPreference());
  }, []);

  function choose(next: AppearancePreference) {
    setPreference(next);
    try {
      if (next === "system") {
        window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
      } else {
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
      }
    } catch {
      // Storage can be blocked; the choice still applies to this page view.
    }
    paint(next);
  }

  return (
    <div className="appearance-switch" role="group" aria-label="Appearance">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className={preference === value ? "is-active" : undefined}
          aria-pressed={preference === value}
          aria-label={`${label} appearance`}
          title={`${label} appearance`}
          onClick={() => choose(value)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}