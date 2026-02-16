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
