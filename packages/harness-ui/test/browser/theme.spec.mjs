import { expect, test } from "@playwright/test";

async function background(page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe("system dark preference", () => {
  test.use({ colorScheme: "dark" });

  test("the header toggle switches, persists, and follows the system until a choice is stored", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.addInitScript(() => {
      if (sessionStorage.getItem("theme-test-ready")) return;
      localStorage.removeItem("harness-dashboard-theme");
      sessionStorage.setItem("theme-test-ready", "1");
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const toggle = page.locator(".page-header").getByRole("button", { name: "Dark mode. Switch to light mode." });
    await expect(toggle).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
    await expect(page.locator(".stat-card, .card").first()).toHaveCSS("background-color", "rgb(23, 23, 23)");

    await page.getByLabel("Project").focus();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    expect(await toggle.evaluate((element) => getComputedStyle(element).outlineWidth)).not.toBe("0px");
    await page.keyboard.press("Enter");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => background(page)).toBe("rgb(250, 250, 250)");
    await expect(page.locator(".stat-card, .card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".page-header").getByRole("button", { name: "Light mode. Switch to dark mode." })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("harness-dashboard-theme"))).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => background(page)).toBe("rgb(250, 250, 250)");

    await page.evaluate(() => localStorage.removeItem("harness-dashboard-theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => background(page)).toBe("rgb(250, 250, 250)");

    await page.setViewportSize({ width: 390, height: 844 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
    await expect(page.locator(".page-header").getByRole("button", { name: /mode/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("system light preference", () => {
  test.use({ colorScheme: "light" });

  test("starts in light mode and keeps an explicit dark choice", async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("theme-test-ready")) return;
      localStorage.removeItem("harness-dashboard-theme");
      sessionStorage.setItem("theme-test-ready", "1");
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(() => background(page)).toBe("rgb(250, 250, 250)");

    await page.locator(".page-header").getByRole("button", { name: "Light mode. Switch to dark mode." }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
  });
});
