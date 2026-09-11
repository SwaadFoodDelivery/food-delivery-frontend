const { expect } = require('@playwright/test')

async function installSession(page, { accessToken, userId, deviceId = 'e2e-demo-device' }) {
  // Auth bootstrap only: all order interactions still go through the UI.
  await page.addInitScript(({ accessToken, userId, deviceId }) => {
    sessionStorage.setItem('fd.access_token', JSON.stringify(accessToken))
    sessionStorage.setItem('fd.user', JSON.stringify({ user_id: userId, role: 'client', first_time_user: false }))
    localStorage.setItem('fd.device_id', JSON.stringify(deviceId))
  }, { accessToken, userId, deviceId })
}

async function browseToCheckout(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Browse Shamgarh kitchens' }).click()
  await expect(page.getByRole('heading', { name: 'Fictional kitchens of Shamgarh' })).toBeVisible()
  // Until cards have accessible names, anchor this single container to its title.
  await page.locator('.restaurant-card').filter({ hasText: 'Kesar Thali Ghar' })
    .getByRole('button', { name: 'View menu', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kesar Thali Ghar' })).toBeVisible()
  await page.getByRole('article').filter({ hasText: 'Kesar Special Thali' })
    .getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review cart', exact: true })).toBeVisible()
  const addresses = responseFor(page, '/users/me/addresses', 'GET')
  await page.getByRole('button', { name: 'Review cart', exact: true }).click()
  await dataFrom(addresses)
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible()
  await expect(page.getByText('1 × Kesar Special Thali', { exact: true })).toBeVisible()
  await expect(page.getByText('Calculating delivery for this address…')).toBeHidden()
}

async function addAddress(page, line1 = 'E2E demo delivery address') {
  const street = page.getByRole('textbox', { name: 'House / street' })
  if (!await street.isVisible()) await page.getByRole('button', { name: '+ Add another address', exact: true }).click()
  await street.fill(line1)
  await page.getByRole('textbox', { name: 'Area', exact: true }).fill('Demo Market')
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Shamgarh')
  await page.getByRole('textbox', { name: 'Pincode', exact: true }).fill('458883')
  await page.getByRole('button', { name: 'Save address', exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: line1 })).toBeVisible()
}

function responseFor(page, path, method = 'POST') {
  return page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1${path}` && response.request().method() === method)
}

async function dataFrom(responsePromise) {
  const response = await responsePromise
  expect(response.ok(), `${response.request().method()} ${new URL(response.url()).pathname}: HTTP ${response.status()}`).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe('success')
  return body.data
}

module.exports = { installSession, browseToCheckout, addAddress, responseFor, dataFrom }
