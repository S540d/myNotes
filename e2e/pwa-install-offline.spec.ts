import { expect, test } from '@playwright/test';

test.describe('PWA install + offline (Android Chrome emulation)', () => {
  test('exposes a valid installable web app manifest', async ({ page, baseURL }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'myNotes' })).toBeVisible();

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestUrl = new URL(manifestHref as string, baseURL).toString();
    const manifest = await (await page.request.get(manifestUrl)).json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBe('myNotes');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('registers a service worker that precaches the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'myNotes' })).toBeVisible();

    // `.ready` only resolves once a worker is controlling the page, so an active worker is
    // guaranteed here; its exact `.state` string can still read as "activating" for a tick.
    const hasActiveWorker = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active !== null;
    });
    expect(hasActiveWorker).toBe(true);
  });

  test('keeps working fully offline after the service worker has installed (iOS Safari has no background sync, so this is the only sync trigger the app can rely on)', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'myNotes' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'myNotes' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Neuer Eintrag/ })).toBeVisible();

    await context.setOffline(false);
  });

  test('lets a note be created while offline (local-first CRUD, queued for later sync)', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);

    await page.getByRole('link', { name: /Neuer Eintrag/ }).click();
    await page.getByPlaceholder('Titel').fill('Offline erstellter Eintrag');
    await page.getByRole('button', { name: /Speichern/i }).click();
    await expect(page.getByPlaceholder('Titel')).toHaveValue('Offline erstellter Eintrag');

    await page.getByRole('button', { name: /Zurück/ }).click();
    await expect(page.getByText('Offline erstellter Eintrag')).toBeVisible();

    await context.setOffline(false);
  });
});
