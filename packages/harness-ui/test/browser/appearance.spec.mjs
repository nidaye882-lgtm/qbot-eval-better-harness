import { expect, test } from "@playwright/test";

const STORAGE_KEY = "better-harness.dashboard.appearance";

test("appearance switch persists, survives reload, and follows the host", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const root = page.locator("html");
  await expect(page.getByRole("group", { name: "Appearance" })).toBeVisible();
  await expect(root).toHaveAttribute("data-appearance", "light");
  const lightSurface = await page.locator(".card").first().evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(root).toHaveAttribute("data-appearance", "dark");
  await expect(page.getByRole("button", { name: "Dark appearance" })).toHaveAttribute("aria-pressed", "true");
  const darkSurface = await page.locator(".card").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(darkSurface).not.toBe(lightSurface);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe("dark");

  await page.reload();
  await expect(root).toHaveAttribute("data-appearance", "dark");
  await expect(page.getByRole("button", { name: "Dark appearance" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "System appearance" }).click();
  await expect(root).toHaveAttribute("data-appearance", "light");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-appearance", "dark");

  await page.getByRole("button", { name: "Light appearance" }).click();
  await expect(root).toHaveAttribute("data-appearance", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-appearance", "light");

  expect(errors).toEqual([]);
});

test("narrow layout keeps the switch clickable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-appearance", "dark");
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});