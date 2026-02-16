# Cross-Platform Protocols

This document defines technical standards that must be implemented identically across all platforms (web, iOS).

## Timestamp Format

**Standard**: ISO 8601 with milliseconds precision in UTC timezone.

**Format Pattern**: `YYYY-MM-DDTHH:mm:ss.SSSZ`

**Examples**:
- `2024-01-15T10:30:00.123Z` ✅
- `2024-01-15T10:30:00.000Z` ✅ (zero milliseconds)
- `2024-12-31T23:59:59.999Z` ✅
- `2024-01-15T10:30:00Z` ❌ (missing milliseconds)
- `2024-01-15T10:30:00.12Z` ❌ (only 2 digits)

**Rationale**:
- Consistent 3-digit millisecond precision across platforms prevents rounding errors
- Simplifies debugging (all timestamps have same format)
- Ensures proper event ordering in distributed systems

### Platform Implementation

**Web (JavaScript/TypeScript)**:
```typescript
const timestamp = new Date().toISOString()
// Produces: "2024-01-15T10:30:00.123Z"
```

**iOS (Swift)**:
```swift
import Foundation

let formatter = ISO8601DateFormatter()
formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
formatter.timeZone = TimeZone(identifier: "UTC")
let timestamp = formatter.string(from: Date())
// Produces: "2024-01-15T10:30:00.123Z"
```

### Parsing

Both platforms must accept timestamps **with or without** milliseconds for backward compatibility:
- Parser should try fractional format first
- Fall back to non-fractional format if parse fails
- This allows reading old data while writing new data in standardized format

**Web**:
```typescript
const date = new Date(timestamp) // Handles both formats natively
```

**iOS**:
```swift
// Try fractional first, fall back to non-fractional
ISO8601.parse(timestamp)
```

### Validation

Reference test fixture: `shared/test-fixtures/timestamp-validation.json`

**Regex pattern**: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`

**Schema validation** (JSON Schema):
```json
{
  "type": "string",
  "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$"
}
```

### Migration Notes

- **Old data**: Events created before this standard may have timestamps without milliseconds
- **Compatibility**: Parsers must handle both formats
- **Going forward**: All new events MUST use millisecond-precision timestamps
- **No retroactive fixes**: Do not modify existing event timestamps

---

## ID Generation

**Standard**: All entity IDs use prefix-UUID format for uniqueness and type safety.

**Format Pattern**: `{prefix}-{uuid-v4-lowercase}`

**Prefixes**:
- `sprout-` for sprout (goal) entities
- `leaf-` for leaf (saga) entities

**Examples**:
- `sprout-a1b2c3d4-e5f6-4789-a012-3456789abcde` ✅
- `leaf-f9e8d7c6-b5a4-4321-9876-543210fedcba` ✅
- `sprout-A1B2C3D4-E5F6-4789-A012-3456789ABCDE` ❌ (uppercase)
- `a1b2c3d4-e5f6-4789-a012-3456789abcde` ❌ (missing prefix)

**Rationale**:
- Type-safe IDs prevent mixing different entity types
- UUID v4 guarantees global uniqueness across devices
- Lowercase format ensures consistent string comparison
- Prefix enables quick entity type identification in logs/debugging

### Platform Implementation

**Web (JavaScript/TypeScript)**:
```typescript
function generateSproutId(): string {
  return `sprout-${crypto.randomUUID()}`
}

function generateLeafId(): string {
  return `leaf-${crypto.randomUUID()}`
}
```

**iOS (Swift)**:
```swift
let sproutId = "sprout-\(UUID().uuidString.lowercased())"
let leafId = "leaf-\(UUID().uuidString.lowercased())"
```

### Validation

**Regex pattern**: `^(sprout|leaf)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

**Schema validation** (JSON Schema):
```json
{
  "type": "string",
  "pattern": "^(sprout|leaf)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
}
```

### Backward Compatibility

- **Old data**: Entities created before this standard may have different ID formats (e.g., `sprout-{timestamp}-{random}`)
- **Compatibility**: ID validation should accept legacy formats when reading existing data
- **Going forward**: All new IDs MUST use prefix-UUID format
- **No retroactive fixes**: Do not modify existing entity IDs in event logs
