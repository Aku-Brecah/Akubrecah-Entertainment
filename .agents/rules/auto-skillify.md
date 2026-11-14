---
name: auto-skillify
version: 1.0.0
priority: P0
trigger: always_on
---

# Automatic Skill Extraction Rule (Auto-Skillify)

> Always-active workspace rule. Repeated multi-step patterns MUST be captured as reusable skills so knowledge compounds automatically across sessions.

---

## Trigger Conditions

You MUST load `@[skills/skillify]` (`.agents/skills/skillify/SKILL.md`) and create or update a reusable skill whenever **any** of the following holds:

1. **Repetitive Request Pattern**: The user requests the same category of multi-step task, UI refinement, debugging flow, deployment sequence, or audit **2 or more times** in a session or across recent project history.
2. **Recurring Multi-Step Workflow**: A task requires **4+ repeatable steps** (e.g., token alignment → responsive layout fix → policy/hygiene scan → typecheck/lint/test/build) that will clearly be reused in future turns.
3. **Explicit Repetition Signal**: The user corrects, repeats, or refines a recurring requirement across turns.

---

## Mandatory Extraction Protocol

1. **Check Existing Skills First**:
   - Inspect `.agents/skills/` and `.agent/skills/` to confirm no existing skill already covers the workflow. If one exists, update or extend it rather than duplicating it.
2. **Follow `@[skills/skillify]`**:
   - Announce `📚 Using skill: @skillify...` before creating or updating the skill.
   - Author `.agents/skills/<kebab-case-name>/SKILL.md` with valid frontmatter (`name`, `description`, `when_to_use`, `allowed-tools`, `effort`, `version`), clear trigger/exclusion criteria, concrete step-by-step protocol, and verification checks.
3. **Keep Project-Specific Hacks in Memory**:
   - Store one-off project facts in `.agents/memory/`, not as skills. Skills must capture repeatable, reusable engineering or design workflows.
4. **Verify**:
   - Ensure the new skill path, frontmatter, and verification steps are accurate and concise before finishing the turn.
