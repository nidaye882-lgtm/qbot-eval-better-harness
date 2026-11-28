export const DASHBOARD_THEME_STORAGE_KEY = "harness-dashboard-theme";

export type DashboardTheme = "light" | "dark";

/**
 * An explicit stored choice wins. Otherwise follow the host color scheme.
 * The boot script below must stay in lockstep with this rule.
 */
export function resolveDashboardTheme(stored: string | null | undefined, prefersDark: boolean): DashboardTheme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

export function readStoredDashboardTheme(storage: Pick<Storage, "getItem"> | null | undefined): DashboardTheme | null {
  try {
    const stored = storage?.getItem(DASHBOARD_THEME_STORAGE_KEY) ?? null;
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Runs from the document head before first paint. Resolves the same way as
 * `resolveDashboardTheme`: a stored light/dark choice, otherwise the system
 * preference. Storage failures leave the server default in place.
 */
export function dashboardThemeBootScript(): string {
  const key = JSON.stringify(DASHBOARD_THEME_STORAGE_KEY);
  return `(function(){try{var stored=localStorage.getItem(${key});var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=(stored==="light"||stored==="dark")?stored:(prefersDark?"dark":"light");document.documentElement.setAttribute("data-theme",theme);}catch(e){}})();`;
}
