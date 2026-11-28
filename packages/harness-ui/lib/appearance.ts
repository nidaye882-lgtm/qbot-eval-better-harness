export type AppearancePreference = "system" | "light" | "dark";
export type ResolvedAppearance = "light" | "dark";

/** Explicit choices only; "system" is represented by the key being absent. */
export const APPEARANCE_STORAGE_KEY = "better-harness.dashboard.appearance";

export function normalizeAppearance(value: string | null): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveAppearance(
  preference: AppearancePreference,
  prefersDark: boolean,
): ResolvedAppearance {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/**
 * Runs inline before the Dashboard markup paints, so a stored or host dark
 * preference never flashes light first. It re-checks storage on host changes,
 * which means an explicit choice made later still outranks the host.
 */
export const APPEARANCE_BOOTSTRAP = `(function () {
  try {
    var key = ${JSON.stringify(APPEARANCE_STORAGE_KEY)};
    var host = window.matchMedia("(prefers-color-scheme: dark)");
    function preference() {
      try {
        var stored = window.localStorage.getItem(key);
        return stored === "light" || stored === "dark" ? stored : "system";
      } catch (error) {
        return "system";
      }
    }
    function paint() {
      var current = preference();
      document.documentElement.dataset.appearance = current === "system"
        ? (host.matches ? "dark" : "light")
        : current;
    }
    paint();
    function follow() {
      if (preference() === "system") paint();
    }
    if (typeof host.addEventListener === "function") host.addEventListener("change", follow);
    else if (typeof host.addListener === "function") host.addListener(follow);
  } catch (error) {}
})();`;