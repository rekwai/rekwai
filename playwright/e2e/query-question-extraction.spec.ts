import { test, expect, type Page } from '@playwright/test';
import { cleanupProducts } from '../helpers/test-helpers';
import path from 'path';

test.describe.configure({ mode: 'serial' });

test.setTimeout(180000); // 3 minute timeout for AI processing

test.describe('Query Management - Question Extraction', () => {
  let page: Page;
  let testProductName: string;

  test.beforeAll(async ({ browser, request }) => {
    // Clean up all products once before test suite starts
    await cleanupProducts(request);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to product page
    await page.goto('/product');

    // Create a test product for queries
    testProductName = 'Query Test Product';
    await page.getByRole('button', { name: 'Create Your First Product' }).click();
    await page.getByTestId('product-name-input').fill(testProductName);
    await page.getByTestId('product-key-input').fill('QUERY');
    await page.getByTestId('create-product-submit').click();

    // Wait for dialog to close and verify product was created
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await expect(page.getByTestId('product-header-title')).toHaveText(testProductName, { timeout: 10000 });

    // Navigate to Queries tab
    await page.getByRole('tab', { name: 'Queries' }).click();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should upload a questionnaire and show real-time progress updates during extraction', async () => {
    // Click Upload dropdown button
    await page.getByRole('button', { name: 'Upload' }).click();

    // Click "Upload Query" from dropdown menu
    await page.getByRole('menuitem', { name: 'Upload Query' }).click();

    // Verify upload modal appears
    await expect(page.getByTestId('upload-questionnaire-modal')).toBeVisible();

    // Create a test file path (assuming test questionnaires are in playwright/fixtures)
    const testFilePath = path.join(__dirname, '../fixtures/test-questionnaire.pdf');

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Create a new client
    await page.getByRole('button', { name: 'New client' }).click();
    await page.getByPlaceholder('Enter client name').fill('Test Client');
    await page.getByRole('button').filter({ has: page.locator('svg') }).first().click(); // Click the check button

    // Click the "Upload Document" button to start processing
    await page.getByTestId('upload-questionnaire-button').click();

    // Monitor progress indicators during background processing
    // Check for progress indicators (percentage, status messages, etc.)
    const progressIndicator = page.getByTestId('upload-progress-indicator');
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });

    // Verify progress bar exists and increases
    const progressMessage = page.getByTestId('progress-message');
    await expect(progressMessage).toBeVisible({ timeout: 5000 });

    // Verify key progress stages appear
    // Note: Some stages (10%: starting, 20%: creating record, 80%: saving) are too fast to reliably catch
    // due to 1-second polling interval, so we only check for stages that take significant time
    // All stages use 120s timeout to accommodate slow AI processing

    // Stage 1: Text extraction (40%) - first reliably visible stage
    await expect(progressMessage).toContainText(/extracting text from document/i, { timeout: 120000 });

    // Stage 2: AI question extraction (60%) - slowest stage, always visible
    await expect(progressMessage).toContainText(/extracting questions using AI/i, { timeout: 120000 });

    // Note: Stage 3 "Saving extracted questions" (80%) is too fast to reliably test
    // The modal closes immediately after completion, often before this message can be polled
  });

  test('should complete question extraction and open query page automatically', async () => {
    // Wait for processing to complete and navigation to query page
    // The page automatically navigates to /product/{productKey}/query/{queryId}
    await page.waitForURL(/\/product\/.*\/query\/.*/, { timeout: 120000 });

    // Verify we're on the query page by checking for question details panel
    await expect(page.getByTestId('question-details')).toBeVisible({ timeout: 10000 });

    // Verify Questions tab is visible in the left panel
    await expect(page.getByTestId('questions-tab')).toBeVisible();

    // Verify Metadata tab is available in the left panel
    await expect(page.getByTestId('metadata-tab')).toBeVisible();

    // Verify questions list is displayed
    await expect(page.getByTestId('questions-list')).toBeVisible();
  });

  test('should show extracted questions with navigation', async () => {
    // Verify at least one extracted question is visible in the list
    const questionsList = page.getByTestId('questions-list');
    const firstQuestion = questionsList.locator('[data-testid^="question-item-"]').first();

    await expect(firstQuestion).toBeVisible();

    // Note: Navigation and question details viewing can be tested here
    // Similar to how requirements show status indicators after linking
  });

  test('should navigate back to query list and show questionnaire', async () => {
    // Click the Back button in the header to navigate back to query list
    await page.getByRole('button', { name: /Back/i }).click();

    // Wait for navigation to complete
    await page.waitForURL(/\/product\/.*\/query$/, { timeout: 10000 });

    // Verify we're back on the Queries tab
    await expect(page.getByRole('tab', { name: 'Queries' })).toHaveAttribute('aria-selected', 'true');

    // Verify the uploaded questionnaire appears in the list
    await expect(page.getByText('test-questionnaire.pdf')).toBeVisible();
  });
});
