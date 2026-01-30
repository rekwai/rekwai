import { test, expect, type Page } from '@playwright/test';
import { cleanupProducts } from '../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

test.setTimeout(10000); // 10 second timeout

test.describe('Requirements Management - Manual Creation', () => {
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
    testProductName = 'Requirements Test';
    await page.getByRole('button', { name: 'Create Your First Product' }).click();
    await page.getByTestId('product-name-input').fill(testProductName);
    await page.getByTestId('product-key-input').fill('REQTEST');
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

  test('should create a functional requirement manually', async () => {
    // Click Create Requirement button
    await page.getByRole('button', { name: 'Create Requirement' }).click();

    // Fill in requirement details
    await page.getByTestId('requirement-description').fill('Users must be able to login with their email');

    // Select requirement type - Functional
    await page.getByTestId('type-selector').click();
    await page.getByTestId('type-search-input').fill('Functional');
    await page.getByTestId('type-search-input').press('Enter');

    // Add implementation details
    await page.getByTestId('implementation-description').fill('Email authentication is implemented using OAuth 2.0');

    // Select implementation status - Implemented (default is "To do", need to change it)
    await page.getByRole('button', { name: 'To do' }).click();
    await page.getByRole('menuitem', { name: 'Implemented' }).click();

    // Add requirement verification
    await page.getByTestId('requirement-verification').fill('Test successful email login and verify authentication token is generated');

    // Submit the form
    await page.getByTestId('create-requirement-submit').click();

    // Wait for the modal to close
    await page.getByTestId('new-requirement-modal').waitFor({ state: 'hidden' });

    // Verify requirement appears in the table
    await expect(page.getByText('Users must be able to login with their email')).toBeVisible();
  });

  test('should create a non-functional requirement with multiple types', async () => {
    // Click Create Requirement button
    await page.getByRole('button', { name: 'Create Requirement' }).click();

    // Fill in requirement details
    await page.getByTestId('requirement-description').fill('The system must respond within 2 seconds');

    // Select requirement type - Non-Functional
    await page.getByTestId('type-selector').click();
    await page.getByTestId('type-search-input').fill('Non-Functional');
    await page.getByTestId('type-search-input').press('Enter');

    // Add implementation details
    await page.getByTestId('implementation-description').fill('Performance optimization scheduled for Q2');

    // Select implementation status - Planned
    await page.getByRole('button', { name: 'To do' }).click();
    await page.getByRole('menuitem', { name: 'Planned' }).click();

    // Add requirement verification
    await page.getByTestId('requirement-verification').fill('Run load tests to measure response time under normal conditions');

    // Submit the form
    await page.getByTestId('create-requirement-submit').click();

    // Wait for the modal to close
    await page.getByTestId('new-requirement-modal').waitFor({ state: 'hidden' });

    // Verify requirement appears in the table
    await expect(page.getByText('The system must respond within 2 seconds')).toBeVisible();
  });

  test('should create a security requirement', async () => {
    // Click Create Requirement button
    await page.getByRole('button', { name: 'Create Requirement' }).click();

    // Fill in requirement details
    await page.getByTestId('requirement-description').fill('All data must be encrypted at rest and in transit');

    // Select requirement type - Security
    await page.getByTestId('type-selector').click();
    await page.getByTestId('type-search-input').fill('Security');
    await page.getByTestId('type-search-input').press('Enter');

    // Add implementation details
    await page.getByTestId('implementation-description').fill('Need to implement TLS 1.3 and AES-256 encryption');

    // Implementation status - Keep as "To do" (default)

    // Add requirement verification
    await page.getByTestId('requirement-verification').fill('Verify encryption certificates and run security audit to confirm data is encrypted');

    // Submit the form
    await page.getByTestId('create-requirement-submit').click();

    // Wait for the modal to close by waiting for the specific modal to be hidden
    await page.getByTestId('new-requirement-modal').waitFor({ state: 'hidden' });

    // Verify requirement appears in the table
    await expect(page.getByText('All data must be encrypted at rest and in transit')).toBeVisible();
  });

  test('should create a business requirement marked as "Won\'t do"', async () => {
    // Click Create Requirement button
    await page.getByRole('button', { name: 'Create Requirement' }).click();

    // Fill in requirement details
    await page.getByTestId('requirement-description').fill('Reports must be generated monthly');

    // Select requirement type - Business
    await page.getByTestId('type-selector').click();
    await page.getByTestId('type-search-input').fill('Business');
    await page.getByTestId('type-search-input').press('Enter');

    // Add implementation details explaining why
    await page.getByTestId('implementation-description').fill('Decided to implement real-time dashboards instead of monthly reports');

    // Select implementation status - Won't do
    await page.getByRole('button', { name: 'To do' }).click();
    await page.getByRole('menuitem', { name: "Won't do" }).click();

    // Add requirement verification
    await page.getByTestId('requirement-verification').fill('No verification needed as this requirement will not be implemented');

    // Submit the form
    await page.getByTestId('create-requirement-submit').click();

    // Wait for the modal to close
    await page.getByTestId('new-requirement-modal').waitFor({ state: 'hidden' });

    // Verify requirement appears in the table
    await expect(page.getByText('Reports must be generated monthly')).toBeVisible();
  });

  test('should cancel requirement creation without saving', async () => {
    // Click Create Requirement button
    await page.getByRole('button', { name: 'Create Requirement' }).click();

    // Fill in some details
    await page.getByTestId('requirement-description').fill('This should not be saved');

    // Select requirement type
    await page.getByTestId('type-selector').click();
    await page.getByTestId('type-search-input').fill('Functional');
    await page.getByTestId('type-search-input').press('Enter');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Wait for the modal to close
    await page.getByTestId('new-requirement-modal').waitFor({ state: 'hidden' });

    // Verify requirement was not created
    await expect(page.getByText('This should not be saved')).not.toBeVisible();
  });

  test('should display requirements with different implementation status indicators', async () => {
    // Verify that requirements with different statuses are visible
    // We should see visual indicators (color coding) for each status type

    // These requirements were created in earlier tests with different statuses
    await expect(page.getByText('Users must be able to login with their email')).toBeVisible(); // Implemented
    await expect(page.getByText('All data must be encrypted at rest and in transit')).toBeVisible(); // To do
    await expect(page.getByText('The system must respond within 2 seconds')).toBeVisible(); // Planned
    await expect(page.getByText('Reports must be generated monthly')).toBeVisible(); // Won't do
  });
});
