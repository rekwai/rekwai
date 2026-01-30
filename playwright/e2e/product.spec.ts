import { test, expect, type Page } from '@playwright/test';
import { cleanupProducts } from '../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

test.setTimeout(10000); // 10 second timeout for tests

test.describe('Product Management', () => {
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    // Clean up all products once before test suite starts
    await cleanupProducts(request);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to product page
    await page.goto('/product');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should create product with name using "Create Your First Product" button', async () => {
    // Create first product
    await page.getByRole('button', { name: 'Create Your First Product' }).click();
    await page.getByTestId('product-name-input').fill('test');
    await page.getByTestId('product-key-input').fill('TEST');
    await page.getByTestId('create-product-submit').click();

    // Verify first product was created and is selected
    await expect(page.getByTestId('product-header-title')).toHaveText('test');
  });

  test('should create product using "+ Add new" button', async () => {
    // The "+ Add new" button appears after the first test creates a product
    // Click the "+ Add new" button in the sidebar
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill('Second Product');
    await page.getByTestId('product-key-input').fill('SECOND');
    await page.getByTestId('create-product-submit').click();

    // Verify second product was created in sidebar
    await expect(page.getByTestId('product-list-item').getByText('Second Product', { exact: true })).toBeVisible();
  });

  test('should navigate to newly created product automatically', async () => {
    // Create a new product with unique name
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill('Auto Navigate Test');
    await page.getByTestId('product-key-input').fill('ANAV');
    await page.getByTestId('create-product-submit').click();

    // Wait for dialog to close
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    // Verify the newly created product is automatically selected
    await expect(page.getByTestId('product-header-title')).toHaveText('Auto Navigate Test');

    // Verify product appears in sidebar
    await expect(page.getByTestId('product-list-item').getByText('Auto Navigate Test', { exact: true })).toBeVisible();
  });

  test('should switch between products by clicking in sidebar', async () => {
    // Use existing products: "test" and "Second Product"

    // Verify "Second Product" is in sidebar
    await expect(page.getByTestId('product-list-item').getByText('Second Product', { exact: true })).toBeVisible();

    // Switch to "test" product
    await page.getByTestId('product-list-item').getByText('test', { exact: true }).click();
    await expect(page.getByTestId('product-header-title')).toHaveText('test');

    // Verify Requirements tab is active by default
    await expect(page.getByRole('tab', { name: 'Requirements' })).toHaveAttribute('data-state', 'active');

    // Switch back to "Second Product"
    await page.getByTestId('product-list-item').getByText('Second Product', { exact: true }).click();
    await expect(page.getByTestId('product-header-title')).toHaveText('Second Product');

    // Verify Requirements tab is still active
    await expect(page.getByRole('tab', { name: 'Requirements' })).toHaveAttribute('data-state', 'active');
  });

  test('should edit product name successfully', async () => {
    // Use existing "test" product and rename it
    await page.getByTestId('product-list-item').getByText('test', { exact: true }).click();

    // Verify current name
    await expect(page.getByTestId('product-header-title')).toHaveText('test');

    // Edit product name
    await page.getByTestId('product-settings-button').click();
    await page.getByTestId('edit-product-name-input').fill('Updated Name');
    await page.getByTestId('save-product-settings').click();

    // Verify name was updated in header
    await expect(page.getByTestId('product-header-title')).toHaveText('Updated Name');

    // Verify name was updated in sidebar
    await expect(page.getByTestId('product-list-item').getByText('Updated Name', { exact: true })).toBeVisible();
  });

  test('should cancel product name edit without saving', async () => {
    // Use existing "Updated Name" product (renamed from "test" in previous test)
    await page.getByTestId('product-list-item').getByText('Updated Name', { exact: true }).click();

    // Open settings and edit name
    await page.getByTestId('product-settings-button').click();
    await page.getByTestId('edit-product-name-input').fill('Should Not Save');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify product name unchanged after cancel
    await expect(page.getByTestId('product-header-title')).toHaveText('Updated Name');
    await expect(page.getByTestId('product-header-title')).not.toHaveText('Should Not Save');
  });

  test('should delete product and switch to remaining product', async () => {
    // Create first product with unique name
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill('Delete Test A');
    await page.getByTestId('product-key-input').fill('DELA');
    await page.getByTestId('create-product-submit').click();

    // Wait for dialog to close and product to be created
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    // Create second product with unique name
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill('Delete Test B');
    await page.getByTestId('product-key-input').fill('DELB');
    await page.getByTestId('create-product-submit').click();

    // Wait for dialog to close and verify second product is selected
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await expect(page.getByTestId('product-header-title')).toHaveText('Delete Test B');

    // Delete the second product
    await page.getByTestId('product-settings-button').click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.getByTestId('delete-product-button').click();
    await page.getByTestId('confirm-delete-product').click();

    // Wait for dialog to close and navigation to complete
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    // Verify product was deleted from sidebar
    await expect(page.getByTestId('product-list-item').getByText('Delete Test B', { exact: true })).not.toBeVisible();

    // Verify we navigated away from deleted product (header should not be "Delete Test B")
    await expect(page.getByTestId('product-header-title')).not.toHaveText('Delete Test B');

    // Verify "Delete Test A" still exists in the sidebar
    await expect(page.getByTestId('product-list-item').getByText('Delete Test A', { exact: true })).toBeVisible();
  });

  test('should maintain independent data sets across products', async () => {
    // Use existing "Updated Name" and "Second Product" to verify data isolation

    // Verify both products exist independently
    await expect(page.getByTestId('product-list-item').getByText('Updated Name', { exact: true })).toBeVisible();
    await expect(page.getByTestId('product-list-item').getByText('Second Product', { exact: true })).toBeVisible();

    // Switch between products maintains context
    await page.getByTestId('product-list-item').getByText('Updated Name', { exact: true }).click();
    await expect(page.getByTestId('product-header-title')).toHaveText('Updated Name');

    await page.getByTestId('product-list-item').getByText('Second Product', { exact: true }).click();
    await expect(page.getByTestId('product-header-title')).toHaveText('Second Product');
  });
});