import assert from "node:assert/strict";
import { createContext, runInContext } from "node:vm";
import { test } from "vitest";

import {
  DASHBOARD_THEME_STORAGE_KEY,
  dashboardThemeBootScript,
  resolveDashboardTheme,
} from "../lib/dashboard-theme.ts";

test("an explicit choice wins and an empty choice follows the system", () => {
  assert.equal(resolveDashboardTheme("dark", false), "dark");
  assert.equal(resolveDashboardTheme("light", true), "light");
  assert.equal(resolveDashboardTheme(null, true), "dark");
  assert.equal(resolveDashboardTheme(undefined, false), "light");
  assert.equal(resolveDashboardTheme("system", true), "dark");
});

test("the boot script applies the same choice before paint", () => {
  function boot({ stored, prefersDark }) {
    const documentElement = {
      theme: "",
      setAttribute(name, value) {
        assert.equal(name, "data-theme");
        this.theme = value;
      },
    };
    const context = createContext({
      localStorage: {
        getItem(key) {
          assert.equal(key, DASHBOARD_THEME_STORAGE_KEY);
          return stored;
        },
      },
      window: { matchMedia: () => ({ matches: prefersDark }) },
      document: { documentElement },
    });
    runInContext(dashboardThemeBootScript(), context);
    return documentElement.theme;
  }

  assert.equal(boot({ stored: "light", prefersDark: true }), "light");
  assert.equal(boot({ stored: null, prefersDark: true }), "dark");
  assert.equal(boot({ stored: null, prefersDark: false }), "light");
});

test("a storage failure leaves the server theme untouched", () => {
  let assigned = false;
  const context = createContext({
    localStorage: {
      getItem() {
        throw new Error("storage blocked");
      },
    },
    window: { matchMedia: () => ({ matches: true }) },
    document: {
      documentElement: {
        setAttribute() {
          assigned = true;
        },
      },
    },
  });
  runInContext(dashboardThemeBootScript(), context);
  assert.equal(assigned, false);
});
