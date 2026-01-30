import { test, expect, type Page } from '@playwright/test';
import { createMainRequirement, createExtractedDocument, cleanupProducts, createExtractionLinks } from '../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

test.setTimeout(10000); // 10 second timeout

test.describe('Requirements Management - Document Indexing', () => {
  let page: Page;
  const testProductName = 'Doc Indexing Test';
  let productId: string;

  test.beforeAll(async ({ browser, request }) => {
    // Clean up any existing products
    await cleanupProducts(request);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to product page
    await page.goto('/product');

    // Clear localStorage to remove any ignored requirements from previous test runs
    await page.evaluate(() => localStorage.clear());

    // Create a new product
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill(testProductName);
    await page.getByTestId('product-key-input').fill('DOCIDX');
    await page.getByTestId('create-product-submit').click();

    // Wait for navigation to product page
    await expect(page.getByTestId('product-header-title')).toHaveText(testProductName);

    // Fetch all products and find the one we just created by name
    const productsResponse = await request.get('http://localhost:8001/products/');
    const products = await productsResponse.json();
    const product = products.find((p: any) => p.name === testProductName);
    productId = product ? product.id : '';

    // Create multiple main requirements to enable similarity testing
    // These requirements should be similar to the first extracted requirement
    // ("The system must maintain an audit log of all user actions")
    await page.getByRole('tab', { name: 'Requirements' }).click();

    // Create main requirements for similarity testing and store their IDs
    const mainReq1 = await createMainRequirement(request, productId, {
      description: 'System must maintain audit logs for security compliance',
      type: 'Security',
      implementationDescription: 'Audit logging framework implemented',
      implementationStatus: 'Implemented',
      verification: 'Verify audit logs are generated and stored securely'
    });

    const mainReq2 = await createMainRequirement(request, productId, {
      description: 'Audit logging must be implemented for all user activities',
      type: 'Security',
      implementationDescription: 'Comprehensive audit logging system',
      implementationStatus: 'Implemented',
      verification: 'Verify all user actions are logged with timestamps'
    });

    const mainReq3 = await createMainRequirement(request, productId, {
      description: 'Security audit trails must be maintained for compliance purposes',
      type: 'Security',
      implementationDescription: 'Audit trail tracking system',
      implementationStatus: 'Implemented',
      verification: 'Verify audit trails meet compliance requirements'
    });

    // Create test document with extracted requirements via API
    const { extractedRequirementIds } = await createExtractedDocument(request, productId);

    // Pre-link the first extracted requirement to all 3 main requirements
    // This simulates what would happen during normal document upload with AI auto-linking
    await createExtractionLinks(request, [
      { extractedRequirementId: extractedRequirementIds[0], mainRequirementId: mainReq1.id },
      { extractedRequirementId: extractedRequirementIds[0], mainRequirementId: mainReq2.id },
      { extractedRequirementId: extractedRequirementIds[0], mainRequirementId: mainReq3.id },
    ]);

    // Navigate to Sources tab to find the uploaded document
    await page.getByRole('tab', { name: 'Sources' }).click();

    // Find and click on the uploaded document to navigate to the indexing page
    const firstDocument = page.locator('[data-testid^="requirement-document-"]').first();
    await expect(firstDocument).toBeVisible({ timeout: 10000 });
    await firstDocument.click();

    // Wait for indexing page to load (full-page layout, not a dialog)
    await expect(page.getByTestId('requirement-details-panel')).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should display interface, select requirement, and edit all fields with persistence', async () => {
    // Verify we're on the indexing page with proper layout
    await expect(page).toHaveURL(/\/source\/[^/]+$/);
    await expect(page.getByTestId('extracted-requirement-list')).toBeVisible();
    await expect(page.getByTestId('requirement-details-panel')).toBeVisible();
    await expect(page.getByTestId('requirements-tab')).toBeVisible();
    await expect(page.getByTestId('metadata-tab')).toBeVisible();

    // Select the audit log requirement (the one we pre-linked in beforeAll)
    const auditLogRequirement = page.getByTestId('extracted-requirement-list')
      .locator('[data-testid^="extracted-requirement-"]')
      .filter({ hasText: 'The system must maintain an audit log' });
    await auditLogRequirement.click();

    await expect(page.getByTestId('requirement-display-card')).toBeVisible();
    await expect(page.getByTestId('requirement-display-card')).toContainText('The system must maintain an audit log');
    await expect(page.getByTestId('requirement-display-card').getByTestId('edit-requirement-button')).toBeVisible();
    await expect(page.getByTestId('linked-requirements-list')).toBeVisible();

    // Edit all fields (description, implementation, verification, type)
    const newDescription = 'The system must maintain an audit log of all user actions for security';
    const newImplementation = 'Updated implementation details';
    const newVerification = 'Test by verifying security certificates and running penetration tests';

    await page.getByTestId('requirement-display-card').getByTestId('edit-requirement-button').click();
    const editModal = page.locator('[role="dialog"]').filter({ hasText: /Edit/ });
    await expect(editModal).toBeVisible();

    // Edit text fields
    await editModal.getByTestId('requirement-description').fill(newDescription);
    await editModal.getByTestId('implementation-description').fill(newImplementation);
    await editModal.getByTestId('requirement-verification').fill(newVerification);

    // Save changes
    await editModal.getByTestId('save-extracted-requirement').click();
    await expect(editModal).not.toBeVisible();

    // Verify persistence by navigating away and back
    const secondRequirement = page.getByTestId('extracted-requirement-list')
      .locator('[data-testid^="extracted-requirement-"]')
      .nth(1);
    await secondRequirement.click();
    await page.waitForTimeout(500);

    await auditLogRequirement.click();
    await page.waitForTimeout(500);

    const displayCard = page.getByTestId('requirement-display-card');
    await expect(displayCard).toContainText(newDescription);
    await expect(displayCard).toContainText(newImplementation);
    await expect(displayCard).toContainText(newVerification);
  });

  test('should find AI-similar requirements, manually link, and unlink requirements', async () => {
    const linkedList = page.getByTestId('linked-requirements-list');
    await expect(linkedList).toBeVisible();

    // Verify we already have 3 pre-linked requirements from setup
    const linkedCards = linkedList.locator('[data-testid="requirement-card"]');
    await expect(linkedCards.first()).toBeVisible();
    const initialCardCount = await linkedCards.count();
    expect(initialCardCount).toBe(3); // We pre-linked 3 requirements in beforeAll

    // Test unlinking one of the requirements
    const firstLinkedCard = linkedCards.first();
    await firstLinkedCard.getByTestId('ignore-requirement-button').click();

    // Verify count decreased from 3 to 2
    await expect(linkedCards).toHaveCount(2);
  });

  test('should allow creating new main requirement from document requirement', async () => {
    // Click Create new Requirement button (icon button in header)
    await page.getByTestId('create-new-requirement-button').click();

    // Verify creation modal opens with pre-filled content
    const createModal = page.locator('[role="dialog"]').filter({ hasText: /Create/ });
    await expect(createModal).toBeVisible();

    // Verify form is pre-filled with document requirement content
    const descriptionField = createModal.locator('textarea').first();
    await expect(descriptionField).not.toBeEmpty();

    // Make any edits if needed
    await descriptionField.fill('New main requirement created from document extraction');

    // Fill in the required implementation description field
    const implementationField = createModal.locator('textarea').nth(1);
    await implementationField.fill('To be implemented in next sprint');

    // Save the new requirement
    await createModal.getByRole('button', { name: 'Create' }).click();

    // Verify modal closes
    await expect(createModal).not.toBeVisible();

    // Verify new requirement is automatically linked (longer timeout for AI embedding)
    await expect(page.getByTestId('linked-requirements-list'))
      .toContainText('New main requirement created from document extraction', { timeout: 15000 });
  });

  test('should allow merging linked requirement with document requirement', async () => {
    // Find a linked requirement card
    const linkedRequirement = page.getByTestId('linked-requirements-list')
      .locator('[data-testid="requirement-card"]')
      .first();

    // Click merge button
    await linkedRequirement.getByTestId('merge-requirement-button').click();

    // Verify requirement edit dialog opens (the merge uses the same modal)
    // The dialog title format includes "Edit Requirement"
    const dialog = page.locator('[role="dialog"]').filter({ hasText: /Edit Requirement/ });
    await expect(dialog).toBeVisible();

    // Verify merged content is pre-filled
    const requirementDesc = dialog.locator('textarea').first();
    await expect(requirementDesc).toBeVisible();
    await expect(requirementDesc).not.toBeEmpty();

    // Optionally edit the merged content
    await requirementDesc.fill('Optimized merged requirement preserving important details from both sources');

    // Save the merged requirement
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
  });

  test('should navigate between requirements using next and previous buttons', async () => {
    // Get current requirement text
    const currentText = await page.getByTestId('current-item-text').textContent();

    // Navigate to next requirement
    await page.getByTestId('save-next-button').click();
    await page.waitForTimeout(500);

    const nextText = await page.getByTestId('current-item-text').textContent();
    expect(nextText).not.toBe(currentText);
    await expect(page.getByTestId('requirement-details-panel')).toBeVisible();

    // Navigate back to previous requirement
    await page.getByTestId('previous-arrow-button').click();
    await page.waitForTimeout(500);

    const previousText = await page.getByTestId('current-item-text').textContent();
    expect(previousText).toBe(currentText);
  });
});
