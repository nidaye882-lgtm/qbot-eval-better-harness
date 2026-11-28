import assert from "node:assert/strict";
import vm from "node:vm";

import { test } from "vitest";

import { DASHBOARD_THEME_STORAGE_KEY, dashboardThemeBootScript, resolveDashboardTheme } from "../lib/theme";

test("an explicit dashboard theme outranks the system appearance", () => {
  assert.equal(resolveDashboardTheme("dark", false), "dark");
  assert.equal(resolveDashboardTheme("light", true), "light");
});

test("without a stored choice the dashboard follows the system and stays light by default", () => {
  assert.equal(resolveDashboardTheme(null, true), "dark");
  assert.equal(resolveDashboardTheme(null, false), "light");
  assert.equal(resolveDashboardTheme("system", true), "dark");
});

test("the boot script applies the stored theme without writing it back", () => {
  const written: string[] = [];
  const root = { theme: "light", scheme: "" };
  const context = {
    localStorage: {
      getItem: (key: string) => {
        assert.equal(key, DASHBOARD_THEME_STORAGE_KEY);
        return "dark";
      },
      setItem: (key: string) => written.push(key),
    },
    window: { matchMedia: () => ({ matches: false }) },
    document: {
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          root.theme = value;
        },
        style: {
          set colorScheme(value: string) {
            root.scheme = value;
          },
        },
      },
    },
  };
  vm.runInNewContext(dashboardThemeBootScript(), context);
  assert.equal(root.theme, "dark");
  assert.equal(root.scheme, "dark");
  assert.deepEqual(written, []);
});

test("the boot script follows a dark system theme when nothing is stored", () => {
  const root = { theme: "light" };
  vm.runInNewContext(dashboardThemeBootScript(), {
    localStorage: { getItem: () => null },
    window: { matchMedia: (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" }) },
    document: {
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          root.theme = value;
        },
        style: {},
      },
    },
  });
  assert.equal(root.theme, "dark");
});

test("the boot script follows a later system change until a choice is stored", () => {
  let theme = "light";
  let matches = false;
  const holder: { listener: (() => void) | null } = { listener: null };
  const storage = new Map<string, string>();
  const media = {
    get matches() {
      return matches;
    },
    addEventListener(_type: string, callback: () => void) {
      holder.listener = callback;
    },
  };
  vm.runInNewContext(dashboardThemeBootScript(), {
    localStorage: {
      getItem: (key: string) => {
        assert.equal(key, DASHBOARD_THEME_STORAGE_KEY);
        return storage.get(key) ?? null;
      },
    },
    window: { matchMedia: () => media },
    document: {
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          theme = value;
        },
        style: {},
      },
    },
  });
  assert.equal(theme, "light");
  assert.equal(typeof holder.listener, "function");
  matches = true;
  holder.listener?.();
  assert.equal(theme, "dark");
  storage.set(DASHBOARD_THEME_STORAGE_KEY, "dark");
  matches = false;
  holder.listener?.();
  assert.equal(theme, "dark");
});

test("the boot script follows the system when storage is blocked", () => {
  const root = { theme: "light" };
  vm.runInNewContext(dashboardThemeBootScript(), {
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
    },
    window: {
      matchMedia: () => ({
        matches: true,
        addEventListener() {},
      }),
    },
    document: {
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          root.theme = value;
        },
        style: {},
      },
    },
  });
  assert.equal(root.theme, "dark");
});

test("the boot script leaves the server theme when both storage and media queries fail", () => {
  const root = { theme: "light" };
  vm.runInNewContext(dashboardThemeBootScript(), {
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
    },
    window: {
      matchMedia: () => {
        throw new Error("unavailable");
      },
    },
    document: {
      documentElement: {
        setAttribute: (_name: string, value: string) => {
          root.theme = value;
        },
        style: {},
      },
    },
  });
  assert.equal(root.theme, "light");
});
