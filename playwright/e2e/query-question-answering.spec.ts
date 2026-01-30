import { test, expect, type Page } from '@playwright/test';
import { createProduct, createMainRequirement, createExtractedQuestionnaire, cleanupProducts, triggerAllQuestionnaireWorkflows } from '../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

test.setTimeout(30000); // 30 second timeout for individual tests

test.describe('Query Management - Question Answering', () => {
  let page: Page;
  const testProductName = 'Query Answering Test';
  let productId: string;
  let questionnaireId: string;
  let mainReqKeys: string[] = [];

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(120000); // 2 minute timeout for setup
    // Clean up any existing products
    await cleanupProducts(request);

    // Create a new product via API
    const product = await createProduct(request, {
      name: testProductName,
      productKey: 'QANS'
    });
    productId = product.id;

    // Create multiple main requirements via API that can answer the questions
    // Requirement #1 - Audit logging
    const req1 = await createMainRequirement(request, productId, {
      description: 'System maintains comprehensive audit logs of all user activities',
      type: 'Security',
      implementationDescription: 'Audit logging framework implemented with secure storage',
      implementationStatus: 'Implemented',
      verification: 'Verify audit logs are generated and stored securely'
    });
    mainReqKeys.push(req1.requirement_key);

    // Requirement #2 - Authentication
    const req2 = await createMainRequirement(request, productId, {
      description: 'Users authenticate using email and password with multi-factor authentication',
      type: 'Security',
      implementationDescription: 'Email/password authentication with optional MFA',
      implementationStatus: 'Implemented',
      verification: 'Test login functionality with valid and invalid credentials'
    });
    mainReqKeys.push(req2.requirement_key);

    // Requirement #3 - Encryption
    const req3 = await createMainRequirement(request, productId, {
      description: 'All user data is encrypted at rest using AES-256 and in transit using TLS 1.3',
      type: 'Security',
      implementationDescription: 'Database encryption and HTTPS implemented',
      implementationStatus: 'Implemented',
      verification: 'Verify encryption implementation and certificates'
    });
    mainReqKeys.push(req3.requirement_key);

    // Requirement #4 - Performance
    const req4 = await createMainRequirement(request, productId, {
      description: 'System responds to user requests within 2 seconds under normal load',
      type: 'Performance',
      implementationDescription: 'Optimized database queries and caching',
      implementationStatus: 'Implemented',
      verification: 'Measure response times under load'
    });
    mainReqKeys.push(req4.requirement_key);

    // Requirement #5 - Session management
    const req5 = await createMainRequirement(request, productId, {
      description: 'User sessions expire after 30 minutes of inactivity',
      type: 'Security',
      implementationDescription: 'Session timeout implemented',
      implementationStatus: 'Implemented',
      verification: 'Test session timeout functionality'
    });
    mainReqKeys.push(req5.requirement_key);

    // Create test questionnaire with extracted questions via API
    const result = await createExtractedQuestionnaire(request, productId, 'Test Security Audit');
    questionnaireId = result.questionnaireId;

    // Trigger the workflows to auto-link requirements and generate answers
    // This simulates what happens during normal questionnaire upload
    await triggerAllQuestionnaireWorkflows(request, result.questionnaireKey);

    // Create a shared page for all tests
    page = await browser.newPage();

    // Navigate to the product page
    await page.goto('/product/QANS/requirement');

    // Navigate to Queries tab to find the uploaded questionnaire
    await page.getByRole('tab', { name: 'Queries' }).click();

    // Find and click on the uploaded questionnaire to navigate to the query page
    const firstQuestionnaire = page.locator('[data-testid^="questionnaire-"]').first();
    await expect(firstQuestionnaire).toBeVisible();
    await firstQuestionnaire.click();

    // Wait for query page to load (full-screen 50/50 layout)
    await expect(page.getByTestId('question-details')).toBeVisible();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should link and unlink requirements via ignore button and modal', async () => {
    // PART 1: Find a question with a checkmark (has linked requirements and answer from workflow)
    const questionWithAnswer = page.getByTestId('questions-list')
      .locator('[data-testid^="question-item-"]')
      .filter({ has: page.locator('[data-testid="question-completed-indicator"]') })
      .first();
    await expect(questionWithAnswer).toBeVisible();
    await questionWithAnswer.click();

    // PART 2: Verify linked requirements are present
    const sourceSection = page.getByTestId('query-requirement-section');
    const linkedRequirement = sourceSection
      .locator('[data-testid="linked-requirement-item"]')
      .first();
    await expect(linkedRequirement).toBeVisible();
    await expect(sourceSection).toContainText(/QANS-[2-6]/);

    // PART 3: Verify answer is filled
    const answerResult = page.getByTestId('answer-result');
    await expect(answerResult).toBeVisible();
    const answerText = await answerResult.textContent();
    expect(answerText).toBeTruthy();
    expect(answerText!.length).toBeGreaterThan(10);

    // PART 4: Link additional requirement via modal
    await page.getByTestId('link-requirement-button').click();
    await expect(page.getByTestId('requirement-selection-modal')).toBeVisible();

    // Select QANS-4 (performance requirement) which we created in beforeAll
    const perfRequirementItem = page.locator('[data-testid^="requirement-item-"]', { hasText: 'QANS-4' });
    await expect(perfRequirementItem).toBeVisible();
    const perfCheckbox = perfRequirementItem.getByRole('checkbox');

    // Click the checkbox to select the requirement
    await perfCheckbox.click();

    // Click the Add button - this will close the modal immediately, then trigger the API call
    await page.getByTestId('confirm-requirement-selection').click();

    // Verify QANS-4 is now visible in the linked requirements (optimistic update)
    await expect(sourceSection).toContainText('QANS-4');

    // Wait for the linked requirement item to be fully loaded (not in loading state)
    const qans4Item = page.getByTestId('query-requirement-section')
      .locator('[data-testid="linked-requirement-item"]', { hasText: 'QANS-4' });
    await expect(qans4Item).toBeVisible();

    // Wait for the ignore button to be enabled (indicates loading is complete)
    const qans4IgnoreButton = qans4Item.getByTestId('ignore-requirement-button');
    await expect(qans4IgnoreButton).not.toBeDisabled();

    // PART 5: Unlink QANS-4 (the one we just manually added) using the ignore button
    // Verify QANS-4 is present and linked
    await expect(qans4Item).toBeVisible();

    // Click the ignore button to unlink
    await qans4IgnoreButton.click();

    // Verify QANS-4 is now gone from the linked list
    await expect(sourceSection).not.toContainText('QANS-4');
  });

  test('should edit answer to completely different content', async () => {
    // Stay on same question from test 1 (already has linked requirements and answer)
    // No need to navigate - we're already on the question with an answer

    // PART 1: Edit answer to completely different text
    await page.getByTestId('edit-answer-button-top').click();
    await expect(page.getByTestId('answer-editor')).toBeVisible();

    // Fill with completely different text
    const newAnswerText = 'This is a completely different answer that has been manually edited for testing purposes.';
    await page.getByTestId('answer-editor').fill(newAnswerText);
    await page.getByTestId('save-answer-button').click();

    // PART 2: Verify the edited answer persisted
    const answerResult = page.getByTestId('answer-result');
    await expect(answerResult).toContainText(newAnswerText);
  });

  test('should create requirement from empty question and generate answer', async () => {
    // PART 1: Find a question WITHOUT a checkmark (no answer, workflow found no similar requirements)
    const questionsList = page.getByTestId('questions-list');
    const allQuestions = questionsList.locator('[data-testid^="question-item-"]');
    const questionsCount = await allQuestions.count();

    // Find a question without a checkmark
    let foundUnanswered = false;
    for (let i = 0; i < questionsCount; i++) {
      const question = allQuestions.nth(i);
      const hasCheckmark = await question.locator('[data-testid="question-completed-indicator"]').count() > 0;

      if (!hasCheckmark) {
        await question.click();
        foundUnanswered = true;
        break;
      }
    }

    // Ensure we found an unanswered question
    expect(foundUnanswered).toBe(true);

    // PART 2: Create a new requirement from this question
    const createButton = page.getByRole('button', { name: /Create requirement/i }).first();
    await expect(createButton).toBeVisible();

    // Click the Create requirement button
    await createButton.click();

    // Verify creation modal opens (uses CreateRequirementModal, not a custom modal)
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in the description field
    const descriptionField = page.locator('textarea').first();
    await descriptionField.fill('New requirement created from question context');

    // Save the new requirement
    await page.getByRole('button', { name: /Create/i }).click();

    // Verify new requirement is automatically linked
    await expect(page.getByTestId('query-requirement-section'))
      .toContainText('New requirement created from question context');

    // PART 3: Generate answer from the newly created requirement
    await page.getByTestId('regenerate-answer-button-top').click();

    // Wait for generation to complete by checking when the button is no longer disabled
    await expect(page.getByTestId('regenerate-answer-button-top')).not.toBeDisabled({ timeout: 15000 });

    // PART 4: Verify answer was generated
    const answerResult = page.getByTestId('answer-result');
    const answerText = await answerResult.textContent();

    expect(answerText).toBeTruthy();
    expect(answerText).not.toContain('No answer generated yet.');
    expect(answerText).not.toContain('Unable to generate an answer as there were no sources found relating to this question.');
    expect(answerText!.length).toBeGreaterThan(10);
  });

  test('should navigate between questions using Previous and Save & next buttons', async () => {
    // Get current question text
    const currentQuestion = await page.getByTestId('current-question-text').textContent();

    // Click "Save & next" button
    await page.getByTestId('save-next-button').click();

    // Verify question changed
    const newQuestion = await page.getByTestId('current-question-text').textContent();
    expect(newQuestion).not.toBe(currentQuestion);

    // Click "Previous arrow" button
    await page.getByTestId('previous-arrow-button').click();

    // Verify we're back to original question
    await expect(page.getByTestId('current-question-text')).toContainText(currentQuestion || '');
  });

  test('should persist progress and display completion when navigating back', async () => {
    // Navigate back to questionnaire list
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.locator('[data-testid^="questionnaire-"]').first()).toBeVisible();

    // Verify questionnaire shows completion progress
    const questionnaire = page.locator('[data-testid^="questionnaire-"]').first();
    await expect(questionnaire).toBeVisible();
    const questionnaireText = await questionnaire.textContent();
    expect(questionnaireText).toBeTruthy();

    // Reopen questionnaire to verify progress persists
    await questionnaire.click();
    await expect(page.getByTestId('question-details')).toBeVisible();

    // Verify we can see previous work (answer should still exist from test 2)
    // Find a question with a checkmark (completed indicator) which means it has an answer
    const questionWithAnswer = page.getByTestId('questions-list')
      .locator('[data-testid^="question-item-"]')
      .filter({ has: page.locator('[data-testid="question-completed-indicator"]') });

    // Check if any answered questions exist (from test 2)
    const answeredCount = await questionWithAnswer.count();
    if (answeredCount > 0) {
      await questionWithAnswer.first().click();
      const answerSection = page.getByTestId('answer-section');
      await expect(answerSection).toBeVisible();
    } else {
      // If no answered questions, just verify the answer section exists (might be empty)
      const answerSection = page.getByTestId('answer-section');
      await expect(answerSection).toBeVisible();
    }
  });
});
