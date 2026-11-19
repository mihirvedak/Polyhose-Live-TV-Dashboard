import { expect, test } from '@playwright/test';
import { collectConsoleErrors, waitForMachine } from './helpers';

test.describe('control bar', () => {
  test('hidden when idle, shows on movement, hides 3 s later, stays while hovered, hides on window leave', async ({ page }) => {
    await page.goto('/tv?profile=braider-hall');
    await waitForMachine(page);
    const bar = page.locator('.control-bar');
    const root = page.locator('.tv-root');

    await expect(bar).not.toHaveClass(/is-visible/);
    await expect(root).toHaveClass(/is-idle/); // cursor: none

    await page.mouse.move(400, 400);
    await page.mouse.move(420, 420);
    await expect(bar).toHaveClass(/is-visible/);
    await expect(root).not.toHaveClass(/is-idle/);
    await page.waitForTimeout(3300);
    await expect(bar).not.toHaveClass(/is-visible/);

    // Hover keeps it visible
    await page.mouse.move(500, 500);
    const box = (await bar.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(4000);
    await expect(bar).toHaveClass(/is-visible/);

    // Leaving the bar restarts the 3 s timer
    await page.mouse.move(300, 300, { steps: 2 });
    await page.waitForTimeout(1500);
    await expect(bar).toHaveClass(/is-visible/);
    await page.waitForTimeout(2000);
    await expect(bar).not.toHaveClass(/is-visible/);

    // Pointer leaves the window: hide immediately
    await page.mouse.move(320, 320);
    await expect(bar).toHaveClass(/is-visible/);
    await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: null })));
    await expect(bar).not.toHaveClass(/is-visible/, { timeout: 300 });
  });

  test('clicking a button does not keep the bar visible through focus', async ({ page }) => {
    await page.goto('/tv?profile=braider-hall');
    await waitForMachine(page);
    await page.mouse.move(400, 400);
    await page.getByRole('button', { name: 'Next machine' }).click();
    await page.mouse.move(300, 300);
    await page.waitForTimeout(3300);
    await expect(page.locator('.control-bar')).not.toHaveClass(/is-visible/);
    await expect(page.locator('.control-bar')).toHaveCSS('opacity', '0');
  });
});

test('keyboard: arrows step, Space pauses (progress frozen), Esc stops on first machine, S opens settings', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/tv?profile=braider-hall');
  await waitForMachine(page, 'Braiding_B21');
  const name = page.locator('.tv-machine-name');
  const status = page.locator('.cb-status');

  await page.keyboard.press('ArrowRight');
  await expect(name).toHaveText('Braiding_B22');
  await page.keyboard.press('ArrowLeft');
  await expect(name).toHaveText('Braiding_B21');

  await page.keyboard.press(' ');
  await expect(status).toContainText('Paused');
  const fill = page.locator('.tv-footer-progress .progress-fill');
  const w1 = await fill.evaluate((el) => el.style.width);
  await page.waitForTimeout(1200);
  expect(await fill.evaluate((el) => el.style.width)).toBe(w1);
  await page.waitForTimeout(5000); // longer than 5 s per machine: still paused on the same machine
  await expect(name).toHaveText('Braiding_B21');

  await page.keyboard.press(' ');
  await expect(status).not.toContainText('Paused');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(status).toContainText('Stopped');
  await expect(name).toHaveText('Braiding_B21');
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveClass(/is-stopped/);

  await page.keyboard.press('s');
  await expect(page).toHaveURL(/\/tv\/settings/);
  expect(errors).toEqual([]);
});

test('rotation advances automatically after the time on each machine', async ({ page }) => {
  await page.goto('/tv?profile=braider-hall');
  await waitForMachine(page, 'Braiding_B21');
  await expect(page.locator('.tv-machine-name')).toHaveText('Braiding_B22', { timeout: 7000 });
});

test('kiosk: context menu and selection are blocked', async ({ page }) => {
  await page.goto('/tv?profile=braider-hall');
  await waitForMachine(page);
  const blocked = await page.evaluate(() =>
    ['contextmenu', 'selectstart', 'dragstart', 'dblclick'].map((type) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      document.querySelector('.tv-machine-name')!.dispatchEvent(ev);
      return ev.defaultPrevented;
    }),
  );
  expect(blocked).toEqual([true, true, true, true]);
  await expect(page.locator('body')).toHaveCSS('user-select', 'none');
});

test.describe('settings', () => {
  test('hiding a section and changing time applies immediately; the rest reflow', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/tv?profile=braider-hall');
    await waitForMachine(page, 'Braiding_B21');
    await page.keyboard.press('s');

    await page.locator('.sec-row', { hasText: 'Downtime this shift' }).getByRole('checkbox').uncheck();
    await expect(page.locator('.sec-preview .layout-thumb-cell')).toHaveCount(5);
    await page.getByRole('button', { name: '10 s' }).click();
    await page.getByRole('button', { name: 'Save & apply' }).click();

    await expect(page).toHaveURL(/\/tv\?profile=braider-hall$/);
    await waitForMachine(page);
    await expect(page.locator('.area-downtime')).toHaveCount(0);
    const [timelineW, bodyW] = await page.evaluate(() => [
      document.querySelector('.area-timeline')!.getBoundingClientRect().width,
      document.querySelector('.tv-body')!.getBoundingClientRect().width,
    ]);
    expect(timelineW).toBeGreaterThan(bodyW - 80); // full row, no hole
    await page.mouse.move(500, 500);
    await expect(page.locator('.cb-status')).toContainText('10 s each');

    // Persisted per profile
    await page.reload();
    await waitForMachine(page);
    await expect(page.locator('.area-downtime')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('cannot uncheck the last section; time input validates 5–300 s', async ({ page }) => {
    await page.goto('/tv/settings?profile=braider-hall');
    const rows = page.locator('.sec-row');
    await expect(rows).toHaveCount(6);
    for (const label of ['OEE by period', 'Current PIR', 'Live process parameters', 'Last PIR', 'Shift timeline']) {
      await rows.filter({ hasText: label }).getByRole('checkbox').uncheck();
    }
    await expect(rows.filter({ hasText: 'Downtime this shift' }).getByRole('checkbox')).toBeDisabled();

    const input = page.locator('.pb-input input');
    await input.fill('3');
    await expect(page.locator('#seconds-hint')).toHaveText('Minimum 5 s');
    await expect(page.getByRole('button', { name: 'Save & apply' })).toBeDisabled();
    await input.fill('301');
    await expect(page.locator('#seconds-hint')).toHaveText('Maximum 300 s');
    await input.fill('45');
    await expect(page.getByRole('button', { name: 'Save & apply' })).toBeEnabled();
  });

  test('one machine disables Back/Forward; zero machines shows the empty state', async ({ page }) => {
    await page.goto('/tv/settings?profile=braider-hall');
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.set-counter')).toContainText('0 of 34');
    await page.locator('.set-row', { hasText: 'Braiding_B22' }).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Save & apply' }).click();
    await waitForMachine(page, 'Braiding_B22');
    await page.mouse.move(500, 500);
    await expect(page.getByRole('button', { name: 'Next machine' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous machine' })).toBeDisabled();

    await page.keyboard.press('s');
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('button', { name: 'Save & apply' }).click();
    await expect(page.locator('.tv-empty-title')).toHaveText('No machines selected for this TV');
  });

  test('select by stage group checkbox', async ({ page }) => {
    await page.goto('/tv/settings?profile=braider-hall');
    const cover = page.locator('.set-group-head', { hasText: 'Cover' });
    await cover.getByRole('checkbox').check();
    await expect(cover).toContainText('5 of 5');
    await expect(page.locator('.set-counter')).toContainText('16 of 34');
  });
});

test.describe('full screen', () => {
  const isFull = (page: import('@playwright/test').Page) => page.evaluate(() => !!document.fullscreenElement);

  test('control bar button and F key toggle full screen', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/tv?profile=braider-hall');
    await waitForMachine(page);
    await page.mouse.move(400, 400);
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect.poll(() => isFull(page)).toBe(true);
    await page.mouse.move(420, 420);
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();

    await page.keyboard.press('f');
    await expect.poll(() => isFull(page)).toBe(false);
    await page.keyboard.press('f');
    await expect.poll(() => isFull(page)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('enters on the first click when the setting is on, and the setting can turn it off', async ({ page }) => {
    await page.goto('/tv?profile=braider-hall');
    await waitForMachine(page);
    await page.mouse.click(300, 300);
    await expect.poll(() => isFull(page)).toBe(true);
    // Leaving on purpose keeps it off for this visit
    await page.keyboard.press('f');
    await expect.poll(() => isFull(page)).toBe(false);
    await page.mouse.click(300, 300);
    await page.waitForTimeout(300);
    expect(await isFull(page)).toBe(false);

    await page.goto('/tv/settings?profile=braider-hall');
    await page.getByRole('switch', { name: 'Full screen on first touch' }).click();
    await page.getByRole('button', { name: 'Save & apply' }).click();
    await waitForMachine(page);
    await page.mouse.click(300, 300);
    await page.waitForTimeout(300);
    expect(await isFull(page)).toBe(false);
  });
});
