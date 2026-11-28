export const DASHBOARD_THEME_STORAGE_KEY = "better-harness-dashboard-theme";

export type DashboardTheme = "light" | "dark";

/**
 * An explicit stored choice wins. Otherwise follow the host appearance and
 * leave that resolved value unstored, matching the Studio preference rule:
 * writing it back would stop the page from tracking the system.
 */
export function resolveDashboardTheme(stored: string | null, prefersDark: boolean): DashboardTheme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/**
 * Runs from the root layout before first paint. Keep it aligned with
 * `resolveDashboardTheme`: read the same key, and do not write storage.
 */
export function dashboardThemeBootScript(): string {
  const key = JSON.stringify(DASHBOARD_THEME_STORAGE_KEY);
  return `(function(){var k=${key};function stored(){try{return localStorage.getItem(k);}catch(e){return null;}}function apply(t){var r=document.documentElement;r.setAttribute("data-theme",t);r.style.colorScheme=t;}function resolve(){var s=stored();return s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");}try{apply(resolve());}catch(e){}try{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){if(stored()==="light"||stored()==="dark")return;try{apply(resolve());}catch(e){}});}catch(e){}})();`;
}
