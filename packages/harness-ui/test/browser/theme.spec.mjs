import { expect, test } from "@playwright/test";

const storageKey = "better-harness-dashboard-theme";

test("switches the dashboard between light and dark and keeps the choice", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Switch color theme" });
  await expect(toggle).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle.locator(".theme-label-for-light")).toBeVisible();
  await expect(toggle.locator(".theme-label-for-dark")).toBeHidden();

  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const lightCard = await page.evaluate(() => getComputedStyle(document.querySelector(".card")).backgroundColor);
  await toggle.focus();
  const outlineWidth = await toggle.evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(outlineWidth).not.toBe("0px");
  await page.keyboard.press("Enter");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle.locator(".theme-label-for-dark")).toBeVisible();
  await expect(toggle.locator(".theme-label-for-light")).toBeHidden();
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkCard = await page.evaluate(() => getComputedStyle(document.querySelector(".card")).backgroundColor);
  expect(darkBackground).not.toBe(lightBackground);
  expect(darkCard).not.toBe(lightCard);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const restored = page.getByRole("button", { name: "Switch color theme" });
  await expect(restored.locator(".theme-label-for-dark")).toBeVisible();
  const restoredBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(restoredBackground).toBe(darkBackground);

  await restored.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightAgain = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightAgain).toBe(lightBackground);
  expect(errors).toEqual([]);
});

test("follows the system theme until the dashboard choice is saved", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();

  const toggle = page.getByRole("button", { name: "Switch color theme" });
  await expect(async () => {
    if (await page.locator("html").getAttribute("data-theme") !== "light") await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  }).toPass();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
});

test("keeps the theme toggle inside a narrow dashboard header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Switch color theme" });
  await expect(toggle).toBeVisible();
  const box = await toggle.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
