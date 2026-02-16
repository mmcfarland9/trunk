# Email Notifications Design

## Overview

Add settings UI for email notification preferences. Backend integration comes later; this phase focuses on the UI and local storage.

## Notification Types

### Scheduled Check-ins
- **Frequency options:** Daily, Every 3 days, Weekly, Off
- **Preferred time:** Morning (9am), Afternoon (2pm), Evening (7pm)

### Event Notifications
- Sprout ready to harvest
- Shine available (weekly reset)

## Settings Dialog UI

```
┌─────────────────────────────────────┐
│ Settings                        [x] │
├─────────────────────────────────────┤
│ Email                               │
│ ┌─────────────────────────────────┐ │
│ │ your@email.com                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Check-in Reminders                  │
│ ○ Daily  ○ Every 3 days  ○ Weekly  ○ Off │
│                                     │
│ Preferred Time                      │
│ ○ Morning  ○ Afternoon  ○ Evening  │
│                                     │
│ Event Notifications                 │
│ ☑ Sprout ready to harvest          │
│ ☑ Shine available                  │
│                                     │
│              [Save]                 │
└─────────────────────────────────────┘
```

Preferred Time is dimmed when frequency is Off.

## Data Storage

localStorage key: `trunk-settings-v1`

```typescript
type NotificationSettings = {
  email: string
  checkInFrequency: 'daily' | 'every3days' | 'weekly' | 'off'
  preferredTime: 'morning' | 'afternoon' | 'evening'
  events: {
    harvestReady: boolean
    shineAvailable: boolean
  }
}
```

**Defaults:**
- email: ''
- checkInFrequency: 'off'
- preferredTime: 'morning'
- events.harvestReady: true
- events.shineAvailable: true

## Implementation

### Files to modify
1. `src/state.ts` - Add notification settings storage functions
2. `src/ui/dom-builder.ts` - Add settings dialog HTML
3. `src/main.ts` - Wire up settings button handler
4. `src/styles/settings.css` - Dialog styling

### Future backend hooks (comments only)
- On Save: sync settings to backend
- On harvest ready: trigger notification if enabled
- On weekly shine reset: trigger notification if enabled

## Out of Scope
- Actual email sending (backend phase)
- Email verification
- Unsubscribe handling
