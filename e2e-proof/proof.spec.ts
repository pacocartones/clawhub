import { test, expect } from "@playwright/test";

test("clawhub #3440: real-browser proof of the Monaco theme fix", async ({ page }) => {
  await page.goto("/proof.html");
  await page.waitForFunction(
    () => document.getElementById("before-out")?.textContent?.includes("Illegal value for token color"),
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => document.getElementById("after-out")?.textContent?.includes("DiffEditor rendered"),
    { timeout: 30_000 },
  );

  // El ANTES debe reproducir el crash de #3440: setTheme con oklch crudo lanza.
  const beforeText = await page.locator("#before-out").innerText();
  expect(beforeText).toContain("Illegal value for token color");

  // El DESPUÉS debe renderizar el DiffEditor con el tema convertido.
  const afterText = await page.locator("#after-out").innerText();
  expect(afterText).toContain("DiffEditor rendered");
  await expect(page.locator("#diff-host .monaco-diff-editor")).toHaveCount(1);

  await page.screenshot({ path: "e2e-proof/generated/proof-full.png", fullPage: true });
  await page
    .locator("#panel-before")
    .screenshot({ path: "e2e-proof/generated/before-crash.png" });
  await page
    .locator("#panel-after")
    .screenshot({ path: "e2e-proof/generated/after-diff-dark.png" });
});
