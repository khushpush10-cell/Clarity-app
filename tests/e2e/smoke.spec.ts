import { expect, test } from '@playwright/test';

test('landing page renders clarity title', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Task manager and routines' })).toBeVisible();
});
