# Rekwai App Overview

## What is the Rekwai App?

The Rekwai App is a smart document processing system that helps organizations manage requirements and answer questionnaires efficiently. Whether you're dealing with business requirements, compliance standards, project specifications, or any other type of organizational requirements, Rekwai automates these tasks while keeping humans in control of important decisions.

To get started, see the **[Installation Guide](installation.md)** for complete setup instructions.



## What Can You Do With It?

### 1. Upload and Process Source Documents

- Upload source documents containing any type of requirements (PDF, Word, Excel files)
- The app automatically reads through your documents and extracts all the requirements
- You can also manually add requirements directly into the system
- Requirements are organized and stored in a central database
- You can review and manage all your requirements in one place

→ **Learn more:** [Requirements Management Guide](requirements.md)

### 2. Process Questionnaires Automatically

- Upload questionnaires that you need to complete
- The app finds the relevant questions in your questionnaire
- It automatically generates answers based on your stored requirements
- Each answer shows which specific requirements were used to generate it (source tracking)
- You review and approve the answers before finalizing
- Export completed questionnaires as PDF (with or without linked requirements for audit trails)

→ **Learn more:** [Query Management Guide](queries.md)

## How It Works

### Requirements Management Workflow

1. **Upload Your Source Documents** - Drop in any document containing requirements
2. **Automatic Extraction** - The app reads through and identifies all requirements
3. **Review and Organize** - You can review what was found and make any adjustments
4. **Smart Duplicate Detection** - The app identifies if requirements are duplicates or updates
5. **Build Your Database** - All approved requirements are stored for future use

For detailed workflows and features, see **[Requirements Management](requirements.md)**.

### Questionnaire Processing Workflow

1. **Upload a Questionnaire** - Drop in any questionnaire you need to complete
2. **Question Detection** - The app identifies all questions that need answers
3. **Smart Answer Generation** - The app finds relevant requirements and suggests answers
4. **Review and Approve** - You review each answer and can modify or approve them
5. **Export Completed Document** - Download your finished questionnaire as PDF

For detailed workflows and interface guide, see **[Query Management](queries.md)**.

## Key Benefits

- **Save Time**: Automate the tedious work of reading documents and writing responses
- **Stay Consistent**: All answers are based on your actual requirements database
- **Maintain Control**: You review and approve everything before it's final
- **Track Everything**: See what requirements you have and where they came from
- **Reduce Errors**: Automated processing reduces manual mistakes

## Getting Started

First, follow the **[Installation Guide](installation.md)** to set up the Rekwai App with Docker and your AI provider API key.

The app has three main sections organized within **[Products](product.md)**:

- **Requirements**: Where you manage your requirements database → See **[Requirements Management](requirements.md)**
- **Queries**: Where you upload questionnaires and process them into completed responses → See **[Query Management](queries.md)**
- **Sources**: Where you upload and manage your source documents (PDFs, Word, Excel). Documents uploaded here are processed to extract requirements into your database.

Start by creating a **[Product](product.md)** workspace, then upload some source documents to build your requirements database. Then you can process questionnaires using those stored requirements.
