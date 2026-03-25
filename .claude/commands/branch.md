---
description: Analyze current git changes, infer intent, create a branch, commit, and open a PR if possible
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git checkout:*), Bash(git switch:*), Bash(git add:*), Bash(git commit:*), Bash(git rev-parse:*), Bash(git log:*), Bash(gh auth status:*), Bash(gh pr create:*), Bash(which gh:*), Bash(pwd:*), Bash(sed:*), Bash(tr:*)
argument-hint: [optional-component-scope]
---

## Context

- Working directory: !`pwd`
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Diff summary: !`git diff --stat && echo "\n--- STAGED ---\n" && git diff --cached --stat`
- Full unstaged diff: !`git diff`
- Full staged diff: !`git diff --cached`
- Recent commits: !`git log --oneline -10`

## Task

You are running the `/branch` workflow.

Your job is to inspect the current repository changes and then do the following carefully and in order.

### 1) Bail out if there is nothing to do

First determine whether there are meaningful tracked changes to commit.

Check both unstaged and staged changes. If there are no changes, stop immediately and reply with something like:

`Nothing to be done.`

Do not create a branch.
Do not stage anything.
Do not commit anything.
Do not attempt to create a PR.

### 2) Infer the intent of the change

Analyze the current diff from the perspective of a **consumer** of the codebase — not the author.

Ask yourself: "If someone who uses this component, module, or package saw this change in a changelog, what would they need to know?" The answer to that question is the intent. Do not describe the implementation mechanism; describe the outcome or impact.

For example, if the diff replaces a synchronous loader with an async one and adds a cache layer, the intent is NOT "refactor loader to async with caching" — it IS "improve loading times by caching results."

Choose exactly one conventional prefix:

- `feat`
- `fix`
- `docs`
- `chore`

Use these meanings:

- `feat` for a new user-facing capability or API enhancement
- `fix` for a bug fix, regression fix, accessibility fix, or behavior correction
- `docs` for documentation-only changes
- `chore` for maintenance, tooling, config, refactors without user-facing behavior change, or housekeeping

### 3) Determine the optional component or scope

If `$ARGUMENTS` is provided, use it as the scope.

Otherwise, if the changed files clearly point to one component, package, module, or area, use that as the scope.

Otherwise, ask the user exactly one concise question:

`What scope should I use in the PR title? For example client, server, auth, docs. Say "none" to omit it.`

Do not ask this question if the scope is already obvious from the diff or was provided in `$ARGUMENTS`.

### 4) Draft the PR title

Create a PR title in one of these forms:

- `feat(scope): intent`
- `fix(scope): intent`
- `docs(scope): intent`
- `chore(scope): intent`
- `feat: intent`
- `fix: intent`
- `docs: intent`
- `chore: intent`

Rules:

- Keep it concise and specific
- Use sentence case after the colon
- Do not end with a period
- The title MUST describe the change from the consumer's perspective. Describe the impact or outcome, not the implementation. If your draft title mentions internal mechanisms (e.g., "refactor X to use Y", "replace A with B", "migrate from C to D"), rewrite it to describe what the consumer gains or what behavior changed.
- After drafting, apply this self-check: "Would a user of this code understand why they should care about this change from the title alone?" If not, rewrite it.

Examples of rewriting implementation-focused titles into consumer-focused ones:

| ❌ Implementation-focused                                              | ✅ Consumer-focused                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `refactor(client): replace sync loader with async and add cache layer` | `feat(client): improve loading times by caching results`             |
| `fix(auth): update token refresh logic to retry on 401`                | `fix(auth): prevent unexpected logouts during session renewal`       |
| `chore(deps): bump react-query from v4 to v5`                          | `chore(deps): upgrade data-fetching library to latest major version` |
| `fix(ui): change Button onClick handler to use useCallback`            | `fix(ui): resolve unnecessary re-renders on button interactions`     |

Good title examples:

- `feat(client): improve loading times by caching results`
- `fix(server): handle edge case where user has no email`
- `docs: clarify local setup steps`
- `chore(build): update test runner configuration`

Bad title examples:

- `fix stuff`
- `update code`
- `changes`
- `refactor things`

### 5) Draft a commit body

If the change is simple, a subject-only commit is acceptable.

If the diff is non-trivial, add a short body that explains:

- what changed
- why it changed
- any important implementation detail
- any consumer impact or migration consideration

Keep the body concise, useful, and professional.

### 6) Create a branch name from the PR title

Generate a safe branch name derived from the PR title.

Rules for the branch name:

- lowercase
- replace spaces with underscores
- replace `:` with `_`
- remove characters that are awkward or unsafe in branch names
- remove parentheses but keep the scope text
- collapse duplicate separators
- trim leading and trailing separators

Examples:

- `feat(client): improve loading times by caching results` -> `feat_client_improve_loading_times_by_caching_results`
- `fix(server): handle edge case where user has no email` -> `fix_server_handle_edge_case_where_user_has_no_email`

Before creating the branch:

- inspect the current branch name
- if the current branch already appears to match this work reasonably well, ask the user whether to reuse it or create a new one
- otherwise create a new branch from the current `HEAD`

Prefer `git switch -c <branch>` if available, otherwise use `git checkout -b <branch>`.

### 7) Show a concise plan before write actions

Before creating the branch or committing, present a short summary with:

- inferred type
- scope if any
- PR title
- branch name
- whether a commit body will be used

Then ask for confirmation unless the user has explicitly indicated they want full automation.

### 8) Commit the changes

Once confirmed:

- stage the relevant changes
- create the branch if needed
- commit using the PR title as the subject
- include the commit body if you drafted one

### 9) Attempt to create a PR with GitHub CLI

Check whether `gh` is installed and authenticated.

Use:

- `which gh`
- `gh auth status`

If `gh` is available and authenticated, create the PR using the generated title and body.

If PR creation succeeds, report success and show the branch name and PR title.

If `gh` is unavailable, unauthenticated, or PR creation fails, do not keep retrying. Instead provide the user with:

- branch name
- commit subject
- PR title
- PR body
- the exact `gh pr create` command they can run manually

## Important behavior rules

- Be conservative. If intent is ambiguous, ask one concise clarification question rather than guessing.
- When drafting the PR title, NEVER describe the implementation mechanism. Always describe the consumer-visible outcome. This is the single most important quality of a good PR title. If you find yourself writing words like "refactor", "replace", "migrate", "update X to use Y", or "change implementation of", stop and reframe from the consumer's point of view.
- Do not create a branch, commit, or PR when there are no changes.
- Do not invent scope names that are not supported by the diff or user input.
- If both staged and unstaged changes exist, treat the full working tree as the candidate change set unless the user indicates otherwise.
- If there are untracked files, include them only if they are clearly part of the intended change.
