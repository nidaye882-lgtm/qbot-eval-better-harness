import assert from "node:assert/strict";
import vm from "node:vm";

import { test } from "vitest";

import {
  resolveTheme,
  storedThemePreference,
  THEME_STORAGE_KEY,
  themeBootstrapScript,
} from "../lib/theme.ts";

function runBootstrap({ stored = null, systemDark = false } = {}) {
  const listeners = [];
  const media = {
    matches: systemDark,
    addEventListener: (_type, listener) => listeners.push(listener),
  };
  const store = new Map();
  if (stored !== null) store.set(THEME_STORAGE_KEY, stored);
  const dataset = {};
  const sandbox = {
    window: { matchMedia: () => media },
    document: { documentElement: { dataset } },
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  };
  vm.runInNewContext(themeBootstrapScript(), sandbox);
  return {
    theme: () => dataset.theme,
    store,
    setSystemDark(next) {
      media.matches = next;
      for (const listener of listeners) listener();
    },
  };
}

test("resolves the system preference and keeps an explicit choice", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("treats only light and dark as stored preferences", () => {
  assert.equal(storedThemePreference("dark"), "dark");
  assert.equal(storedThemePreference("light"), "light");
  assert.equal(storedThemePreference("system"), "system");
  assert.equal(storedThemePreference(null), "system");
  assert.equal(storedThemePreference("sepia"), "system");
});

test("bootstrap paints the system preference when nothing is stored", () => {
  assert.equal(runBootstrap({ systemDark: false }).theme(), "light");
  assert.equal(runBootstrap({ systemDark: true }).theme(), "dark");
});

test("bootstrap paints a stored choice instead of the host preference", () => {
  assert.equal(runBootstrap({ stored: "light", systemDark: true }).theme(), "light");
  assert.equal(runBootstrap({ stored: "dark", systemDark: false }).theme(), "dark");
});

test("bootstrap follows host changes only while the choice is system", () => {
  const follows = runBootstrap({ systemDark: false });
  follows.setSystemDark(true);
  assert.equal(follows.theme(), "dark");

  const pinned = runBootstrap({ stored: "light", systemDark: false });
  pinned.setSystemDark(true);
  assert.equal(pinned.theme(), "light");

  pinned.store.delete(THEME_STORAGE_KEY);
  pinned.setSystemDark(false);
  assert.equal(pinned.theme(), "light");
  pinned.setSystemDark(true);
  assert.equal(pinned.theme(), "dark");
});
