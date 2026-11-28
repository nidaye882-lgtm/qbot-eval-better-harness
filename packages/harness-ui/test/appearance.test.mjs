import assert from "node:assert/strict";
import vm from "node:vm";

import { test } from "vitest";

import {
  APPEARANCE_BOOTSTRAP,
  APPEARANCE_STORAGE_KEY,
  normalizeAppearance,
  resolveAppearance,
} from "../lib/appearance.ts";

function runBootstrap({ stored = null, hostDark = false, storageThrows = false } = {}) {
  const listeners = [];
  const host = {
    matches: hostDark,
    addEventListener: (_type, listener) => listeners.push(listener),
  };
  const values = new Map();
  if (stored !== null) values.set(APPEARANCE_STORAGE_KEY, stored);
  const storage = {
    getItem(key) {
      if (storageThrows) throw new Error("storage blocked");
      return values.get(key) ?? null;
    },
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const dataset = {};
  const sandbox = {
    window: { matchMedia: () => host, localStorage: storage },
    document: { documentElement: { dataset } },
  };
  vm.runInNewContext(APPEARANCE_BOOTSTRAP, sandbox);
  return {
    appearance: () => dataset.appearance,
    setHostDark(next) {
      host.matches = next;
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.length,
  };
}

test("resolves the host preference and keeps explicit choices", () => {
  assert.equal(resolveAppearance("system", true), "dark");
  assert.equal(resolveAppearance("system", false), "light");
  assert.equal(resolveAppearance("dark", false), "dark");
  assert.equal(resolveAppearance("light", true), "light");
});

test("accepts only light and dark as stored values", () => {
  assert.equal(normalizeAppearance("dark"), "dark");
  assert.equal(normalizeAppearance("light"), "light");
  assert.equal(normalizeAppearance("system"), "system");
  assert.equal(normalizeAppearance(null), "system");
  assert.equal(normalizeAppearance("sepia"), "system");
});

test("bootstrap paints the host preference when nothing is stored", () => {
  assert.equal(runBootstrap({ hostDark: false }).appearance(), "light");
  assert.equal(runBootstrap({ hostDark: true }).appearance(), "dark");
});

test("bootstrap paints a stored choice instead of the host preference", () => {
  assert.equal(runBootstrap({ stored: "light", hostDark: true }).appearance(), "light");
  assert.equal(runBootstrap({ stored: "dark", hostDark: false }).appearance(), "dark");
});

test("bootstrap follows host changes only while the choice is system", () => {
  const following = runBootstrap({ hostDark: false });
  assert.equal(following.listenerCount(), 1);
  following.setHostDark(true);
  assert.equal(following.appearance(), "dark");

  const pinned = runBootstrap({ stored: "light", hostDark: false });
  pinned.setHostDark(true);
  assert.equal(pinned.appearance(), "light");
});

test("bootstrap falls back to the host preference when storage is blocked", () => {
  assert.equal(runBootstrap({ storageThrows: true, hostDark: true }).appearance(), "dark");
  assert.equal(runBootstrap({ storageThrows: true, hostDark: false }).appearance(), "light");
});