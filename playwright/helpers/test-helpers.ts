import { APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { Client } from 'pg';
import * as Minio from 'minio';
import { v7 as uuidv7 } from 'uuid';

const BACKEND_URL = 'http://localhost:8001';

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.POSTGRES_HOST!,
  port: parseInt(process.env.POSTGRES_PORT!),
  database: process.env.POSTGRES_DB!,
  user: process.env.POSTGRES_USER!,
  password: process.env.POSTGRES_PASSWORD!,
};

// MinIO configuration from environment variables
const MINIO_CONFIG = {
  endPoint: process.env.S3_URL!,
  port: parseInt(process.env.S3_PORT!),
  useSSL: false,
  accessKey: process.env.S3_ACCESS_KEY!,
  secretKey: process.env.S3_SECRET_KEY!,
};

const MINIO_BUCKET = 'upload-documents';

interface Requirement {
  id: string;
  requirement_key: string;
  description: string;
  types: string[];
  implementation_description: string;
  implementation_status: string;
  product_id: string;
  requirement_verification?: string;
}

/**
 * Cleanup function to delete all products from the backend
 */
export async function cleanupProducts(request: APIRequestContext) {
  // Get all products
  const response = await request.get(`${BACKEND_URL}/products/`);
  const products = await response.json();

  // Delete each product
  for (const product of products) {
    await request.delete(`${BACKEND_URL}/products/${product.id}`);
  }

  console.log(`Cleaned up ${products.length} products`);
}

/**
 * Helper function to create a product via API
 * Returns the created product with its ID
 */
export async function createProduct(
  request: APIRequestContext,
  options: {
    name: string;
    productKey: string;
  }
): Promise<{ id: string; name: string; product_key: string; organization_id: string }> {
  const response = await request.post(`${BACKEND_URL}/products/`, {
    data: {
      name: options.name,
      product_key: options.productKey,
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create product: ${response.status()} - ${errorText}`);
  }

  const product = await response.json();
  console.log(`Created product ${product.product_key}: ${product.name}`);
  return product;
}

interface RequirementOptions {
  description: string;
  type: string;
  implementationDescription: string;
  implementationStatus?: 'To do' | 'Implemented' | 'Planned' | "Won't do";
  verification: string;
}

/**
 * Helper function to create a main requirement via API
 * Returns the created requirement with its key
 */
export async function createMainRequirement(
  request: APIRequestContext,
  productId: string,
  options: RequirementOptions
): Promise<Requirement> {

  const response = await request.post(`${BACKEND_URL}/requirements/`, {
    data: {
      description: options.description,
      types: [options.type],
      implementation_description: options.implementationDescription,
      implementation_status: options.implementationStatus || 'To do',
      requirement_verification: options.verification,
      product_id: productId,
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create requirement: ${response.status()} - ${errorText}`);
  }

  const requirement = await response.json();
  console.log(`Created requirement ${requirement.requirement_key}: ${requirement.description}`);
  return requirement;
}

/**
 * Helper function to create a document with extracted requirements via direct DB/MinIO access (for testing).
 * This bypasses the slow document upload and AI extraction process.
 */
export async function createExtractedDocument(
  request: APIRequestContext,
  productId: string
): Promise<{ documentId: string; extractedRequirementIds: string[] }> {
  // Fetch the product to get its organization_id and product_key
  const productResponse = await request.get(`${BACKEND_URL}/products/${productId}`);
  if (!productResponse.ok()) {
    throw new Error(`Failed to fetch product: ${productResponse.status()}`);
  }
  const product = await productResponse.json();
  const organizationId = product.organization_id;
  const productKey = product.product_key;

  // Load the test PDF file
  const testFilePath = path.join(__dirname, '../fixtures/test-requirements.pdf');
  const fileBuffer = fs.readFileSync(testFilePath);
  const filename = 'test-requirements.pdf';
  const fileExtension = '.pdf';

  // Generate document UUID
  const documentUuid = uuidv7();

  // Upload file to MinIO
  const minioClient = new Minio.Client(MINIO_CONFIG);
  const s3ObjectKey = `${organizationId}/requirement_documents/${documentUuid}${fileExtension}`;
  await minioClient.putObject(MINIO_BUCKET, s3ObjectKey, fileBuffer);

  // Connect to database
  const dbClient = new Client(DB_CONFIG);
  await dbClient.connect();

  try {
    // Increment and get document key number
    const keyResult = await dbClient.query(
      'UPDATE product SET current_requirement_document_key_number = current_requirement_document_key_number + 1 WHERE id = $1 RETURNING current_requirement_document_key_number',
      [productId]
    );
    const currentNumber = keyResult.rows[0].current_requirement_document_key_number;
    const documentKey = `${productKey}-D-${currentNumber}`;

    // Insert document record
    await dbClient.query(
      `INSERT INTO requirement_document
        (id, s3_object_key, organization_id, product_id, original_filename, file_extension, content_size_bytes, document_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [documentUuid, s3ObjectKey, organizationId, productId, filename, fileExtension, fileBuffer.length, documentKey]
    );

    // Define extracted requirements matching the test PDF content
    const extractionTimestamp = new Date().toISOString();
    const extractedRequirements = [
      {
        description: 'The system must maintain an audit log of all user actions',
        types: ['Security'],
        requirement_verification: 'Verify audit logs are generated and stored securely',
        implementation_status: 'To do',
      },
      {
        description: 'Users must be able to login with their email and password',
        types: ['Security', 'Authentication'],
        requirement_verification: 'Test login functionality with valid and invalid credentials',
        implementation_status: 'To do',
      },
      {
        description: 'The system must respond to user requests within 2 seconds',
        types: ['Performance'],
        requirement_verification: 'Measure response times under load',
        implementation_status: 'To do',
      },
      {
        description: 'All user data must be encrypted at rest and in transit',
        types: ['Security', 'Compliance'],
        requirement_verification: 'Verify encryption implementation and certificates',
        implementation_status: 'To do',
      },
      {
        description: 'User sessions must expire after 30 minutes of inactivity',
        types: ['Security'],
        requirement_verification: 'Test session timeout functionality',
        implementation_status: 'To do',
      }
    ];

    // Insert extracted requirements
    const extractedRequirementIds: string[] = [];
    for (const req of extractedRequirements) {
      const reqId = uuidv7();

      // Insert extracted requirement
      await dbClient.query(
        `INSERT INTO extracted_requirement
          (id, document_id, document_name, description, implementation_status, implementation_description,
           organization_id, product_id, requirement_verification, extraction_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [reqId, documentUuid, filename, req.description, req.implementation_status, null,
         organizationId, productId, req.requirement_verification, extractionTimestamp]
      );

      // Insert types
      for (const type of req.types) {
        await dbClient.query(
          'INSERT INTO extracted_requirement_type (extracted_requirement_id, type) VALUES ($1, $2)',
          [reqId, type]
        );
      }

      extractedRequirementIds.push(reqId);
    }

    console.log(`Created test document ${documentUuid} with ${extractedRequirementIds.length} extracted requirements`);

    return {
      documentId: documentUuid,
      extractedRequirementIds
    };
  } finally {
    await dbClient.end();
  }
}

/**
 * Helper function to create a questionnaire with extracted questions via direct DB/MinIO access (for testing).
 * This bypasses the slow document upload and AI extraction process.
 */
export async function createExtractedQuestionnaire(
  request: APIRequestContext,
  productId: string,
  clientName: string = 'Test Client'
): Promise<{ questionnaireId: string; questionnaireKey: string; questionIds: string[] }> {
  // Fetch the product to get its organization_id and product_key
  const productResponse = await request.get(`${BACKEND_URL}/products/${productId}`);
  if (!productResponse.ok()) {
    throw new Error(`Failed to fetch product: ${productResponse.status()}`);
  }
  const product = await productResponse.json();
  const organizationId = product.organization_id;
  const productKey = product.product_key;

  // Load the test questionnaire file
  const testFilePath = path.join(__dirname, '../fixtures/test-questionnaire.pdf');
  const fileBuffer = fs.readFileSync(testFilePath);
  const filename = 'test-questionnaire.pdf';
  const fileExtension = '.pdf';

  // Generate questionnaire UUID
  const questionnaireUuid = uuidv7();

  // Upload file to MinIO
  const minioClient = new Minio.Client(MINIO_CONFIG);
  const s3ObjectKey = `${organizationId}/questionnaire_documents/${questionnaireUuid}${fileExtension}`;
  await minioClient.putObject(MINIO_BUCKET, s3ObjectKey, fileBuffer);

  // Connect to database
  const dbClient = new Client(DB_CONFIG);
  await dbClient.connect();

  try {
    // Get or create client
    let clientResult = await dbClient.query(
      'SELECT id FROM client WHERE organization_id = $1 AND name = $2',
      [organizationId, clientName]
    );

    let clientId: string;
    if (clientResult.rows.length === 0) {
      // Create new client
      clientId = uuidv7();
      const clientKeyResult = await dbClient.query(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM 2) AS INTEGER)), 0) + 1 as next_num FROM client WHERE organization_id = $1',
        [organizationId]
      );
      const clientKey = `C${clientKeyResult.rows[0].next_num}`;

      await dbClient.query(
        'INSERT INTO client (id, organization_id, name, key) VALUES ($1, $2, $3, $4)',
        [clientId, organizationId, clientName, clientKey]
      );
    } else {
      clientId = clientResult.rows[0].id;
    }

    // Increment and get questionnaire key number
    const keyResult = await dbClient.query(
      'UPDATE product SET current_questionnaire_key_number = current_questionnaire_key_number + 1 WHERE id = $1 RETURNING current_questionnaire_key_number',
      [productId]
    );
    const currentNumber = keyResult.rows[0].current_questionnaire_key_number;
    const questionnaireKey = `${productKey}-Q-${currentNumber}`;

    // Insert questionnaire record
    await dbClient.query(
      `INSERT INTO questionnaire
        (id, file_name, file_type, s3_object_key, upload_status, client_id, product_id, organization_id, key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [questionnaireUuid, filename, 'application/pdf', s3ObjectKey, 'uploaded', clientId, productId, organizationId, questionnaireKey]
    );

    // Define extracted questions matching the test questionnaire content
    const extractedQuestions = [
      'Does your organization maintain audit logs of all user activities?',
      'What authentication mechanisms does your system support?',
      'How does your system ensure data encryption at rest and in transit?',
      'What is your system\'s average response time under normal load?',
      'How long do user sessions remain active before expiring?',
    ];

    // Insert questions
    const questionIds: string[] = [];
    for (const questionText of extractedQuestions) {
      const questionId = uuidv7();

      await dbClient.query(
        `INSERT INTO questionnaire_question
          (id, questionnaire_id, question_text, status)
         VALUES ($1, $2, $3, $4)`,
        [questionId, questionnaireUuid, questionText, 'extracted']
      );

      questionIds.push(questionId);
    }

    console.log(`Created test questionnaire ${questionnaireUuid} with ${questionIds.length} extracted questions`);

    return {
      questionnaireId: questionnaireUuid,
      questionnaireKey: questionnaireKey,
      questionIds
    };
  } finally {
    await dbClient.end();
  }
}

/**
 * Helper function to manually create links between extracted requirements and main requirements.
 * This bypasses the AI similarity detection and creates links directly.
 */
export async function createExtractionLinks(
  request: APIRequestContext,
  links: Array<{ extractedRequirementId: string; mainRequirementId: string }>
): Promise<void> {
  console.log(`Creating ${links.length} extraction links...`);

  for (const link of links) {
    const linkResponse = await request.post(
      `${BACKEND_URL}/requirements/${link.mainRequirementId}/extraction-links`,
      {
        data: {
          extracted_requirement_id: link.extractedRequirementId,
        },
      }
    );

    if (!linkResponse.ok()) {
      console.log(`   Failed to create link for extracted requirement ${link.extractedRequirementId}: ${linkResponse.status()}`);
    } else {
      console.log(`   Linked extracted requirement ${link.extractedRequirementId} to main requirement ${link.mainRequirementId}`);
    }
  }

  console.log(`   Created ${links.length} extraction links`);
}

/**
 * Helper function to manually create answers for questionnaire questions.
 * This bypasses the AI answer generation and creates answers and links directly.
 */
export async function createManualAnswers(
  request: APIRequestContext,
  answers: Array<{
    questionId: string;
    answer: string;
    linkedRequirementIds: string[];
  }>
): Promise<void> {
  console.log(`Creating ${answers.length} manual answers...`);

  for (const answerData of answers) {
    console.log(`   Creating answer for question ${answerData.questionId}`);

    // Save the answer
    const saveResponse = await request.post(
      `${BACKEND_URL}/questionnaires/questions/${answerData.questionId}/save_answer`,
      {
        data: {
          answer: answerData.answer,
        },
      }
    );

    if (!saveResponse.ok()) {
      console.log(`      Failed to save answer: ${saveResponse.status()}`);
      continue;
    }
    console.log(`      Saved answer`);

    // Create requirement-question links
    for (const requirementId of answerData.linkedRequirementIds) {
      const linkResponse = await request.post(
        `${BACKEND_URL}/requirements/${requirementId}/question-links`,
        {
          data: {
            question_id: answerData.questionId,
          },
        }
      );

      if (!linkResponse.ok()) {
        console.log(`      Failed to create link for requirement ${requirementId}: ${linkResponse.status()}`);
      }
    }

    console.log(`      Created ${answerData.linkedRequirementIds.length} requirement-question links`);
  }

  console.log(`   Created ${answers.length} manual answers`);
}

/**
 * Helper function to trigger the similar requirements and answer generation workflow for all questions in a questionnaire.
 * This mimics the workflow that happens during normal upload but was skipped when using direct DB insertion.
 */
export async function triggerAllQuestionnaireWorkflows(
  request: APIRequestContext,
  questionnaireKey: string
): Promise<void> {
  console.log(`Triggering workflows for questionnaire ${questionnaireKey}...`);

  // Step 1: Fetch all questions for the questionnaire
  const questionsResponse = await request.get(`${BACKEND_URL}/questionnaires/key/${questionnaireKey}/questions`);
  if (!questionsResponse.ok()) {
    throw new Error(`Failed to fetch questions: ${questionsResponse.status()}`);
  }
  const questions = await questionsResponse.json();
  console.log(`   Found ${questions.length} questions to process`);

  // Step 2: Process each question
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`   Processing question ${i + 1}/${questions.length}: "${question.question_text.substring(0, 60)}..."`);

    try {
      // Step 2a: Find similar requirements
      const similarResponse = await request.get(
        `${BACKEND_URL}/questionnaires/questions/${question.id}/similar?limit=5`
      );
      if (!similarResponse.ok()) {
        console.log(`      Failed to find similar requirements: ${similarResponse.status()}`);
        continue;
      }
      const similarRequirements = await similarResponse.json();
      console.log(`      Found ${similarRequirements.length} similar requirements`);

      if (similarRequirements.length === 0) {
        console.log(`      Skipping answer generation (no similar requirements)`);
        continue;
      }

      // Extract requirement IDs
      const requirementIds = similarRequirements.map((req: any) => req.id);

      // Step 2b: Generate answer using the requirements
      const answerResponse = await request.post(`${BACKEND_URL}/requirements/answer`, {
        data: {
          question: question.question_text,
          similar_requirement_ids: [],
          linked_requirement_ids: requirementIds,
        },
      });

      if (!answerResponse.ok()) {
        console.log(`      Failed to generate answer: ${answerResponse.status()}`);
        continue;
      }

      const answerResult = await answerResponse.json();

      if (!answerResult.context_sufficient) {
        console.log(`      Generated answer but context was insufficient`);
      } else {
        console.log(`      Generated answer successfully`);
      }

      // Step 2c: Save the answer
      const saveResponse = await request.post(
        `${BACKEND_URL}/questionnaires/questions/${question.id}/save_answer`,
        {
          data: {
            answer: answerResult.answer,
          },
        }
      );

      if (!saveResponse.ok()) {
        console.log(`      Failed to save answer: ${saveResponse.status()}`);
        continue;
      }

      // Step 2d: Create requirement-question links
      for (const requirementId of requirementIds) {
        const linkResponse = await request.post(
          `${BACKEND_URL}/requirements/${requirementId}/question-links`,
          {
            data: {
              question_id: question.id,
            },
          }
        );

        if (!linkResponse.ok()) {
          console.log(`      Failed to create link for requirement ${requirementId}: ${linkResponse.status()}`);
        }
      }

      console.log(`      Created ${requirementIds.length} requirement-question links`);
    } catch (error) {
      console.log(`      Error processing question: ${error}`);
    }
  }

  console.log(`   Completed workflow for all questions`);
}
