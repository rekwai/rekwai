# Requirements Management

## Overview

Requirements management helps you build a central database of all your organizational requirements. You can upload documents to automatically extract requirements, or add them manually. This database becomes the foundation for automatically answering questionnaires later.

For a general introduction, see the **[Overview Guide](overview.md)**. Requirements are managed within **[Products](product.md)** - make sure you have a product workspace set up first. For setup instructions, see the **[Installation Guide](installation.md)**.

The Rekwai app maintains a complete history of where each requirement came from, creating an automated evidence trail that saves you time when answering compliance questions. When you upload a source, the system finds statements that look like requirements, decides if this is a new requirement or matches something you already have, and remembers exactly where it came from.

## What Are Requirements?

Requirements are statements that describe what your organization, system, or project needs to do or achieve. The Rekwai app automatically identifies and categorizes these from your sources, recognizing different types such as:

- **Functional Requirements**: What the system should do (e.g., "Users must be able to login with their email")
- **Non-Functional Requirements**: How the system should perform (e.g., "The system must respond within 2 seconds")
- **Security Requirements**: How to keep things secure (e.g., "All data must be encrypted")
- **Business Requirements**: What the business needs (e.g., "Reports must be generated monthly")

The app automatically determines which categories each requirement belongs to, and requirements can have **multiple types** assigned simultaneously. For example, a requirement might be classified as both "Security" and "Functional" if it describes secure functionality.

Each requirement has:
- **Description**: What needs to be done
- **Types**: The categories (automatically assigned, can have multiple types)
- **Implementation Status**: The current state of the requirement:
  - **Implemented**: Already working and complete
  - **Planned**: Scheduled for future work
  - **To do**: Needs to be done but not yet scheduled
  - **Won't do**: Decided not to implement
- **Implementation Details**: How it's being handled
- **Requirement Verification**: How the requirement can be verified or tested
- **Source Traceability**: Exactly which source and statement it came from

## How to Work with Requirements

### Option 1: Upload Sources (Recommended)

This approach leverages the system's automatic processing to build a comprehensive, evidence-backed requirements database.

#### Step 1: Upload Your Source

1. Select your product workspace
2. Click the "Upload" dropdown and select "Upload Source"
3. Choose a source file containing requirements (PDF, Word, Excel, etc.)
4. Wait for processing to complete - the dialog shows step-by-step progress indicators

#### Step 2: Automatic Processing

**What You See:**
- A progress indicator showing each processing step

**What the System Does:**
1. **Extracts requirements** from your document
2. **Categorizes each requirement** by type (Security, Functional, etc.)
3. **Analyzes implementation status** based on document context
4. **Generates verification methods** for each requirement
5. **Searches your existing database** and links similar requirements automatically

When processing completes, you are navigated to the Requirement Indexing page where the heavy lifting is already done.

#### Step 3: Working in the Requirement Indexing Interface

**Interface Layout:**
- **Left Panel**: All extracted requirements, each with an indicator showing its suggested action (link, merge, or create) and a checkmark once the row has been resolved
- **Metadata Tab**: Document information (key, name, type, size) and upload date
- **Right Panel**: Details for the selected requirement and its Rekwai suggestion

When you open an extracted requirement, Rekwai shows a single **suggested action** for it. Your job is to **review and confirm** - most of the analysis is already done.

#### Reviewing and Confirming Suggestions

For each extracted requirement, Rekwai recommends exactly one of three actions and explains its reasoning in a **Suggestion** banner:

- **Link Requirements**: the source matches one or more existing requirements; confirming links them
- **Merge Requirements**: the source adds detail to an existing requirement; the banner shows a diff preview of the merged text
- **Create Requirement**: no good match exists; confirming creates a new requirement from the source (a preview card shows what will be created)

**Working with a suggestion:**
- **Confirm**: Click the action button (e.g. "Merge Requirements") to apply the suggested action
- **Edit**: Adjust the details before confirming. For a merge, edit the merged text; for a create, edit the requirement that will be created
- **Inspect the target**: When a suggestion references an existing requirement, its key is a link you can click to view that requirement's full details

**After you confirm:**
- A status banner appears summarizing what happened (merged or created) with an **Undo** option and a quick **Edit** link
- The row is marked complete in the left panel

**If there's no suggestion** (or you want a different outcome), the panel offers a fallback with:
- **Re-run suggestion**: Ask Rekwai to analyze the requirement again
- **Link Requirements**: Open a modal to search and select from all requirements in your product
- **Add requirement**: Create a new requirement based on the source (the form is pre-filled)

#### Navigation and Progress

- Use "Previous" and "Next" buttons to work through requirements systematically
- Green checkmarks indicate requirements that have been resolved (linked, merged, or created)
- Progress is automatically saved - return to any source later to continue
- Click "Close" on the last requirement to finish

#### Bulk Operations

**Accept All Suggestions:**
- Use the "Accept all suggestions" button in the header to approve the stored Rekwai suggestions for all unresolved source requirements at once.
- Rekwai will link, merge, or create requirements according to the suggestion shown for each row.
- If multiple merge suggestions target the same existing requirement, Rekwai accepts the first one, refreshes the skipped rows, and leaves them for manual review.
- Rows that are already resolved are considered complete and will not receive new suggestions.

### Option 2: Add Requirements Manually

**What You Do:**
1. Click "Create Requirement"
2. Type the requirement description
3. Select or type a requirement type
4. Choose the implementation status (implemented, planned, to-do, won't do)
5. Add implementation details
6. Add requirement verification details (how the requirement can be verified or tested)
7. Click "Create"

**Note:** Manual requirements won't have automatic source traceability, but you can add source information in the implementation details if needed.

## Managing Your Requirements

### Viewing Your Requirements
- All your requirements appear in a comprehensive data table on the Requirements tab
- **Advanced search**: Use the search box to find specific requirements by typing keywords in descriptions, types, or implementation details
- **Multiple selection**: Select multiple requirements using checkboxes for bulk operations
- **Type indicators**: Visual badges show all assigned types with color coding
- **Implementation status**: Color-coded status indicators with hover tooltips showing implementation details
- **Source traceability**: Click on any requirement to see full details, including complete source traceability when available

### Editing Requirements
1. Click on a requirement to open the details panel
2. Make your changes to description, type, status, or implementation details
3. Changes save automatically
4. The system maintains a complete change history including:
   - Manual edits to requirement details
   - Modifications from source merging operations
   - Updates to implementation status over time
   - Original source traceability preservation

### Deleting Requirements
- **Bulk deletion**: Check the boxes next to multiple requirements and use the "Delete requirements" button
- **Individual deletion**: Click the trash icon on individual requirements for single deletions
- **Source management**: Delete entire sources and their associated extracted requirements from the Sources tab
- **Confirmation**: System requests confirmation before permanent deletion to prevent accidental loss

> **⚠️ Important:** For a complete understanding of your product or project, consider keeping all requirements in the system - even those that are no longer valid. Instead of deleting outdated requirements, mark them as "Won't do" and explain the reasoning in the implementation details. This preserves your decision-making history and helps you remember what was considered but ultimately rejected, which is valuable context for understanding how your project evolved.

## Source Management

The Rekwai app provides comprehensive source management capabilities to help you organize and track all your requirement sources.

### Sources Tab Features
- **Source library**: View all uploaded requirement sources with their key, document name, extracted requirement count, and upload date
- **Download sources**: Download original files for offline reference or sharing
- **Source details**: See exactly how many requirements were extracted from each source
- **Source deletion**: Remove sources and all their associated extracted requirements. This breaks the links to main requirements but preserves the main requirements themselves
- **File format support**: Upload PDFs, Word documents, Excel spreadsheets, and other common formats

### Integration with Questionnaires

Your requirements database integrates with the questionnaire system to automatically generate answers to compliance questions. See **[Query Management](queries.md)** for details.

## Why Traceability Matters

When someone asks a compliance question, instead of manually hunting through 50 sources, the system works like this:

- **Client:** "Do you have MFA?"
- **System:** Searches your requirements → Finds "MFA requirement" → Looks up the traceability records → Says "Yes, we have MFA. Here's proof: Source A said this, Source B said that."

As you add more sources over time, your answers get more complete but you never lose track of them:
- **Remembers sources**: Maintains complete traceability to original sources
- **Finds matches**: Locates relevant requirements even when questions use different terminology
- **Tracks changes**: Maintains a complete audit trail of how requirements evolve over time
- **Builds over time**: Each new source enriches your database for future responses

The requirements you build here become the source for automatically answering questionnaires later, so the more complete and accurate your database, the better your questionnaire responses will be.
