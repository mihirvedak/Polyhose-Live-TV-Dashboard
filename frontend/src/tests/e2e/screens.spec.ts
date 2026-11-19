import { expect, test } from '@playwright/test';
import { collectConsoleErrors, freezeClock, goToMachine, overflowingBlocks, waitForMachine } from './helpers';

const SHOTS = 'screenshots';

test.describe('machine screen layout', () => {
  test('day theme at 1920 × 1080: all six blocks, no overflow, no console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await freezeClock(page, '2026-11-17T09:42:00');
    await page.goto('/tv?profile=braider-hall');
    await goToMachine(page, 'Braiding_B27');

    await expect(page.locator('.sample-badge')).toHaveText(/sample data/i);
    for (const area of ['oee', 'currentPir', 'params', 'lastPir', 'timeline', 'downtime']) {
      await expect(page.locator(`.area-${area}`)).toBeVisible();
    }
    await expect(page.locator('.tv-root')).toHaveAttribute('data-theme', 'day');
    // B27 wire tension drifts above its limit in the mock
    await expect(page.locator('.param-tile.state-high')).toHaveCount(1);
    expect(await overflowingBlocks(page)).toEqual([]);
    const scroll = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    expect(scroll).toEqual({ w: 1920, h: 1080 });

    await page.mouse.move(960, 600);
    await expect(page.locator('.control-bar')).toHaveClass(/is-visible/);
    await page.screenshot({ path: `${SHOTS}/tv-day-1920.png` });
    expect(errors).toEqual([]);
  });

  test('night theme', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await freezeClock(page, '2026-11-17T21:10:00');
    await page.goto('/tv?profile=braider-hall');
    await goToMachine(page, 'Braiding_B27');
    await expect(page.locator('.tv-root')).toHaveAttribute('data-theme', 'night');
    expect(await overflowingBlocks(page)).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/tv-night-1920.png` });
    expect(errors).toEqual([]);
  });

  test('1366 × 768 scales the stage without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await freezeClock(page, '2026-11-17T09:42:00');
    await page.goto('/tv?profile=braider-hall');
    await goToMachine(page, 'Braiding_B23');
    expect(await overflowingBlocks(page)).toEqual([]);
    const scroll = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    expect(scroll).toEqual({ w: 1366, h: 768 });
    await page.screenshot({ path: `${SHOTS}/tv-down-1366.png` });
  });

  test('edge states render: no signal, plan missing, changeover', async ({ page }) => {
    await freezeClock(page, '2026-11-17T09:42:00');
    await page.goto('/tv?profile=plant-entrance');
    await waitForMachine(page);
    await page.evaluate(() => {
      // Show no-signal machines for this check
      const key = 'polyhose.tv.mockBackend.profiles';
      const all = JSON.parse(localStorage.getItem(key) ?? '[]');
      for (const p of all) p.skipNoSignal = false;
      localStorage.setItem(key, JSON.stringify(all));
    });
    await page.reload();

    await goToMachine(page, 'Liner_L2');
    await expect(page.locator('.pir-block')).toContainText('Plan missing');

    await goToMachine(page, 'Braiding_B26');
    await expect(page.locator('.status-pill-lg')).toContainText('Die/Pin Changeover');
    await expect(page.locator('.pir-block')).toContainText('Stopped');
    await expect(page.locator('.param-tile .chip-stopped').first()).toBeVisible();

    await goToMachine(page, 'Braiding_B29');
    await expect(page.locator('.status-pill-lg')).toHaveText('No signal');
    await expect(page.locator('.pir-block')).toContainText('No PIR running · no signal since');
    await expect(page.locator('.oee-table tr.is-current .oee-main')).toHaveText('—');
    await page.screenshot({ path: `${SHOTS}/tv-nosignal-1920.png` });
  });
});

test('settings screen', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/tv/settings?profile=braider-hall');
  await expect(page.getByRole('heading', { name: 'TV settings' })).toBeVisible();
  await expect(page.locator('.set-counter')).toContainText('of 34 selected');
  // Open B23's per-machine panel, as in the reference
  await page.locator('.set-row', { hasText: 'Braiding_B23' }).locator('.set-chip').click();
  await expect(page.locator('.set-row-panel')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/settings-1920.png`, fullPage: true });
  expect(errors).toEqual([]);
});
