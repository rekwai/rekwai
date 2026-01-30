import { test, expect, type Page } from '@playwright/test';
import { cleanupProducts, createMainRequirement, createExtractedDocument, createExtractedQuestionnaire, createExtractionLinks, createManualAnswers } from '../helpers/test-helpers';

/**
 * Test Data Setup Script
 *
 * This test creates a complete test environment with:
 * - A product with sample data
 * - Main requirements (manually created)
 * - A requirement document with extracted requirements
 * - A questionnaire with extracted questions
 *
 * Run with: npx playwright test e2e/setup-test-data.spec.ts
 *
 * Note: This test cleans up existing products before starting,
 * but leaves all created data intact after completion for manual testing.
 */

test.describe.configure({ mode: 'serial' });

test.setTimeout(120000); // 2 minute timeout

test.describe('Test Data Setup', () => {
  let page: Page;
  let productId: string;
  // Shared state for serial tests - set in questionnaire creation, used in workflow trigger
  let questionnaireKey: string;
  const productName = 'Test Data Product';
  const productKey = 'TESTDATA';

  // Store IDs for linking
  let mainRequirementIds: string[] = [];
  let extractedRequirementIds: string[] = [];
  let questionIds: string[] = [];

  test.beforeAll(async ({ browser, request }) => {
    // Clean up all existing products before starting
    console.log('Cleaning up existing products...');
    await cleanupProducts(request);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to product page
    console.log('Navigating to product page...');
    await page.goto('/product', { timeout: 30000 });
  });

  test.afterAll(async () => {
    console.log('Test data setup complete! Data has been left in the system for testing.');
    console.log(`   Product: ${productName} (${productKey})`);
    await page.close();
  });

  test('should create a test product', async ({ request }) => {
    console.log('Creating test product...');

    // Create the product
    await page.getByTestId('add-product-button').click();
    await page.getByTestId('product-name-input').fill(productName);
    await page.getByTestId('product-key-input').fill(productKey);
    await page.getByTestId('create-product-submit').click();

    // Wait for navigation to product page
    await expect(page.getByTestId('product-header-title')).toHaveText(productName);

    // Fetch all products and find the one we just created by name
    const productsResponse = await request.get('http://localhost:8001/products/');
    const products = await productsResponse.json();
    const product = products.find((p: any) => p.name === productName);

    if (!product) {
      throw new Error('Failed to find created product');
    }

    productId = product.id;
    console.log(`   Created product with ID: ${productId}`);
  });

  test('should create main requirements', async ({ request }) => {
    console.log('Creating main requirements...');

    // Navigate to Requirements tab
    await page.getByRole('tab', { name: 'Requirements' }).click();

    // Create Requirement 1: Security requirement (audit log)
    const req1 = await createMainRequirement(request, productId, {
      description: 'The system must maintain an audit log of all user actions',
      type: 'Security',
      implementationDescription: 'Audit logging system implemented using centralized logging service',
      implementationStatus: 'Implemented',
      verification: 'Verify audit logs are generated for all user actions and stored securely'
    });
    mainRequirementIds.push(req1.id);
    console.log(`   Created ${req1.requirement_key}: ${req1.description}`);

    // Create Requirement 2: Authentication requirement
    const req2 = await createMainRequirement(request, productId, {
      description: 'Users must be able to login with email and password using multi-factor authentication',
      type: 'Security',
      implementationDescription: 'OAuth 2.0 with MFA using TOTP',
      implementationStatus: 'Implemented',
      verification: 'Test login with valid/invalid credentials and verify MFA workflow'
    });
    mainRequirementIds.push(req2.id);
    console.log(`   Created ${req2.requirement_key}: ${req2.description}`);

    // Create Requirement 3: Performance requirement
    const req3 = await createMainRequirement(request, productId, {
      description: 'The system must respond to user requests within 2 seconds under normal load',
      type: 'Performance',
      implementationDescription: 'Performance optimization planned for Q2',
      implementationStatus: 'Planned',
      verification: 'Run load tests to measure response times under normal conditions'
    });
    mainRequirementIds.push(req3.id);
    console.log(`   Created ${req3.requirement_key}: ${req3.description}`);

    // Create Requirement 4: Encryption requirement
    const req4 = await createMainRequirement(request, productId, {
      description: 'All user data must be encrypted at rest using AES-256 and in transit using TLS 1.3',
      type: 'Security',
      implementationDescription: 'Need to implement TLS 1.3 upgrade',
      implementationStatus: 'To do',
      verification: 'Verify encryption implementation, certificates, and conduct security audit'
    });
    mainRequirementIds.push(req4.id);
    console.log(`   Created ${req4.requirement_key}: ${req4.description}`);

    // Create Requirement 5: Session management requirement
    const req5 = await createMainRequirement(request, productId, {
      description: 'User sessions must expire after 30 minutes of inactivity',
      type: 'Security',
      implementationDescription: 'Implemented using Redis session store with sliding expiration',
      implementationStatus: 'Implemented',
      verification: 'Test session timeout functionality with various inactivity periods'
    });
    mainRequirementIds.push(req5.id);
    console.log(`   Created ${req5.requirement_key}: ${req5.description}`);

    // Reload page to see the requirements created via API
    await page.reload();

    // Verify all requirements are visible
    await expect(page.getByText('The system must maintain an audit log')).toBeVisible();
    await expect(page.getByText('Users must be able to login with email')).toBeVisible();
    await expect(page.getByText('The system must respond to user requests')).toBeVisible();
    await expect(page.getByText('All user data must be encrypted')).toBeVisible();
    await expect(page.getByText('User sessions must expire')).toBeVisible();

    console.log('   All main requirements created successfully');
  });

  test('should create a requirement document with extracted requirements', async ({ request }) => {
    console.log('Creating requirement document with extracted requirements...');

    // Use the helper to create a document with extracted requirements
    const { documentId, extractedRequirementIds: extReqIds } = await createExtractedDocument(request, productId);
    extractedRequirementIds = extReqIds;

    console.log(`   Created document ${documentId}`);
    console.log(`   Created ${extractedRequirementIds.length} extracted requirements`);

    // Navigate to Sources tab to verify
    await page.getByRole('tab', { name: 'Sources' }).click();

    // Verify the document appears in the list
    await expect(page.getByText('test-requirements.pdf')).toBeVisible();
    console.log('   Document visible in Sources tab');
  });

  test('should link extracted requirements to main requirements', async ({ request }) => {
    console.log('Linking extracted requirements to main requirements...');

    // Create links based on similar content
    // Extracted req 0 (audit log) → Main req 0 (audit log)
    // Extracted req 1 (login) → Main req 1 (authentication)
    // Extracted req 2 (response time) → Main req 2 (performance)
    // Extracted req 3 (encryption) → Main req 3 (encryption)
    // Extracted req 4 (session timeout) → Main req 4 (session management)
    await createExtractionLinks(request, [
      { extractedRequirementId: extractedRequirementIds[0], mainRequirementId: mainRequirementIds[0] },
      { extractedRequirementId: extractedRequirementIds[1], mainRequirementId: mainRequirementIds[1] },
      { extractedRequirementId: extractedRequirementIds[2], mainRequirementId: mainRequirementIds[2] },
      { extractedRequirementId: extractedRequirementIds[3], mainRequirementId: mainRequirementIds[3] },
      { extractedRequirementId: extractedRequirementIds[4], mainRequirementId: mainRequirementIds[4] },
    ]);

    console.log('   All extracted requirements linked to main requirements');
  });

  test('should create a questionnaire with extracted questions', async ({ request }) => {
    console.log('Creating questionnaire with extracted questions...');

    // Use the helper to create a questionnaire with extracted questions
    const result = await createExtractedQuestionnaire(
      request,
      productId,
      'Test Client'
    );

    questionnaireKey = result.questionnaireKey;
    questionIds = result.questionIds;

    console.log(`   Created questionnaire ${result.questionnaireId} (${questionnaireKey})`);
    console.log(`   Created ${result.questionIds.length} extracted questions`);

    // Navigate to Queries tab to verify
    await page.getByRole('tab', { name: 'Queries' }).click();

    // Verify the questionnaire appears in the list
    await expect(page.getByText('test-questionnaire.pdf')).toBeVisible();
    await expect(page.getByText('Test Client')).toBeVisible();
    console.log('   Questionnaire visible in Queries tab');
  });

  test('should create manual answers and links for questionnaire', async ({ request }) => {
    console.log('Creating manual answers and requirement links for questionnaire...');

    // Create manual answers with predefined text and requirement links
    // Questions from createExtractedQuestionnaire:
    // 0: 'Does your organization maintain audit logs of all user activities?'
    // 1: 'What authentication mechanisms does your system support?'
    // 2: 'How does your system ensure data encryption at rest and in transit?'
    // 3: 'What is your system\'s average response time under normal load?'
    // 4: 'How long do user sessions remain active before expiring?'
    await createManualAnswers(request, [
      {
        questionId: questionIds[0],
        answer: 'Yes, our system maintains comprehensive audit logs of all user activities. The audit logging system is implemented using a centralized logging service that captures all user actions and stores them securely. This ensures full traceability and compliance with security requirements.',
        linkedRequirementIds: [mainRequirementIds[0]], // Audit log requirement
      },
      {
        questionId: questionIds[1],
        answer: 'Our system supports authentication using email and password with multi-factor authentication (MFA). The implementation uses OAuth 2.0 with MFA using Time-based One-Time Password (TOTP). This provides secure authentication for all users accessing the system.',
        linkedRequirementIds: [mainRequirementIds[1]], // Authentication requirement
      },
      {
        questionId: questionIds[2],
        answer: 'Our system ensures data encryption both at rest and in transit. All user data is encrypted at rest using AES-256 encryption. For data in transit, we are currently implementing TLS 1.3 to ensure the highest level of security for all network communications.',
        linkedRequirementIds: [mainRequirementIds[3]], // Encryption requirement
      },
      {
        questionId: questionIds[3],
        answer: 'Our system is designed to respond to user requests within 2 seconds under normal load conditions. We have performance optimization initiatives planned for Q2 to further improve response times and ensure consistent performance across all system components.',
        linkedRequirementIds: [mainRequirementIds[2]], // Performance requirement
      },
      {
        questionId: questionIds[4],
        answer: 'User sessions in our system expire after 30 minutes of inactivity. This is implemented using a Redis session store with sliding expiration, which automatically extends the session when users are active and expires it after the inactivity period.',
        linkedRequirementIds: [mainRequirementIds[4]], // Session management requirement
      },
    ]);

    console.log('   Manual answers and requirement links created successfully');
  });

  test('should verify all test data is accessible', async () => {
    console.log('Verifying all test data...');

    // Check Requirements tab
    await page.getByRole('tab', { name: 'Requirements' }).click();
    await expect(page.getByText('The system must maintain an audit log')).toBeVisible();
    console.log('   Main requirements accessible');

    // Check Sources tab
    await page.getByRole('tab', { name: 'Sources' }).click();
    await expect(page.getByText('test-requirements.pdf')).toBeVisible();
    console.log('   Requirement document accessible');

    // Check Queries tab
    await page.getByRole('tab', { name: 'Queries' }).click();
    await expect(page.getByText('test-questionnaire.pdf')).toBeVisible();
    console.log('   Questionnaire accessible');

    console.log('');
    console.log('All test data created and verified successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Product: ${productName} (${productKey})`);
    console.log('  - 5 main requirements (various types and statuses)');
    console.log('  - 1 requirement document with 5 extracted requirements');
    console.log('  - 5 extraction links (extracted requirements → main requirements)');
    console.log('  - 1 questionnaire with 5 extracted questions');
    console.log('  - 5 manually created answers with requirement links for all questions');
    console.log('');
    console.log('Note: Data has been left in the system for manual testing.');
  });
});
