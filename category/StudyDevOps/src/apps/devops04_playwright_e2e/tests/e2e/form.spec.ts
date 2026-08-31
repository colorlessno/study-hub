import { expect, test } from '@playwright/test'

test('submits form', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('name-input').fill('StudyDevOps')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('result-message')).toHaveText('Hello StudyDevOps')
})

test('shows validation message', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('result-message')).toHaveText('Name is required')
})
