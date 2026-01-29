# Sun Simplification Design

**Date**: 2026-01-28
**Status**: Approved

## Summary

Simplify the sun feature so it always targets one of the 64 twigs (life facets). Remove leaf/saga targeting entirely. Migrate prompts from plain text to structured JSON with generic prompts (dynamic `{twig}` insertion) and 3 hand-crafted prompts per twig.

## Current State

- Sun randomly selects either a **twig** or a **leaf** (50/50 odds when leaves exist)
- 73 generic prompts stored in `sun-prompts.txt`
- Prompts are retrospective-biased ("this week", "recently")

## Design

### Twig-Only Targeting

Sun always selects from the 64 twigs. Pure random, equal odds. Leaf reflection is removed — users reflect on sagas through watering sprouts instead.

### Hybrid Prompt System

**75% Generic Prompts** (~50-60 prompts):
- Use `{twig}` token replaced at runtime with the twig's label
- Balanced across temporal orientations:
  - Past: "What did {twig} teach you recently?"
  - Present: "How does {twig} feel in your life right now?"
  - Future: "What would you like {twig} to become?"
  - Timeless: "Why does {twig} matter to you?"

**25% Twig-Specific Prompts** (3 per twig = 192 total):
- Hand-crafted for each of the 64 twigs
- Draw on the twig's note/description for context
- Also balanced across temporal orientations

### Prompt File Structure

New file: `web/src/assets/sun-prompts.json`

```json
{
  "generic": [
    "How has {twig} shown up in your life recently?",
    "What would you like {twig} to become?",
    "Why does {twig} matter to you?",
    "..."
  ],
  "specific": {
    "branch-0-twig-0": [
      "What movement did your body crave?",
      "Where would you like your feet to take you?",
      "How does it feel to be in motion?"
    ],
    "branch-0-twig-1": [
      "What felt heavy—literally or figuratively?",
      "What strength are you building toward?",
      "When did you feel powerful?"
    ]
  }
}
```

Delete: `web/src/assets/sun-prompts.txt`

### Selection Algorithm

1. **Select twig**: Random from all 64 twigs (equal odds)
2. **Select pool**: 75% chance generic, 25% chance twig-specific
3. **Select prompt**: Random from pool, excluding recently shown
4. **Replace token**: If generic, replace `{twig}` with twig label

### Rotation Tracking

- Single global "recently shown" list (in-memory, not persisted)
- Size: ~15 prompts blocked at any time
- If selected pool is exhausted (e.g., all 3 specific prompts recently shown), fall back to the other pool
- If both pools exhausted (unlikely), clear recent list and restart

### Type Changes

Simplify `SunEntry.context` in `types.ts`:

```typescript
// Before
context: {
  type: 'twig' | 'leaf'
  twigId: string
  twigLabel: string
  leafId?: string
  leafTitle?: string
}

// After
context: {
  twigId: string
  twigLabel: string
}
```

No backwards compatibility needed — assuming fresh sun log.

## Files to Change

| File | Change |
|------|--------|
| `web/src/assets/sun-prompts.txt` | Delete |
| `web/src/assets/sun-prompts.json` | Create (new structure) |
| `web/src/features/shine-dialog.ts` | Remove leaf logic, load JSON, weighted selection, rotation tracking |
| `web/src/types.ts` | Simplify `SunEntry.context` type |
| `web/src/state/index.ts` | Remove leaf-related sun entry handling if any |

## Not Changing

- Sun resource mechanics (1/week, resets Sunday 6am)
- Soil recovery (+0.35 per shine)
- Sun log storage location (`trunk-notes-v1`)
- UI dialog layout (same structure, just no leaf display)
- Keyboard shortcuts or navigation

## Prompt Writing Guidelines

When creating the 192 twig-specific prompts:

1. Reference the twig's note for thematic guidance (e.g., "movement" = "locomotion; ambulation; cardio")
2. Balance temporal orientations (past/present/future/timeless)
3. Keep prompts open-ended, not yes/no
4. Avoid assuming recent activity — user may not have engaged with this facet recently
5. Prompts should invite reflection, not guilt

## Branch/Twig Reference

| Branch | Twigs |
|--------|-------|
| CORE (fitness & vitality) | movement, strength, sport, technique, maintenance, nutrition, sleep, appearance |
| BRAIN (knowledge & curiosity) | reading, writing, reasoning, focus, memory, analysis, dialogue, exploration |
| VOICE (expression & creativity) | practice, composition, interpretation, performance, consumption, curation, completion, publication |
| HANDS (making & craft) | design, fabrication, assembly, repair, refinement, tooling, tending, preparation |
| HEART (love & family) | homemaking, care, presence, intimacy, communication, ritual, adventure, joy |
| BREATH (regulation & renewal) | observation, nature, flow, repose, idleness, exposure, abstinence, reflection |
| BACK (belonging & community) | connection, support, gathering, membership, stewardship, advocacy, service, culture |
| FEET (stability & direction) | work, development, positioning, ventures, finance, operations, planning, administration |
