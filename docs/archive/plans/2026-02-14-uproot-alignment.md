# Implementation Plan: Uproot Alignment Across Web & iOS

## Requirements Restatement

1. **Change uprooting from hard delete to status transition** — uprooted sprouts stay in derived state with `state: 'uprooted'`, preserving all data (water entries, bloom descriptions, leaf links)
2. **Remove broken "prune completed sprout" flow** on web (ancient artifact, dead code)
3. **Fix test fixture** — align `soilReturned` to the 25% production rate
4. **Add confirmation dialog to iOS** before uprooting
5. **Extract `uprootRefundRate`** into `shared/constants.json` as single source of truth
6. **Update documentation** — formulas, derivation algorithm, validation rules

## Risks

- **MEDIUM**: Changing derivation to preserve uprooted sprouts means all UI views that filter on `state === 'active'` or `state === 'completed'` will naturally exclude uprooted sprouts — but any `.sprouts.values()` calls without filtering will now include them. Must audit every consumer.
- **LOW**: Existing event logs are fully backwards compatible — no event payload changes. The only change is how `sprout_uprooted` events are *processed* during derivation.
- **LOW**: Older clients ignoring the new state will still work (they delete the sprout, losing data but not corrupting anything).

## Impact Analysis — Files Touched

### Shared (5 files)
1. `shared/constants.json` — add `uprootRefundRate`
2. `shared/generate-constants.js` — emit new constant for both TS and Swift
3. `shared/formulas.md` — add uproot refund formula section
4. `shared/docs/event-derivation-algorithm.md` — change DELETE to state transition
5. `shared/test-fixtures/event-derivation.json` — fix refund amount, update expected sproutCount

### Web (5 files)
6. `web/src/types.ts` — add `'uprooted'` to `SproutState` union
7. `web/src/events/derive.ts` — change `sprouts.delete()` to `sprout.state = 'uprooted'` + add `uprootedAt`; add `getUprootedSprouts()` helper; update `DerivedSprout.state` type
8. `web/src/ui/twig-view.ts` — remove prune flow; use shared constant for refund rate
9. `web/src/utils/validate-import.ts` — handle `'uprooted'` state in sanitization
10. `web/src/tests/derive.test.ts` — update uproot tests (sprout preserved, state = 'uprooted')

### iOS (3 files)
11. `ios/Trunk/Services/EventDerivation.swift` — add `.uprooted` to `SproutState` enum; change `removeValue` to state transition + add `uprootedAt`
12. `ios/Trunk/Views/Dialogs/SproutActionsView.swift` — add confirmation alert; use `SharedConstants.Soil.uprootRefundRate`; fix misleading comment
13. `ios/Trunk/Views/SproutsView.swift` — add `'uprooted'` case to `SproutFilter` (display in history, distinct from completed)

### Generated (2 files, auto-generated)
14. `web/src/generated/constants.ts` — regenerated (adds `SOIL_UPROOT_REFUND_RATE`)
15. `ios/Trunk/Generated/SharedConstants.swift` — regenerated (adds `Soil.uprootRefundRate`)

## Implementation Phases

### Phase A: Shared Constants & Docs (no behavior change)

**A1. Add constant to `shared/constants.json`**
```json
"soil": {
  ...existing...,
  "uprootRefundRate": 0.25
}
```

**A2. Update `shared/generate-constants.js`**
- TypeScript: emit `export const SOIL_UPROOT_REFUND_RATE = 0.25`
- Swift: emit `static let uprootRefundRate: Double = 0.25`

**A3. Regenerate constants** — run `node shared/generate-constants.js`

**A4. Add uproot formula to `shared/formulas.md`**
```markdown
## Uproot Refund Calculation

When a sprout is uprooted, partial soil is returned:

soilReturned = soilCost × uprootRefundRate (0.25)

Soil is clamped: min(soilAvailable + soilReturned, soilCapacity)
No capacity change (unlike harvest).
```

**A5. Update `shared/docs/event-derivation-algorithm.md`**
- Line 47: change `Enum("active", "completed")` → `Enum("active", "completed", "uprooted")`
- Add `uprootedAt: Timestamp?` field to DerivedSprout
- Lines 181-186: change `DELETE sprouts[event.sproutId]` to:
  ```
  sprout = sprouts[event.sproutId]
  IF sprout EXISTS AND sprout.state == "active":
      sprout.state = "uprooted"
      sprout.uprootedAt = event.timestamp
  ```

**A6. Fix test fixture `shared/test-fixtures/event-derivation.json`**
- Change `"soilReturned": 5` → `"soilReturned": 2.5` (10 × 0.25)
- Change `"soilAvailable": 5` → `"soilAvailable": 2.5`
- Change `"sproutCount": 0` → `"sproutCount": 1`
- Update `_note` to reflect new behavior

### Phase B: Web Platform Changes

**B1. Update `web/src/types.ts`**
- Line 11: `export type SproutState = 'active' | 'completed' | 'uprooted'`

**B2. Update `web/src/events/derive.ts`**
- Line 35: `state: 'active' | 'completed' | 'uprooted'`
- Add field: `uprootedAt?: string`
- Import `SOIL_UPROOT_REFUND_RATE` from generated constants (for reference/validation, though actual refund comes from event payload)
- Lines 141-146: Replace delete with state transition:
  ```typescript
  case 'sprout_uprooted': {
    soilAvailable = Math.min(soilAvailable + event.soilReturned, soilCapacity)
    const sprout = sprouts.get(event.sproutId)
    if (sprout && sprout.state === 'active') {
      sprout.state = 'uprooted'
      sprout.uprootedAt = event.timestamp
    }
    break
  }
  ```
- `getActiveSprouts()` — already filters `state === 'active'`, naturally excludes uprooted. No change needed.
- `getCompletedSprouts()` — already filters `state === 'completed'`, naturally excludes uprooted. No change needed.
- `getAllWaterEntries()` — currently iterates all sprouts. Will now include water entries from uprooted sprouts. This is CORRECT — preserving history.

**B3. Update `web/src/ui/twig-view.ts`**
- Import `SOIL_UPROOT_REFUND_RATE` from generated constants
- Lines 486, 500: Replace `sprout.soilCost * 0.25` with `sprout.soilCost * SOIL_UPROOT_REFUND_RATE`
- Lines 491-496: Remove the completed sprout "prune" branch entirely
- Line 482: Remove the `if (sprout.state === 'active')` gate on line 499 — after removing prune, we only need the uproot path
- Line 309: Remove delete button from history cards (completed sprouts should not be deletable)

**B4. Update `web/src/utils/validate-import.ts`**
- Line 134-136: Add `'uprooted'` as a recognized state that maps to `'uprooted'` (not active):
  ```typescript
  if (s.state === 'completed' || s.state === 'failed') {
    state = 'completed'
  } else if (s.state === 'uprooted') {
    state = 'uprooted'
  } else {
    state = 'active'
  }
  ```

**B5. Update `web/src/ui/twig-view.ts` rendering**
- `getHistorySprouts()` (line 230): Change to include `completed` only (already correct — uprooted sprouts won't match `'completed'`)
- Consider: Should uprooted sprouts appear in the Cultivated column? **No** — they were abandoned, not cultivated. They'll be accessible via leaf saga view if linked.
- `getSprouts()` uses `getSproutsForTwig()` which returns ALL sprouts for a twig. Uprooted sprouts will now appear in this list. The existing `getActiveSprouts()` and `getHistorySprouts()` filters will correctly exclude them. No rendering change needed — uprooted sprouts simply won't appear in either column (same visual behavior as before, but data is preserved for leaf saga history).

**B6. Update `web/src/ui/leaf-view.ts`**
- Line 126: The leaf view shows sprout history. Uprooted sprouts should now appear with an "uprooted" indicator instead of being missing from the saga.

**B7. Update tests `web/src/tests/derive.test.ts`**
- Update uproot test cases: sprout should remain in state with `state: 'uprooted'`
- Verify `getActiveSprouts()` excludes uprooted
- Verify `getCompletedSprouts()` excludes uprooted
- Verify soil return is correct

### Phase C: iOS Platform Changes

**C1. Update `ios/Trunk/Services/EventDerivation.swift`**
- Line 51-54: Add `case uprooted` to `SproutState` enum
- Add `var uprootedAt: Date?` to `DerivedSprout` struct
- Lines 257-271: Replace `removeValue` with state transition:
  ```swift
  if var sprout = sprouts[sproutId], sprout.state == .active {
      sprout.state = .uprooted
      sprout.uprootedAt = Date(timeIntervalSince1970: event.timestamp.timeIntervalSince1970)
      sprouts[sproutId] = sprout
  }
  ```
- `getActiveSprouts()` (line 411) — already filters `.active`, naturally excludes uprooted. No change.
- `getCompletedSprouts()` (line 416) — already filters `.completed`, naturally excludes uprooted. No change.

**C2. Update `ios/Trunk/Views/Dialogs/SproutActionsView.swift`**
- Replace hardcoded `0.25` with `SharedConstants.Soil.uprootRefundRate`
- Add `@State private var showUprootConfirmation = false`
- Wrap uproot button action in `.confirmationDialog()` alert
- Fix misleading comment on line 320: change "rolled back" to "queued for retry"

**C3. Update `ios/Trunk/Views/SproutsView.swift`**
- `SproutFilter` enum: Consider adding `.uprooted` case for filtering
- All `.state == .active` / `.state == .completed` filters naturally exclude uprooted. No changes needed for existing UI.
- Status display (line 417): Add `'uprooted'` case for display purposes

**C4. Update `ios/TrunkTests/SproutModelTests.swift`**
- Add test for `SproutState.uprooted.rawValue == "uprooted"`

### Phase D: Verification

**D1. Run web tests**: `cd web && npm test`
**D2. Run web build**: `cd web && npm run build`
**D3. Run iOS tests** (if available): verify in Xcode
**D4. Regenerate constants and verify**: `node shared/generate-constants.js`

## Backwards Compatibility

- **Event payload**: UNCHANGED. No migration needed.
- **Event processing**: Only the derivation logic changes (soft delete → state transition)
- **Older clients**: Will still `delete` the sprout. Data loss but no corruption. When they upgrade, the sprout will be preserved on next derivation.
- **Imports**: Updated validation handles `'uprooted'` state correctly.
- **Exports**: Uprooted sprouts will now appear in exports (more complete data).

## Estimated Complexity: MEDIUM

- Shared: ~30 min (constants, docs, fixtures)
- Web: ~45 min (types, derive, UI, tests)
- iOS: ~30 min (enum, derivation, confirmation dialog)
- Verification: ~15 min

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify)
