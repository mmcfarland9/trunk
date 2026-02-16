# Sun Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify sun feature to only target twigs (not leaves), with hybrid prompt system using generic `{twig}` token prompts and twig-specific hand-crafted prompts.

**Architecture:** Replace `sun-prompts.txt` with `sun-prompts.json` containing generic prompts (75% selection weight) with `{twig}` token replacement, plus 3 twig-specific prompts per twig (25% selection weight). Remove all leaf-targeting code from shine-dialog.ts.

**Tech Stack:** TypeScript, Vite (raw JSON import)

---

## Task 1: Create sun-prompts.json Structure

**Files:**
- Create: `web/src/assets/sun-prompts.json`

**Step 1: Create the JSON file with generic prompts**

Create `web/src/assets/sun-prompts.json` with the following structure. Generic prompts use `{twig}` token for dynamic insertion. Prompts are balanced across temporal orientations (past/present/future/timeless).

```json
{
  "generic": [
    "How has {twig} shown up in your life recently?",
    "What would you like {twig} to become?",
    "Why does {twig} matter to you?",
    "How does {twig} feel in your life right now?",
    "What did {twig} teach you recently?",
    "What's one small thing you could do for {twig}?",
    "Where does {twig} fit in your priorities?",
    "What would thriving in {twig} look like?",
    "What's your relationship with {twig}?",
    "How might you nurture {twig} going forward?",
    "What's been neglected about {twig}?",
    "What would you change about how you approach {twig}?",
    "What does {twig} need from you?",
    "How has your view of {twig} evolved?",
    "What's the gap between where {twig} is and where you want it?",
    "What would make {twig} easier?",
    "What obstacles stand in the way of {twig}?",
    "Who could help you with {twig}?",
    "What resources would support {twig}?",
    "What's the next meaningful step for {twig}?",
    "What would progress in {twig} look like?",
    "How do you want to feel about {twig}?",
    "What's the honest truth about {twig} right now?",
    "What would you tell a friend about their {twig}?",
    "What's working well with {twig}?",
    "What patterns do you notice in {twig}?",
    "What have you been avoiding about {twig}?",
    "What's the hardest part of {twig}?",
    "What would make {twig} more fulfilling?",
    "How does {twig} connect to what matters most?",
    "What would you regret not doing for {twig}?",
    "What's your vision for {twig} long-term?",
    "What does success in {twig} mean to you?",
    "How balanced is {twig} with the rest of your life?",
    "What boundaries would help {twig}?",
    "What energy does {twig} require?",
    "When do you feel most alive in {twig}?",
    "What would you do differently with {twig}?",
    "What's the simplest improvement for {twig}?",
    "How has {twig} surprised you?",
    "What's the uncomfortable truth about {twig}?",
    "What would letting go look like for {twig}?",
    "What's worth struggling for in {twig}?",
    "How do you hold yourself back in {twig}?",
    "What would courage look like for {twig}?",
    "What's the story you tell yourself about {twig}?",
    "What assumptions about {twig} could you question?",
    "What would experimenting with {twig} look like?",
    "How might {twig} change in the next year?",
    "What legacy do you want to leave in {twig}?"
  ],
  "specific": {}
}
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "console.log(JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')).generic.length)"`

Expected: `50`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add sun-prompts.json with generic prompts"
```

---

## Task 2: Add Twig-Specific Prompts for CORE Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add CORE branch twig-specific prompts**

Add to the `specific` object in `sun-prompts.json`:

```json
{
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
    ],
    "branch-0-twig-2": [
      "What game or challenge called to you?",
      "How did competition or play show up?",
      "What athletic skill would you like to develop?"
    ],
    "branch-0-twig-3": [
      "What movement patterns need attention?",
      "How is your form holding up?",
      "What discipline would serve your body?"
    ],
    "branch-0-twig-4": [
      "What does your body need to recover?",
      "Where are you feeling wear or strain?",
      "How are you tending to your durability?"
    ],
    "branch-0-twig-5": [
      "What is your body asking to be fed?",
      "How mindful have you been about fuel?",
      "What nourishment are you craving?"
    ],
    "branch-0-twig-6": [
      "How have you been sleeping?",
      "What's your rhythm like right now?",
      "What would better rest look like?"
    ],
    "branch-0-twig-7": [
      "How do you feel in your skin?",
      "What presentation matters to you?",
      "How does your outer self reflect your inner self?"
    ]
  }
}
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `8`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for CORE branch"
```

---

## Task 3: Add Twig-Specific Prompts for BRAIN Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add BRAIN branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-1-twig-0": [
  "What have you been reading or wanting to read?",
  "What ideas are you absorbing?",
  "What text has lingered in your mind?"
],
"branch-1-twig-1": [
  "What wants to be written?",
  "How are you articulating your thoughts?",
  "What would you like to encode and share?"
],
"branch-1-twig-2": [
  "What problem is asking to be solved?",
  "How has your logic been challenged?",
  "What reasoning feels unclear?"
],
"branch-1-twig-3": [
  "Where has your attention been going?",
  "What deserves deeper concentration?",
  "How is your ability to focus?"
],
"branch-1-twig-4": [
  "What do you want to remember?",
  "What are you afraid of forgetting?",
  "How is your recall serving you?"
],
"branch-1-twig-5": [
  "What deserves more careful evaluation?",
  "What judgment calls are you facing?",
  "How is your discernment?"
],
"branch-1-twig-6": [
  "What conversations do you want to have?",
  "How has dialogue shaped your thinking?",
  "Who challenges you intellectually?"
],
"branch-1-twig-7": [
  "What are you curious about?",
  "What question is pulling you forward?",
  "What discovery awaits?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `16`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for BRAIN branch"
```

---

## Task 4: Add Twig-Specific Prompts for VOICE Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add VOICE branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-2-twig-0": [
  "What skills are you rehearsing?",
  "Where does repetition feel valuable?",
  "What fundamentals need attention?"
],
"branch-2-twig-1": [
  "What wants to be created?",
  "What original work is calling you?",
  "What would you author if you had time?"
],
"branch-2-twig-2": [
  "What are you reimagining?",
  "How are you making something your own?",
  "What synthesis is emerging?"
],
"branch-2-twig-3": [
  "What would you like to perform?",
  "How does it feel to execute in the moment?",
  "What delivery matters to you?"
],
"branch-2-twig-4": [
  "What art have you been consuming?",
  "What creative work has moved you?",
  "What are you immersing yourself in?"
],
"branch-2-twig-5": [
  "What are you collecting or compiling?",
  "How is your taste evolving?",
  "What selections define you?"
],
"branch-2-twig-6": [
  "What creative work needs finishing?",
  "What polish would make something ready?",
  "What editing awaits?"
],
"branch-2-twig-7": [
  "What are you ready to share with the world?",
  "What deserves an audience?",
  "What would putting your work out there mean?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `24`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for VOICE branch"
```

---

## Task 5: Add Twig-Specific Prompts for HANDS Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add HANDS branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-3-twig-0": [
  "What are you designing or configuring?",
  "What layout or structure needs thought?",
  "What invention is taking shape?"
],
"branch-3-twig-1": [
  "What are you building or making?",
  "What construction calls to you?",
  "What would you like to fabricate?"
],
"branch-3-twig-2": [
  "What needs to be put together?",
  "What installation or integration awaits?",
  "How are you joining parts into wholes?"
],
"branch-3-twig-3": [
  "What's broken that needs fixing?",
  "What troubleshooting are you facing?",
  "What would mending something mean?"
],
"branch-3-twig-4": [
  "What could be improved or calibrated?",
  "What finishing touches would help?",
  "Where would refinement make a difference?"
],
"branch-3-twig-5": [
  "What tools serve you well?",
  "What equipment do you need?",
  "How is your relationship with your instruments?"
],
"branch-3-twig-6": [
  "What are you cultivating or growing?",
  "What needs patient caretaking?",
  "How is your tending going?"
],
"branch-3-twig-7": [
  "What preparation would set you up well?",
  "What staging or arrangement needs attention?",
  "How ready is your environment?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `32`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for HANDS branch"
```

---

## Task 6: Add Twig-Specific Prompts for HEART Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add HEART branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-4-twig-0": [
  "How is your home feeling?",
  "What domestic tasks need attention?",
  "What would make your space more comfortable?"
],
"branch-4-twig-1": [
  "Who needs your care?",
  "How are you showing thoughtfulness?",
  "What nurturing would you like to give?"
],
"branch-4-twig-2": [
  "How available have you been?",
  "What does showing up look like right now?",
  "Where is your presence needed?"
],
"branch-4-twig-3": [
  "How vulnerable have you been willing to be?",
  "What trust are you building?",
  "How deep is your connection?"
],
"branch-4-twig-4": [
  "What conversations need to happen?",
  "How transparent have you been?",
  "What would open communication look like?"
],
"branch-4-twig-5": [
  "What rituals anchor your relationships?",
  "What celebrations or routines matter?",
  "What traditions are you building?"
],
"branch-4-twig-6": [
  "What adventure is calling?",
  "Where does spontaneity fit?",
  "What novelty would refresh things?"
],
"branch-4-twig-7": [
  "What brings you joy together?",
  "How playful have you been?",
  "What delight are you sharing?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `40`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for HEART branch"
```

---

## Task 7: Add Twig-Specific Prompts for BREATH Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add BREATH branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-5-twig-0": [
  "What have you noticed lately?",
  "What's your perception revealing?",
  "What deserves closer observation?"
],
"branch-5-twig-1": [
  "How connected are you to the natural world?",
  "What reverence do you feel?",
  "Where does nature call you?"
],
"branch-5-twig-2": [
  "How is your breath?",
  "What's your cadence like?",
  "How is energy circulating through you?"
],
"branch-5-twig-3": [
  "What pause do you need?",
  "When did you last take a real break?",
  "What reprieve would serve you?"
],
"branch-5-twig-4": [
  "How much stillness have you found?",
  "What does solitude offer you?",
  "When were you last truly idle?"
],
"branch-5-twig-5": [
  "What discomfort are you embracing?",
  "How are you conditioning yourself?",
  "What challenge strengthens you?"
],
"branch-5-twig-6": [
  "What are you abstaining from?",
  "Where does restraint serve you?",
  "What temperance is needed?"
],
"branch-5-twig-7": [
  "What reflection has been valuable?",
  "What are you grateful for?",
  "What acceptance are you finding?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `48`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for BREATH branch"
```

---

## Task 8: Add Twig-Specific Prompts for BACK Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add BACK branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-6-twig-0": [
  "Who have you reached out to?",
  "What connections are you initiating?",
  "Who would you like to contact?"
],
"branch-6-twig-1": [
  "Who can count on you?",
  "How reliable have you been?",
  "What support are you providing?"
],
"branch-6-twig-2": [
  "What gatherings matter to you?",
  "How are you bringing people together?",
  "What assembly would be meaningful?"
],
"branch-6-twig-3": [
  "What groups do you belong to?",
  "How is your participation?",
  "What camaraderie feeds you?"
],
"branch-6-twig-4": [
  "What are you preserving or protecting?",
  "What custodianship matters?",
  "How are you being a good steward?"
],
"branch-6-twig-5": [
  "What cause moves you?",
  "Where does justice call you?",
  "What advocacy matters?"
],
"branch-6-twig-6": [
  "How are you serving others?",
  "What contribution feels meaningful?",
  "Who could use your help?"
],
"branch-6-twig-7": [
  "What heritage matters to you?",
  "What traditions are you honoring?",
  "What legacy are you part of?"
]
```

**Step 2: Verify JSON is valid**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `56`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for BACK branch"
```

---

## Task 9: Add Twig-Specific Prompts for FEET Branch

**Files:**
- Modify: `web/src/assets/sun-prompts.json`

**Step 1: Add FEET branch twig-specific prompts**

Add to the `specific` object:

```json
"branch-7-twig-0": [
  "How is your work going?",
  "What does your livelihood need?",
  "How is your vocation serving you?"
],
"branch-7-twig-1": [
  "What skills are you developing?",
  "How are you advancing?",
  "What training would help?"
],
"branch-7-twig-2": [
  "How is your positioning?",
  "What alignment or trajectory needs attention?",
  "How is your network?"
],
"branch-7-twig-3": [
  "What ventures are you pursuing?",
  "What enterprise calls to you?",
  "What initiative would you like to take?"
],
"branch-7-twig-4": [
  "How are your finances?",
  "What does your budget need?",
  "How is your relationship with money?"
],
"branch-7-twig-5": [
  "How are your operations running?",
  "What logistics need attention?",
  "How is your scheduling?"
],
"branch-7-twig-6": [
  "What are you planning for?",
  "What forecasting would help?",
  "How is your provision for the future?"
],
"branch-7-twig-7": [
  "What administration needs attention?",
  "How is your governance of your affairs?",
  "What compliance or management awaits?"
]
```

**Step 2: Verify JSON has all 64 twig-specific entries**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && node -e "const j = JSON.parse(require('fs').readFileSync('src/assets/sun-prompts.json')); console.log(Object.keys(j.specific).length)"`

Expected: `64`

**Step 3: Commit**

```bash
git add web/src/assets/sun-prompts.json
git commit -m "feat(sun): add twig-specific prompts for FEET branch"
```

---

## Task 10: Update SunEntry Type

**Files:**
- Modify: `web/src/types.ts:28-42`

**Step 1: Simplify the SunEntry context type**

Replace the current SunEntry type definition:

```typescript
// Sun entry - global philosophical reflection log
// Randomly selects a twig or leaf to reflect on
export type SunEntry = {
  timestamp: string
  content: string
  prompt?: string
  // Context: what was randomly selected for reflection
  context: {
    type: 'twig' | 'leaf'
    twigId: string
    twigLabel: string
    leafId?: string
    leafTitle?: string // derived from most recent sprout title
  }
}
```

With:

```typescript
// Sun entry - global philosophical reflection log
// Randomly selects a twig to reflect on
export type SunEntry = {
  timestamp: string
  content: string
  prompt?: string
  // Context: which twig was randomly selected
  context: {
    twigId: string
    twigLabel: string
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Errors about `context.type` and leaf fields in other files (expected at this point)

**Step 3: Commit**

```bash
git add web/src/types.ts
git commit -m "refactor(types): simplify SunEntry context to twig-only"
```

---

## Task 11: Update Log Dialog Display

**Files:**
- Modify: `web/src/features/log-dialogs.ts:67-91`

**Step 1: Remove leaf-specific display logic**

Replace the sun log entry rendering in `populateSunLog`:

```typescript
  elements.sunLogDialogEntries.innerHTML = entries.map(entry => {
    const branchLabel = getBranchLabelFromTwigId(entry.context.twigId)
    const locationLabel = branchLabel
      ? `${escapeHtml(branchLabel)} : ${escapeHtml(entry.context.twigLabel)}`
      : escapeHtml(entry.context.twigLabel)
    const context = entry.context.type === 'leaf'
      ? `${escapeHtml(entry.context.leafTitle || '')} · ${locationLabel}`
      : locationLabel
    const timestamp = formatSunLogTimestamp(entry.timestamp)
```

With:

```typescript
  elements.sunLogDialogEntries.innerHTML = entries.map(entry => {
    const branchLabel = getBranchLabelFromTwigId(entry.context.twigId)
    const context = branchLabel
      ? `${escapeHtml(branchLabel)} : ${escapeHtml(entry.context.twigLabel)}`
      : escapeHtml(entry.context.twigLabel)
    const timestamp = formatSunLogTimestamp(entry.timestamp)
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Errors only in shine-dialog.ts now

**Step 3: Commit**

```bash
git add web/src/features/log-dialogs.ts
git commit -m "refactor(log-dialogs): remove leaf display logic from sun log"
```

---

## Task 12: Rewrite Shine Dialog

**Files:**
- Modify: `web/src/features/shine-dialog.ts`

**Step 1: Replace the entire shine-dialog.ts file**

```typescript
import type { AppContext, SunEntry } from '../types'
import sunPromptsData from '../assets/sun-prompts.json'
import { spendSun, canAffordSun, addSunEntry, getSunAvailable, wasShoneThisWeek, getPresetLabel, recoverSoil, getSunRecoveryRate, getNextSunReset, formatResetTime } from '../state'

export type ShineCallbacks = {
  onSunMeterChange: () => void
  onSoilMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
  onShineComplete: () => void
}

// Type for the prompts JSON structure
type SunPrompts = {
  generic: string[]
  specific: Record<string, string[]>
}

const sunPrompts = sunPromptsData as SunPrompts

// Track recently shown prompts globally to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = 15

// Selection weight: 75% generic, 25% specific
const GENERIC_WEIGHT = 0.75

function getRandomPrompt(twigId: string, twigLabel: string): string {
  const genericPrompts = sunPrompts.generic
  const specificPrompts = sunPrompts.specific[twigId] || []

  // Filter out recently shown prompts from each pool
  const availableGeneric = genericPrompts.filter(p => !recentPrompts.includes(p))
  const availableSpecific = specificPrompts.filter(p => !recentPrompts.includes(p))

  // Determine which pool to select from
  let selectedPrompt: string
  const hasGeneric = availableGeneric.length > 0
  const hasSpecific = availableSpecific.length > 0

  if (!hasGeneric && !hasSpecific) {
    // Both pools exhausted, clear recent and try again
    recentPrompts.length = 0
    return getRandomPrompt(twigId, twigLabel)
  }

  if (!hasGeneric) {
    // Only specific available
    selectedPrompt = availableSpecific[Math.floor(Math.random() * availableSpecific.length)]
  } else if (!hasSpecific) {
    // Only generic available
    selectedPrompt = availableGeneric[Math.floor(Math.random() * availableGeneric.length)]
  } else {
    // Both available - use weighted random
    const useGeneric = Math.random() < GENERIC_WEIGHT
    if (useGeneric) {
      selectedPrompt = availableGeneric[Math.floor(Math.random() * availableGeneric.length)]
    } else {
      selectedPrompt = availableSpecific[Math.floor(Math.random() * availableSpecific.length)]
    }
  }

  // Track this prompt as recently shown
  recentPrompts.push(selectedPrompt)
  if (recentPrompts.length > RECENT_PROMPT_LIMIT) {
    recentPrompts.shift()
  }

  // Replace {twig} token with actual label
  return selectedPrompt.replace(/\{twig\}/g, twigLabel)
}

// Get all twigs
function getAllTwigs(): { twigId: string; twigLabel: string }[] {
  const twigs: { twigId: string; twigLabel: string }[] = []

  for (let b = 0; b < 8; b++) {
    for (let t = 0; t < 8; t++) {
      const twigId = `branch-${b}-twig-${t}`
      const label = getPresetLabel(twigId)
      if (label) {
        twigs.push({ twigId, twigLabel: label })
      }
    }
  }

  return twigs
}

// Randomly select a twig to reflect on
function selectRandomTwig(): SunEntry['context'] | null {
  const twigs = getAllTwigs()

  if (twigs.length === 0) {
    return null
  }

  const twig = twigs[Math.floor(Math.random() * twigs.length)]
  return {
    twigId: twig.twigId,
    twigLabel: twig.twigLabel
  }
}

export type ShineApi = {
  updateSunMeter: () => void
  populateSunLogShine: () => void
}

export function initShine(
  ctx: AppContext,
  callbacks: ShineCallbacks
): ShineApi {
  // Current shine context (selected when dialog opens)
  let currentContext: SunEntry['context'] | null = null

  function updateSunMeter() {
    const available = getSunAvailable()
    const canShine = available > 0 && !wasShoneThisWeek()
    ctx.elements.sunCircle.classList.toggle('is-filled', canShine)
  }

  function updateRadiateButtonState() {
    const { sunLogShineJournal, sunLogShineBtn } = ctx.elements
    const hasContent = sunLogShineJournal.value.trim().length > 0
    sunLogShineBtn.disabled = !hasContent
  }

  function populateSunLogShine() {
    const {
      sunLogShineSection,
      sunLogShineTitle,
      sunLogShineMeta,
      sunLogShineJournal,
      sunLogShineBtn,
      sunLogShineShone,
      sunLogShineShoneReset
    } = ctx.elements

    // Check if already shone this week
    if (wasShoneThisWeek()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      sunLogShineShoneReset.textContent = formatResetTime(getNextSunReset())
      currentContext = null
      return
    }

    // Check if we can afford sun
    if (!canAffordSun()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      sunLogShineShoneReset.textContent = formatResetTime(getNextSunReset())
      currentContext = null
      return
    }

    // Select a random twig
    const target = selectRandomTwig()
    if (!target) {
      // No twigs to shine on
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      currentContext = null
      return
    }

    currentContext = target

    // Display what was selected
    sunLogShineTitle.textContent = target.twigLabel
    sunLogShineMeta.textContent = 'Life Facet'

    sunLogShineJournal.value = ''
    sunLogShineJournal.placeholder = getRandomPrompt(target.twigId, target.twigLabel)
    sunLogShineBtn.disabled = true

    sunLogShineSection.classList.remove('hidden')
    sunLogShineShone.classList.add('hidden')

    // Focus the journal after a brief delay (for dialog animation)
    setTimeout(() => sunLogShineJournal.focus(), 100)
  }

  function saveSunEntry() {
    const { sunLogShineJournal } = ctx.elements
    const entry = sunLogShineJournal.value.trim()

    if (!entry) {
      return
    }

    if (!canAffordSun()) {
      callbacks.onSetStatus('No sun left this week!', 'warning')
      return
    }

    if (currentContext) {
      spendSun()
      updateSunMeter()

      // Recover soil from shining
      recoverSoil(getSunRecoveryRate(), 0, 'Shone light', currentContext.twigLabel)
      callbacks.onSoilMeterChange()

      // Save sun entry to global log with context
      const prompt = sunLogShineJournal.placeholder
      addSunEntry(entry, prompt, currentContext)
      callbacks.onSetStatus('Light radiated!', 'info')

      // Refresh the shine section (will show "shone" state) and log
      populateSunLogShine()
      callbacks.onShineComplete()
    }
  }

  // Wire up shine handlers
  ctx.elements.sunLogShineJournal.addEventListener('input', updateRadiateButtonState)
  ctx.elements.sunLogShineBtn.addEventListener('click', saveSunEntry)

  return {
    updateSunMeter,
    populateSunLogShine,
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add web/src/features/shine-dialog.ts
git commit -m "refactor(shine): simplify to twig-only with weighted prompt selection"
```

---

## Task 13: Delete Old Prompts File

**Files:**
- Delete: `web/src/assets/sun-prompts.txt`

**Step 1: Delete the old prompts file**

Run: `rm /Users/michaelmcfarland/dev/html/trunk/web/src/assets/sun-prompts.txt`

**Step 2: Verify dev server starts**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated sun-prompts.txt"
```

---

## Task 14: Manual Verification

**Step 1: Start dev server and test**

Run: `cd /Users/michaelmcfarland/dev/html/trunk/web && npm run dev`

**Step 2: Manual test checklist**

- [ ] Click sun meter to open sun log dialog
- [ ] If sun available, verify a twig name appears (not a leaf)
- [ ] Verify prompt appears in textarea placeholder
- [ ] Verify prompt contains the twig name (for generic prompts)
- [ ] Enter text and click "Radiate"
- [ ] Verify entry appears in log with twig context only
- [ ] Verify soil recovers (+0.35)
- [ ] Verify sun shows as "shone this week"

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: sun simplification adjustments"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create sun-prompts.json with generic prompts | Create: sun-prompts.json |
| 2-9 | Add twig-specific prompts (8 branches × 8 twigs) | Modify: sun-prompts.json |
| 10 | Simplify SunEntry type | Modify: types.ts |
| 11 | Remove leaf display logic | Modify: log-dialogs.ts |
| 12 | Rewrite shine-dialog.ts | Modify: shine-dialog.ts |
| 13 | Delete old prompts file | Delete: sun-prompts.txt |
| 14 | Manual verification | - |

**Total prompts:** 50 generic + 192 twig-specific = 242 prompts
