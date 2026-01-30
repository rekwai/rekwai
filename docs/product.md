# Product Management

## Overview

Products in Rekwai serve as organizational units for managing requirements and questionnaires. Each product functions as an isolated workspace containing its own requirements database and questionnaire processing pipeline.

For a general introduction, see the **[Overview Guide](overview.md)**. For setup instructions, see the **[Installation Guide](installation.md)**.

**Typical Use Cases:**
- Software applications or systems
- Business processes or workflows  
- Compliance frameworks or standards
- Project or departmental divisions

## Product Architecture

```
Organization
└── Products
    ├── Requirements
    ├── Queries
    └── Sources
```

Products are scoped within an organization and maintain complete data isolation from one another.

## Product Creation

### Creating Products

Access product creation through:
- "Create Your First Product" (when no products exist)
- "+ Add new" button in the sidebar

### Configuration Options

**Product Name** (Required)
- Unique identifier within your organization
- Used in navigation and product selection
- Maximum 25 characters

## Product Interface

### Navigation

Products display in the left sidebar with visual indicators:
- Selected product: highlighted with a dark background
- Arrow indicator shows active selection
- Click any product to switch context

### Workspace Tabs

**Requirements**
- Requirements database management
- CRUD operations for requirement records
- Default view when selecting a product
- See **[Requirements Management](requirements.md)** for detailed guide

**Queries**
- Questionnaire management and processing
- See **[Query Management](queries.md)** for detailed guide

**Sources**
- Document upload and management
- View and manage uploaded requirement documents
- Documents uploaded here trigger the requirement extraction workflow detailed in **[Requirements Management](requirements.md)**

### Product Settings

Access product settings dialog to:
- Edit product name (maximum 25 characters)
- Delete product and all associated data
- Changes require confirmation before saving

## Product Management

### Multi-Product Workflows

- Switch between products using sidebar navigation
- Each product maintains independent data sets
- Cross-product operations are not supported

### Data Isolation

Requirements and questionnaires are scoped to their parent product:
- Questionnaire processing uses only same-product requirements
- Deletion operations are confined to the selected product
- No data sharing between products
