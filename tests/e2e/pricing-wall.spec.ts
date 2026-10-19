import { test, expect } from "@playwright/test";

const plans = ["single-score", "starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"];
const prices = ["$2.99", "$7.99", "$49", "$14.99", "$99"];

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(() => localStorage.setItem("scoretransposer_analytics_consent", "denied"));
});

for (const [locale, prefix] of [["en", ""], ["zh-CN", "/zh-cn"], ["zh-TW", "/zh-tw"], ["ja", "/ja"], ["ko", "/ko"], ["fr", "/fr"], ["es", "/es"], ["de", "/de"], ["ru", "/ru"]]) {
  test(`${locale}: home and pricing show the same five concise offers; nav returns to home pricing`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`${prefix || "/"}#pricing`);
    const homeCards = page.locator("#pricing .score-plan-grid > [data-plan]");
    await expect(homeCards).toHaveCount(5);
    expect(await homeCards.evaluateAll(cards => cards.map(card => card.getAttribute("data-plan")))).toEqual(plans);
    const homeCopy = await homeCards.allTextContents();
    const tops = await homeCards.evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    for (let index = 0; index < 5; index++) {
      await expect(homeCards.nth(index)).toBeVisible();
      expect(await homeCards.nth(index).locator("li").count()).toBeGreaterThanOrEqual(3);
      expect(await homeCards.nth(index).locator("li").count()).toBeLessThanOrEqual(6);
      await expect(homeCards.nth(index).locator("a")).toHaveCount(1);
      if (locale === "en" || locale === "zh-CN") {
        await expect(homeCards.nth(index).locator(".score-plan-card__price > p")).toHaveText(prices[index]);
      }
    }

    await page.goto(`${prefix}/pricing`);
    const pricingCards = page.locator("#pricing-plans .score-plan-grid > [data-plan]");
    await expect(pricingCards).toHaveCount(5);
    expect(await pricingCards.allTextContents()).toEqual(homeCopy);
    for (const card of await pricingCards.all()) await expect(card).toBeVisible();
    const navHref = `${prefix || "/"}#pricing`;
    const pricingNav = page.locator('header a[href$="#pricing"]');
    if (!await pricingNav.first().isVisible()) await page.locator('header button[aria-controls="site-shell-primary-navigation"]').click();
    await expect(pricingNav.first()).toBeVisible();
    await expect(page.locator('footer a[href$="#pricing"]').first()).toBeAttached();
    for (const href of await pricingNav.evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) {
      expect(new URL(href).pathname + new URL(href).hash).toBe(navHref);
    }
    await pricingNav.first().click();
    await expect(page).toHaveURL(url => url.pathname === (prefix || "/") && url.hash === "#pricing");
    await expect(page.locator("#pricing .score-plan-grid > [data-plan]")).toHaveCount(5);
  });
}
