# Query Management

## Overview

Query management is where you upload questionnaires and get them automatically answered using your requirements database. Think of it as your intelligent questionnaire processor - you upload documents with questions, and the app generates answers based on the requirements you've stored in your product.

For a general introduction, see the **[Overview Guide](overview.md)**. Queries are managed within **[Products](product.md)** and use your **[Requirements](requirements.md)** database to generate answers. For setup instructions, see the **[Installation Guide](installation.md)**.

This is where all your requirements management work pays off. Instead of manually reading through dozens of documents to answer compliance questions, security assessments, or RFP questionnaires, the app does the heavy lifting and provides you with draft answers that you can review and approve.

## What Are Queries?

In the Rekwai app, "queries" refer to questionnaires that contain questions you need to answer. These could be:

- **Compliance questionnaires** (SOC 2, ISO 27001, GDPR assessments)
- **Security assessments** from clients or vendors
- **Request for Proposal (RFP) responses**
- **Due diligence questionnaires**
- **Audit preparation documents**
- **Customer security reviews**

Each questionnaire becomes a "query" in the system that gets processed to generate answers automatically.

## How Query Processing Works

### Step 1: Upload Your Questionnaire

1. Go to the Queries tab in your product
2. Click to upload a questionnaire document (PDF, Word, Excel, Text, or Markdown)
3. Enter the client or project name for this questionnaire
4. The app saves your document and begins processing

### Step 2: Automatic Question Extraction

**What You See:**
- A progress indicator while the app processes your document

**What the App Does:**
- Reads through your entire questionnaire document
- Identifies all the questions that need answers
- Extracts the question text and organizes it into a list
- Creates a record for each question that needs to be answered

### Step 3: Working in the Query Interface

**Interface Layout:**
- **Questions Tab**: Lists extracted questions with click navigation and completion indicators
- **Question Details**: Shows the selected question with linking and answer generation tools
- **Metadata Tab**: Displays questionnaire and question information including timestamps

#### Automatic Answer Generation

When you upload a questionnaire, Rekwai automatically processes each question:

1. **Searches your requirements database** to find relevant requirements
2. **Generates a draft answer** based on the requirements it found
3. **Links the requirements** it used as sources for the answer

When you open a question, you'll see the generated answer and the requirements Rekwai found. Your job is to **review and refine** - most of the work is already done.

#### Reviewing and Improving Answers

**The Requirement(s) Section:**
- Shows requirements Rekwai found and used to generate the answer
- Each requirement displays its description, types, and implementation status
- **Edit** (pencil icon): Modify the requirement details
- **Ignore** (X icon): Remove this requirement and exclude it from future suggestions

**Adding More Requirements:**
If Rekwai missed relevant requirements or you need more context:
- **Link requirement(s)**: Opens a modal to search and select from all requirements in your product
- **Create requirement**: Create a new requirement based on the question (Rekwai pre-fills the form)
- **Refresh** (rotate icon): Search for similar requirements again and auto-link matches

**Regenerating Answers:**
After adding or removing requirements:
1. Click "Regenerate answer" to generate an improved answer using the updated context
2. **Successful Generation**: Answer appears in the Result section and is automatically saved
3. **Insufficient Context**: System shows "Context insufficient" badge with a tooltip containing the partial answer - add more requirements and try again

**Answer Review and Editing:**
- **View Generated Answer**: Answer appears in the Result section with an edit button on hover
- **Edit Answer**: Click the edit icon to modify the answer text directly
- **Save Changes**: Click "Save" to store your edited answer

**Source Tracking:**
- The system shows which specific requirements were used (essential for compliance and audit trails)

**Navigation and Progress:**
- Use "Previous" and "Save & next" buttons to work through questions systematically
- Green checkmarks indicate questions with completed answers
- Progress is automatically saved - return to any questionnaire later to continue

This approach ensures each question only needs human attention once, building a smarter database that handles more questions automatically over time.

## Exporting Completed Questionnaires

Once you've reviewed and completed answers for a questionnaire, you can export it as a PDF document ready for submission.

**How to Export:**
1. Open a questionnaire by clicking on it in the Queries tab
2. In the questionnaire header, click the **Export** dropdown button
3. Choose one of the two export options:

**Export Options:**

- **Export answers**: Creates a PDF with just the questions and answers - ideal for clean, submission-ready documents
- **Export answers with requirements**: Creates a PDF that includes the linked requirements for each answer - useful for internal review, audit trails, or showing the source basis for each response

**What's Included in the PDF:**

- **Header**: Client name, product name, upload date, and source filename
- **Summary**: Total number of questions and how many have been answered
- **Q&A Table**: Each question with its corresponding answer
- **Linked Requirements** (optional): When using "with requirements" option, each answer shows the specific requirements that were used as sources

**Partial Exports:**

You don't need to complete all answers before exporting. Questions without answers will show "No answer yet" in the PDF. This allows you to export work-in-progress documents or questionnaires where some questions don't apply.

## Managing Your Questionnaires

**Main Queries Tab:**
- **Document Name**: Original filename of uploaded questionnaire
- **Client**: Project or client name
- **Uploaded**: Upload date
- **# of questions**: Total extracted questions
- **# answered**: Answered questions with percentage complete

**Actions:**
- Click any row to open the Question Extraction modal for processing
- Search by client name or document name
- Hover over rows to access download and delete actions
- Download original questionnaire files
- Keep completed questionnaires as references to track what was communicated to clients
- Delete questionnaires only if uploaded by mistake or contain errors

## Best Practices

- **Build requirements first**: Better requirements database = better generated answers (see **[Requirements Management](requirements.md)** for building your database)
- **Always review**: Verify answers before using - you maintain full control
- **Iterate**: Add more requirements and regenerate to improve answer quality over time
- **Keep requirements current**: When answers are wrong, fix the source requirement rather than just the answer - this ensures your database stays accurate for all stakeholders, internal and external

This transforms questionnaire response from manual research into a review process, typically reducing time by 70-80%. Your **[Requirements](requirements.md)** database becomes a single source of truth that can answer any question your stakeholders might ask.
