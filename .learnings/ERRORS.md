# Errors

## [ERR-20260805-001] repository-local-role-prompt-lookup

**Logged**: 2026-08-05T00:00:00+07:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
The workspace guidance referenced `./.codex/prompts/explore.md`, but the prompt is installed globally.

### Error
```
sed: .codex/prompts/explore.md: No such file or directory
```

### Context
- Attempted to load the required explorer role prompt before repository discovery.
- The available prompt was found at `/Users/naam.vu/.codex/prompts/explore.md`.

### Suggested Fix
Resolve role prompts from the global Codex prompt directory when the repository-local path is absent.

### Metadata
- Reproducible: yes
- Related Files: AGENTS.md

### Resolution
- **Resolved**: 2026-08-05T00:00:00+07:00
- **Notes**: Loaded the global prompt and continued with the required explorer workflow.

---

## [ERR-20260805-003] unsupported-explorer-model

**Logged**: 2026-08-05T00:02:00+07:00
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
The configured explorer model is unavailable for Codex under the current ChatGPT account.

### Error
```
The 'gpt-5.3-codex-spark' model is not supported when using Codex with a ChatGPT account.
```

### Context
- Launched the repository-discovery role required by the planning workflow.
- Child agent failed before returning repository facts.

### Suggested Fix
Configure an account-supported model for the `explore` role or allow role launches to inherit a supported model.

### Metadata
- Reproducible: yes
- Related Files: AGENTS.md

### Resolution
- **Resolved**: 2026-08-05T00:02:00+07:00
- **Notes**: Used direct read-only repository inspection, the documented plan-workflow fallback.

---

## [ERR-20260805-002] explorer-role-full-history-fork

**Logged**: 2026-08-05T00:01:00+07:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
An explicit explorer role cannot be combined with a full-history child-agent fork.

### Error
```
Full-history forked agents inherit the parent agent type; omit agent_type, or spawn without a full-history fork.
```

### Context
- Attempted repository discovery with `agent_type: explore` and `fork_turns: all`.

### Suggested Fix
Use `fork_turns: none` when selecting an explicit agent role, and include all required context in the task prompt.

### Metadata
- Reproducible: yes
- Related Files: AGENTS.md

### Resolution
- **Resolved**: 2026-08-05T00:01:00+07:00
- **Notes**: Relaunched using an isolated explicit-role fork.

---
