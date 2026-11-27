export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** Only an explicit choice is stored; "system" removes the key. */
export const THEME_STORAGE_KEY = "harness-ui-theme";

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function storedThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Runs before hydration so the first paint already matches the stored choice or
 * the system preference. The change listener re-reads storage each time, so an
 * explicit choice made later in the session is not overridden.
 */
export function themeBootstrapScript() {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=window.matchMedia("(prefers-color-scheme: dark)");var p=function(){var v=localStorage.getItem(k);return v==="light"||v==="dark"?v:"system"};var a=function(){var v=p();document.documentElement.dataset.theme=v==="system"?(m.matches?"dark":"light"):v};a();m.addEventListener("change",function(){if(p()==="system")a()})}catch(e){}})();`;
}
