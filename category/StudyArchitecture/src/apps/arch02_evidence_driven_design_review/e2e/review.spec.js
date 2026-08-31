import { expect, test } from '@playwright/test';

test('画面、API、SQLite、ログ、ヘルスの証拠を取得する', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('タスク名').fill('Playwrightで証拠を取得');
  await page.getByRole('button', { name: 'タスク登録APIを実行' }).click();
  await expect(page.locator('#api-evidence')).toContainText('"statusCode": 202');
  await expect(page.locator('#tasks')).toContainText('Playwrightで証拠を取得');

  await page.getByRole('button', { name: 'health / readyを取得' }).click();
  await expect(page.locator('#runtime-evidence')).toContainText('"status": "ready"');

  await page.getByRole('button', { name: '実行ログを取得' }).click();
  await expect(page.locator('#runtime-evidence')).toContainText('"statusCode": 202');

  await page.getByLabel('対応状態').selectOption({ label: 'リスク受容' });
  await page.getByRole('button', { name: 'レビュー結果をSQLiteへ保存' }).click();
  await expect(page.getByRole('status')).toContainText('保存しました。Trace ID:');
  await expect(page.locator('#reviews')).toContainText('期待201に対して実際は202');
  await expect(page.locator('#reviews')).toContainText('リスク受容');
  await page.screenshot({ path: 'test-results/arch02-evidence.png', fullPage: true });
});
