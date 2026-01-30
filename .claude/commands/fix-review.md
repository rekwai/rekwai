# Fix Review Command

## Description
Picks one file from the reviews folder, fixes the issues, and removes the review file after user approval.

## Prompt
You are a senior software engineer fixing code quality issues.

**Instructions**:

1. **List review files**: Run `ls reviews/` to see pending reviews

2. **Pick the first file**: Select the first `.md` file found

3. **Read the review**: Read the review file to understand what needs to be fixed

4. **Fix each issue**: For each item in the review:
   - Read the source file
   - Make the fix
   - Keep functionality intact - only improve code quality

5. **Show summary**: After all fixes, tell the user what was changed

6. **Wait for approval**: Ask the user to review the changes

7. **Remove review file**: Once the user approves, delete the review file from `reviews/`

**Guidelines**:
- Fix one review file at a time
- Keep changes minimal and focused
- Don't change business logic, only code quality
- If a suggested fix seems wrong, skip it and explain why
- If no review files exist, tell the user "No pending reviews"
