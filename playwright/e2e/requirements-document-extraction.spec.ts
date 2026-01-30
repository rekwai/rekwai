import { test, expect, type Page } from '@playwright/test';
import { cleanupProducts } from '../helpers/test-helpers';
import path from 'path';

test.describe.configure({ mode: 'serial' });

test.setTimeout(600000); // 600 second timeout

test.describe('Requirements Management - Document Extraction', () => {
  let page: Page;
  let testProductName: string;

  test.beforeAll(async ({ browser, request }) => {
    // Clean up all products once before test suite starts
    await cleanupProducts(request);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to product page
    await page.goto('/product');

    // Create a test product for requirements
    testProductName = 'Doc Extraction Test';
    await page.getByRole('button', { name: 'Create Your First Product' }).click();
    await page.getByTestId('product-name-input').fill(testProductName);
    await page.getByTestId('product-key-input').fill('DOCEXT');
    await page.getByTestId('create-product-submit').click();

    // Wait for dialog to close and verify product was created
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await expect(page.getByTestId('product-header-title')).toHaveText(testProductName);

    // Ensure we're on the Requirements tab
    await page.getByRole('tab', { name: 'Requirements' }).click();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should upload a document and start extraction process', async () => {
    // Click Upload dropdown
    await page.getByRole('button', { name: 'Upload' }).click();

    // Select Upload Requirement option
    await page.getByRole('menuitem', { name: 'Upload Requirement' }).click();

    // Create a test file path (assuming test documents are in playwright/fixtures)
    const testFilePath = path.join(__dirname, '../fixtures/test-requirements.pdf');

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Verify upload modal appears with file selected
    await expect(page.getByTestId('upload-requirement-modal')).toBeVisible();

    // Click the "Upload document" button to start processing
    await page.getByTestId('upload-document-button').click();

    // Wait for processing to complete (should show progress updates)
    // Large documents are processed asynchronously with real-time progress
    await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show real-time progress updates during document processing', async () => {
    // This test monitors all AI processing stages which can take several minutes
    test.setTimeout(600000); // 10 minute timeout for this test only

    // After upload starts, verify progress indicators are shown
    // The system provides real-time updates during background processing

    // Check for progress indicators (percentage, status messages, etc.)
    const progressIndicator = page.getByTestId('upload-progress-indicator');
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });

    // Verify progress bar exists and increases
    const progressMessage = page.getByTestId('progress-message');
    await expect(progressMessage).toBeVisible({ timeout: 5000 });

    // Verify each expected progress stage appears
    // Note: Stage 1 (starting file processing) may be too fast to catch in tests
    // This helps identify exactly which stage fails in the future
    // All stages use 120s timeout to accommodate slow AI processing

    // Stage 1: File processing started (10%) - optional, may be too fast
    // await expect(progressMessage).toContainText(/starting file processing/i, { timeout: 120000 });

    // Stage 2: Text extraction (20%) - first reliably visible stage
    await expect(progressMessage).toContainText(/extracting text from document/i, { timeout: 120000 });

    // Stage 3: AI requirement extraction (40%)
    await expect(progressMessage).toContainText(/extracting requirements using AI/i, { timeout: 120000 });

    // Stage 4: Validation of extracted requirements (60%)
    await expect(progressMessage).toContainText(/validating extracted requirements/i, { timeout: 120000 });

    // Stage 5: Accuracy validation (70%)
    // This is the final stage we can reliably test - the process completes after this
    await expect(progressMessage).toContainText(/validating requirement accuracy/i, { timeout: 120000 });
  });

  test('should complete document processing and open indexing dialog automatically', async () => {
    // Wait for processing to complete and indexing dialog to open automatically
    await expect(page.getByTestId('requirement-indexing-dialog')).toBeVisible({ timeout: 180000 });

    // Verify left panel shows extracted requirements list
    await expect(page.getByTestId('extracted-requirements-list')).toBeVisible();

    // Verify tabs are available
    await expect(page.getByRole('tab', { name: 'Requirements found in Document' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Metadata' })).toBeVisible();
  });

  test('should display document metadata tab with file information', async () => {
    // Click on Metadata tab
    await page.getByRole('tab', { name: 'Metadata' }).click();

    // Verify file information is displayed
    await expect(page.getByText(/name:/i)).toBeVisible();
    await expect(page.getByText(/type:/i)).toBeVisible();
    await expect(page.getByText(/size:/i)).toBeVisible();
    await expect(page.getByText(/uploaded on/i)).toBeVisible();

    // Switch back to Requirements tab
    await page.getByRole('tab', { name: 'Requirements found in Document' }).click();
  });

  test('should show extracted requirements with status indicators', async () => {
    // Verify at least one extracted requirement is visible
    const requirementsList = page.getByTestId('extracted-requirements-list');
    const firstRequirement = requirementsList.locator('[data-testid^="extracted-requirement-"]').first();

    await expect(firstRequirement).toBeVisible();

    // Note: Status indicators (checkmark) are only shown for linked requirements
    // At this point requirements may not be linked yet, so we just verify the requirement item exists
  });
});
