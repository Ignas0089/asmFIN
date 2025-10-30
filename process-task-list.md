# Rule: Processing an AI Dev Tasks Task List

## Goal

Guide the AI assistant to execute a generated task list methodically: one subtask at a time, keeping the list up to date, and requesting the user's approval before starting the next subtask.

## Process

1. **Confirm the task list**
   - Read the Markdown task list provided by the user.
   - If the list is missing required sections or statuses, ask the user to clarify or provide the correct format before proceeding.
2. **Select the next subtask**
   - Identify the highest-priority subtask that is still marked as `TODO`.
   - Do **not** start multiple subtasks simultaneously; focus on a single subtask at a time.
3. **Set status to `IN PROGRESS`**
   - Update the task list snippet shown in your reply so the chosen subtask is marked as `IN PROGRESS` (others remain unchanged).
   - Share any assumptions or clarifying questions needed before you can continue.
4. **Execute the subtask**
   - Provide the reasoning, commands, and code edits needed to complete the subtask.
   - Keep the user informed of intermediate results or blockers. Ask for help if necessary.
5. **Mark the subtask as `DONE`**
   - Once the subtask is complete, update the task list in your response to reflect the new status.
   - Summarize what changed and surface any follow-up considerations.
6. **Request approval before continuing**
   - Explicitly ask the user to review the updated task list and confirm whether you should proceed to the next subtask.
   - Do not begin another subtask until the user grants approval.

## Additional Guidelines

- Always include the latest task list (or the relevant portion) in each reply so the user can track progress.
- If the user revises the task list, re-evaluate which subtask should be handled next and update statuses accordingly.
- When all subtasks are `DONE`, present a final summary and confirm completion.
- Remain within the user's requested scope; if a subtask appears ambiguous or out of scope, clarify before working on it.
- If a command or edit fails, report the failure, revert any partial changes when possible, and ask how to proceed.
