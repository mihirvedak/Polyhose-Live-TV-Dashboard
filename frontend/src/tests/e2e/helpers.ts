import { expect, type Page } from '@playwright/test';

/** Local time on the test machine, e.g. "2026-11-17T09:42:00" */
export async function freezeClock(page: Page, localIso: string): Promise<void> {
  await page.clock.setFixedTime(new Date(localIso));
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

export async function waitForMachine(page: Page, name?: string): Promise<void> {
  const header = page.locator('.tv-machine-name');
  if (name) await expect(header).toHaveText(name);
  else await expect(header).toBeVisible();
  // Live + detail data rendered (status pill comes from live, OEE from detail)
  await expect(page.locator('.status-pill-lg')).toBeVisible();
  await expect(page.locator('.block-empty', { hasText: 'Loading' })).toHaveCount(0);
}

/** Step the rotation with the keyboard until `name` is on screen. */
export async function goToMachine(page: Page, name: string): Promise<void> {
  const header = page.locator('.tv-machine-name');
  await expect(header).toBeVisible();
  for (let i = 0; i < 40; i++) {
    const current = await header.textContent();
    if (current === name) break;
    await page.keyboard.press('ArrowRight');
    await expect(header).not.toHaveText(current ?? '');
  }
  await waitForMachine(page, name);
}

/** Every block's content fits inside it (nothing clipped). */
export async function overflowingBlocks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.block, .param-tile, .stage-card, .tv-header, .tv-footer')]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${el.className} (${el.scrollWidth}×${el.scrollHeight} > ${el.clientWidth}×${el.clientHeight})`),
  );
}
