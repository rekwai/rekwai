#!/bin/bash
set -e

# Handle Ctrl+C - exit immediately
trap 'echo ""; echo "Interrupted. Exiting..."; exit 1' INT TERM

# Codebase Review Script
# Runs Claude Code analysis on each source file and saves results to reviews/

# Configuration
OUTPUT_DIR="reviews"

# Change to repo root
cd "$(git rev-parse --show-toplevel)"

# Get list of source files (respects .gitignore)
# Backend: Python files (excluding tests)
mapfile -t BACKEND_FILES < <(git ls-files "backend" | grep '\.py$' | grep -v '/tests/')
# Frontend: TypeScript and TSX files
mapfile -t FRONTEND_FILES < <(git ls-files "frontend" | grep -E '\.(ts|tsx)$')

# Combine arrays
FILES=("${BACKEND_FILES[@]}" "${FRONTEND_FILES[@]}")
TOTAL=${#FILES[@]}

if [ "$TOTAL" -eq 0 ]; then
    echo "No source files found"
    exit 1
fi

echo "Found $TOTAL source files to analyze:"
echo "  - ${#BACKEND_FILES[@]} Python (backend, excluding tests)"
echo "  - ${#FRONTEND_FILES[@]} TypeScript/TSX (frontend)"
echo "Output will be saved to $OUTPUT_DIR/"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# The analysis prompt (comprehensive code review)
read -r -d '' ANALYZE_PROMPT << 'EOF' || true
You are a senior software engineer conducting a thorough code review.

**Core Principles**:
- **DRY (Don't Repeat Yourself)**: Eliminate code duplication and promote reusability
- **YAGNI (You Aren't Gonna Need It)**: Remove unnecessary complexity and unused features
- **KISS (Keep It Simple, Stupid)**: Favor simplicity over cleverness
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion

**Instructions**:

1. **Read the target file** completely

2. **Search for usage**: For each exported function/class, search codebase to verify it's used

3. **Use Context7 MCP**: If you encounter a library you're not familiar with or unsure about best practices for, use the mcp__context7__resolve-library-id and mcp__context7__get-library-docs tools to look up current documentation

4. **Analyze for**:
   - **Deadcode**: Unused imports, functions, variables, classes
   - **Code duplication**: Repeated logic that should be extracted
   - **Overengineering**:
     - Unnecessary abstractions or indirection
     - Error handling for cases that would fail earlier in the flow
     - Fallbacks that hide problems instead of surfacing them
     - Defensive null checks when the value can never be null
     - Edge case handling for scenarios that can't actually happen
     - Try/catch blocks that swallow exceptions or return silent defaults
     - Error handling "just in case" without a clear purpose
     - Error handling that doesn't surface the error to the user (if you catch an error, show it to the user)
   - **Type safety issues**: Missing types, improper null handling
   - **SOLID violations**: Classes doing too much, tight coupling, mixed concerns

**DO NOT CRITIQUE**:
- Feature additions or business logic decisions
- UI/UX placement decisions
- Magic numbers

4. **Output format**:

ONLY output a numbered list of actions. Nothing else. No explanations, no headers, no commentary.

Example (Python):
1. `file:42` - Remove unused import `from typing import Optional`
2. `file:156` - Extract duplicate validation logic into helper function
3. `file:89-120` - Split `process_data()` - handles both fetching and transformation (Single Responsibility)
4. `file:203` - Network call silently returns None on failure - should raise or log

Example (TypeScript/React):
1. `file:12` - Remove unused import `import { useState } from 'react'`
2. `file:45-60` - Extract repeated API error handling into custom hook
3. `file:88` - Missing type annotation on `handleSubmit` parameter

If the file is clean, output ONLY: NO_ISSUES

**Guidelines**:
- Maximum 10 actions - most impactful first
- Each action must have a specific line reference
- Focus on code quality, not business logic
- Do NOT add any explanation after the list
EOF

# Analyze each file
COUNT=0
FILES_WITH_ISSUES=0
for file in "${FILES[@]}"; do
    COUNT=$((COUNT + 1))

    # Determine output path based on file type
    # Strip extension and add .md
    base_name="${file%.*}"
    output_file="$OUTPUT_DIR/${base_name}.md"

    # Skip empty files
    if [ ! -s "$file" ]; then
        echo "[$COUNT/$TOTAL] Skipping empty file: $file"
        continue
    fi

    echo "[$COUNT/$TOTAL] Analyzing: $file"

    # Run Claude with the analysis prompt, capture output
    result=$(claude -p "$ANALYZE_PROMPT

Analyze this file: $file" 2>&1) || {
        echo "  Warning: Analysis failed for $file"
        continue
    }

    # Only save if there are issues (not "NO_ISSUES")
    if ! echo "$result" | grep -qi "^NO_ISSUES"; then
        # Create subdirectories as needed
        mkdir -p "$(dirname "$output_file")"
        echo "$result" > "$output_file"
        echo "  -> Saved to $output_file"
        FILES_WITH_ISSUES=$((FILES_WITH_ISSUES + 1))
    fi
done

echo ""
echo "Done! Found issues in $FILES_WITH_ISSUES of $TOTAL files."
if [ "$FILES_WITH_ISSUES" -gt 0 ]; then
    echo "Reviews saved to $OUTPUT_DIR/"
fi
