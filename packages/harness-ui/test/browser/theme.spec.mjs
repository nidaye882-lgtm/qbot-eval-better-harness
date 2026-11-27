import { expect, test } from "@playwright/test";

test("appearance follows the system preference until the reader chooses", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const root = page.locator("html");
  await expect(page.getByRole("group", { name: "Appearance" })).toBeVisible();
  await expect(root).toHaveAttribute("data-theme", "light");

  const lightSurface = await page.locator(".card").first().evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark appearance" })).toHaveAttribute("aria-pressed", "true");
  const darkSurface = await page.locator(".card").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(darkSurface).not.toBe(lightSurface);

  // The choice survives a reload, and the first paint already uses it.
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark appearance" })).toHaveAttribute("aria-pressed", "true");

  // Choosing the system preference follows a host change while running.
  await page.getByRole("button", { name: "System appearance" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-theme", "dark");

  // An explicit choice outranks the host.
  await page.getByRole("button", { name: "Light appearance" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-theme", "light");

  expect(errors).toEqual([]);
});
