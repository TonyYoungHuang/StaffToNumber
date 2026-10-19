import { test, expect } from "@playwright/test";
import { getPricingCardCopy } from "../../apps/www/src/lib/pricing-card-copy";

const plans = ["single-score", "starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"];
const prices = ["$2.99", "$7.99", "$49", "$14.99", "$99"];

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(() => localStorage.setItem("scoretransposer_analytics_consent", "denied"));
});

for (const [locale, prefix] of [["en", ""], ["zh-CN", "/zh-cn"], ["zh-TW", "/zh-tw"], ["ja", "/ja"], ["ko", "/ko"], ["fr", "/fr"], ["es", "/es"], ["de", "/de"], ["ru", "/ru"]] as const) {
  test(`${locale}: home and pricing show the same five detailed offers; nav returns to home pricing`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${prefix || "/"}#pricing`);
    const homeCards = page.locator("#pricing .score-plan-grid > [data-plan]");
    await expect(homeCards).toHaveCount(5);
    expect(await homeCards.evaluateAll(cards => cards.map(card => card.getAttribute("data-plan")))).toEqual(plans);
    const homeCopy = await homeCards.allTextContents();
    const tops = await homeCards.evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    for (let index = 0; index < 5; index++) {
      await expect(homeCards.nth(index)).toBeVisible();
      await expect(homeCards.nth(index).getByRole("listitem")).toHaveCount(index === 0 ? 6 : 9);
      await expect(homeCards.nth(index).locator(".score-plan-card__features--full li")).toHaveCount(index === 0 ? 1 : 5);
      await expect(homeCards.nth(index).locator(".score-plan-card__resource-list--full li")).toHaveCount(index === 0 ? 5 : 4);
      await expect(homeCards.nth(index).locator(".score-plan-card__features--short")).toBeHidden();
      await expect(homeCards.nth(index).locator(".score-plan-card__resource-list--short")).toBeHidden();
      await expect(homeCards.nth(index).locator(".score-plan-card__audience--full")).toBeVisible();
      await expect(homeCards.nth(index).locator(".score-plan-card__audience--short")).toBeHidden();
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

  test(`${locale}: stacked mobile home and pricing use localized 3+2 copy`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const copy = getPricingCardCopy(locale);
    const visibleCopy: string[][] = [];
    for (const [url, section] of [[`${prefix || "/"}#pricing`, "#pricing"], [`${prefix}/pricing`, "#pricing-plans"]]) {
      await page.goto(url);
      const cards = page.locator(`${section} .score-plan-grid > [data-plan]`);
      await expect(cards).toHaveCount(5);
      await cards.first().scrollIntoViewIfNeeded();
      const xs = await cards.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().x)));
      expect(new Set(xs).size).toBe(1);
      for (let index = 0; index < 5; index++) {
        const card = cards.nth(index);
        await expect(card.getByRole("listitem")).toHaveCount(5);
        await expect(card.locator(".score-plan-card__features--short li")).toHaveText([...copy.benefits]);
        await expect(card.locator(".score-plan-card__resource-list--short li")).toHaveCount(2);
        await expect(card.locator(".score-plan-card__features--full")).toBeHidden();
        await expect(card.locator(".score-plan-card__resource-list--full")).toBeHidden();
        await expect(card.locator(".score-plan-card__audience--full")).toBeHidden();
        await expect(card.locator(".score-plan-card__audience--short")).toHaveText(index === 0 ? copy.pass : index < 3 ? copy.starter : copy.pro);
        if (index === 0) {
          await expect(card.locator(".score-plan-card__price > p")).toHaveText("$2.99");
          await expect(card.locator(".score-plan-card__credits strong")).toContainText("10");
          await expect(card.locator(".score-plan-card__resource-list--short li")).toHaveText([copy.passTerms, copy.limits]);
        } else {
          await expect(card.locator(".score-plan-card__credits strong")).toContainText(index < 3 ? "50" : "200");
          await expect(card.locator(".score-plan-card__resource-list--short li").first()).toContainText(index < 3 ? "250" : "500");
          await expect(card.locator(".score-plan-card__resource-list--short li").last()).toHaveText(copy.reset);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Read accessible bullet text directly: offscreen content-visibility can
      // make innerText empty before the homepage section has been painted.
      visibleCopy.push(await cards.getByRole("listitem").allTextContents());
    }
    expect(visibleCopy[0]).toEqual(visibleCopy[1]);
  });
}

test("copy switches with the 620px single-column boundary and back without navigation", async ({ page }) => {
  await page.goto("/#pricing");
  const card = page.locator('#pricing [data-plan="starter-monthly"]');
  for (const width of [1920, 980, 621, 620, 390, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await expect(card.getByRole("listitem")).toHaveCount(width <= 620 ? 5 : 9);
    await expect(card.locator(`.score-plan-card__features--${width <= 620 ? "short" : "full"}`)).toBeVisible();
    await expect(card.locator(`.score-plan-card__features--${width <= 620 ? "full" : "short"}`)).toBeHidden();
  }
});

test("mobile short copy is correct before hydration with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  try {
    const page = await context.newPage();
    for (const prefix of ["", "/zh-cn"]) {
      await page.goto(`${baseURL}${prefix || "/"}#pricing`);
      const cards = page.locator("#pricing .score-plan-grid > [data-plan]");
      await expect(cards).toHaveCount(5);
      for (const card of await cards.all()) {
        await expect(card.getByRole("listitem")).toHaveCount(5);
        await expect(card.locator(".score-plan-card__features--full")).toBeHidden();
        await expect(card.locator(".score-plan-card__features--short")).toBeVisible();
      }
    }
  } finally {
    await context.close();
  }
});
