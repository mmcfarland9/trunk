# CANVAS — What Trunk Should Become

> Research compiled March 2026. Six lenses: competitor analysis, behavioral psychology, data intelligence, metaphor expansion, platform opportunities, anti-patterns. Every idea rated by evidence strength.

---

## Top 15 Ideas

### 1. Dormancy / Wintering Mode
**What**: A conscious pause mode where the user puts a branch or the whole tree into winter. Season timers freeze, streaks don't break, the tree visually enters winter (bare branches, snow). When the user returns, spring arrives — possibly with a "root depth" bonus representing resilience built during rest.

**Why it matters**: The #1 emotional gap in Trunk. Life gets hard — burnout, grief, illness, transitions. Every competing app punishes absence. Trunk can be the one that says rest is growth. Katherine May's *Wintering*: "Wintering is not about idleness but intentional rest."

**Evidence**: Strongly supported. Lally (2010) found a single missed day had little impact on habit formation. The CHI 2020 study found streak anxiety is the #1 reason users abandon habit apps. Gentler Streak won an Apple Design Award for exactly this feature (rest states without guilt). Finch succeeds partly because missing a day doesn't kill the bird.

**Scope**: Medium. New event type (`dormancy_entered`, `dormancy_exited`), visual winter state for tree/branch, season timer pause logic, derivation changes. Both platforms.

---

### 2. iOS Widgets — Living Tree on Home Screen
**What**: Small/medium/large widgets showing the tree visualization, today's water progress (●●○ = 2/3), active sprout count, and streak. Interactive widget (iOS 17+) with tap-to-water shortcut.

**Why it matters**: Widgets transform "remember to open the app" into "the app is always visible." Finch's widget drives 47% higher daily check-in consistency. Streaks' widgets are their most-used feature (Apple Design Award winner). No competitor has a *living tree visualization* widget — this would be unique.

**Evidence**: Strongly validated. Finch (47% higher check-ins), Streaks (most-used feature), industry data showing widgets as top engagement driver.

**Scope**: Medium. WidgetKit + SwiftUI (already the iOS stack). Small/medium/large variants. Timeline provider reading from local event store.

---

### 3. Year in Growth — Annual Narrative
**What**: A Spotify Wrapped-style year-in-review. Chapters: the overview (sprouts planted/harvested, soil journey), the growth map (animated radar chart shifting over the year), the harvest (best results, longest sprout), the pattern (when you journal, most active branch), your gardener archetype ("The Deep Rooter," "The Wildflower"). Shareable cards.

**Why it matters**: Spotify Wrapped engages 200M+ users within 24 hours. Strava Year in Sport, Peloton Year in Review — the pattern is proven. Trunk's event-sourced architecture makes this uniquely powerful: every event is timestamped, immutable, and complete. The 20-year soil arc needs milestone markers to stay motivating. Temporal Motivation Theory warns that extremely long time horizons produce low motivation without intermediate celebrations.

**Evidence**: Strongly validated. Spotify Wrapped (200M engagement), Strava/Peloton annual features, Temporal Motivation Theory. Key lesson from Spotify's 2024 AI podcast backlash: present data beautifully, don't let AI interpret it.

**Scope**: Large. Data aggregation pipeline, narrative generation, card rendering for sharing, animation work. Could start with web and port to iOS.

---

### 4. Composting Failed Goals
**What**: When a sprout is uprooted, instead of instantly returning 25% soil, it enters a "compost pile" where it slowly decomposes over days/weeks, eventually releasing its full soil value. A compost view shows what's decomposing and how much nutrition is being generated. Failed goals aren't waste — they're delayed nutrition.

**Why it matters**: Reframes the harshest moment in the app. Research on binary success/failure: people who think in all-or-nothing terms are 3.2x more likely to abandon goals after first failure. The compost metaphor is botanically accurate and psychologically powerful — failure becomes investment in future growth.

**Evidence**: Moderately supported. Binary thinking research (Moore Momentum), narrative therapy literature on reframing failure, PMI "compost pile model of career success." The metaphor is validated but the specific mechanic is novel.

**Scope**: Medium. Changes to uproot event handling, new compost state in derivation, time-based soil release, compost UI view. Both platforms.

---

### 5. Growth Rings — Lifetime Legacy View
**What**: Tap the trunk to see a cross-section with concentric rings. Each ring represents a year (or significant period). Wide rings = years of abundant growth. Narrow rings = difficult years. Tap a ring to see that year's story — what was planted, harvested, how soil changed. Over decades, the cross-section becomes a unique fingerprint of a life.

**Evidence**: Strongly organic. Trees literally record time in rings. Trunk is designed for 20+ years of use. Growth rings are the natural way to honor that timescale. Coaching literature: "In each ring, capture memories, lessons, significant experiences."

**Scope**: Large. New visualization (canvas/SVG), year-aggregation from events, ring-tap interaction with year detail view. Could ship incrementally (start with simple rings, add interactivity later).

---

### 6. Contextual Smart Prompts (AI)
**What**: Use sprout context (branch, season progress, watering frequency, time since planting) to generate contextually relevant journaling prompts. "Your Health sprout is 60% through its season — what's shifted since you planted it?" No journal text analysis needed — context comes from events, not from reading the user's words.

**Why it matters**: Day One and journaling apps fail because free-writing is high friction. Guided prompts lower the barrier. MindScape (PMC 2024 research) found users responded positively to temporally-aware, context-specific prompts. Trunk already has prompts — making them contextual is the natural evolution.

**Evidence**: Validated. MindScape peer-reviewed research, Rosebud shipping product, Reflectly's prompt-driven journaling. The key: AI generates *questions*, never *answers*.

**Scope**: Medium. LLM API call using structured context (not journal text). Prompt template system. Edge function or on-device with smaller model. Both platforms.

---

### 7. Self-Compassion After Missed Days
**What**: When a user returns after missing days, instead of showing a broken streak counter, show the tree waiting patiently. "You've watered 147 times. Missing a few days doesn't change that." Normalize imperfection. Consider replacing consecutive-day streak with "days watered this season" or a non-punitive "total waters" count.

**Fertilizer (streak saver)**: Rather than streaks breaking on a missed day, the user spends a "fertilizer" to keep the streak alive — like Duolingo's streak freeze but metaphor-native. Fertilizer is earned naturally through consistent watering (e.g., one fertilizer earned per 7 consecutive days, capped at a small stockpile). When a day is missed, fertilizer is automatically applied: the streak counter shows a fertilizer icon instead of a water drop — honest but not punitive. The framing: rest enriches the soil. Even a day off feeds the garden. If the user has no fertilizer and misses a day, the streak ends gently — "Your streak rested. Your total waters didn't change." Connects naturally to dormancy (macro rest) and composting (failure as nutrition). Fertilizer is the micro version.

**Why it matters**: The abstinence violation effect (addiction research, applied to habit apps): people who aim for perfection are more likely to quit entirely after a single slip. Lally (2010): a single missed day had little impact on automaticity. Neff (2023): self-compassion increases motivation, not decreases it. Streak anxiety is the #1 reason users abandon habit apps (CHI 2020).

**Evidence**: Strongly supported. Lally 2010, Neff 2023 (Annual Review of Psychology), CHI 2020 study, Gentler Streak (Apple Design Award), Duolingo streak freeze data (+0.38% DAU). Duolingo's streak freeze is their most impactful retention feature — reducing the cost of failure outperformed increasing the reward for success.

**Scope**: Small-medium. Streak display rethinking, return-after-absence messaging, fertilizer bonus logic in derivation, grace day mechanic. Both platforms.

---

### 8. Notifications Done Right
**What**: A single, optional, user-scheduled daily reminder in the gardening voice ("Your garden is waiting"). Adaptive timing that learns when the user typically waters. Gardening-voice copy. User chooses tone (Gentle/Direct/Poetic) or disables entirely. Never more than 1/day. Escalating gentleness: day 1 missed = nothing, day 2 = gentle, day 3 = slightly more, then backs off entirely.

**Why it matters**: Duolingo data: users with notifications enabled complete 72% more lessons/month with 124% longer streaks. But 68% of fitness app uninstallers cite notification fatigue. The answer isn't no notifications — it's *one* notification, well-timed, well-worded, user-controlled.

**Evidence**: Strongly validated on both sides. Duolingo (72% more engagement), UCSF (68% uninstall driver). Duolingo's #1 rule: protect the notification channel by never over-sending.

**Scope**: Small-medium. iOS push notification setup, notification scheduling, user preferences UI. Web push via PWA service worker.

---

### 9. At-Risk Sprout Detection
**What**: Compare current watering frequency to the user's historical pattern for sprouts at the same lifecycle stage. If a 3-month sprout usually gets watered 5x/week in weeks 1-4 but this one dropped to 1x in week 3, surface a gentle signal — maybe a visual wilting cue on the sprout, or a prompt: "This sprout could use some attention." User-initiated insights, never pushed.

**Why it matters**: Habitify claims 93% accuracy in predicting habit abandonment using similar behavioral signals, with 17% retention improvement. The data already exists in Trunk's event log. Early detection prevents the silent drift that ends in uprooting.

**Evidence**: Validated. Habitify (93% prediction, 17% retention), Apple Health walking steadiness (personal baseline deviation model).

**Scope**: Medium. Baseline computation per sprout, deviation detection, gentle UI indicators. Could be as simple as a subtle color shift on sprout cards.

---

### 10. Roots Visualization
**What**: A "root view" — flip perspective to show an underground cross-section beneath the tree. Roots deepen from sustained engagement on a branch over time, representing invisible growth: consistency, reflection depth, inner work. Deep roots make the tree more resilient (connects to dormancy/storms). Mirrors Jungian conscious/unconscious integration.

**Why it matters**: Completes the tree metaphor. The tree visually has branches (external) but no roots (internal). The bamboo metaphor is powerful: 5 years of invisible root growth, then explosive visible growth. Maps onto the profound truth that the most important growth is often invisible.

**Evidence**: Moderately supported. Jungian tree archetype (extensive literature), coaching/therapy use of root metaphors, Viridi's success with slow invisible growth. The metaphor is universally understood.

**Scope**: Large. New visualization layer, root depth computation from events, toggle between canopy/root views. Both platforms.

---

### 11. Difficulty Calibration Learning
**What**: Track completion rates and harvest results (1-5) by environment × season. Detect if a user consistently uproots "barren" sprouts but thrives with "firm" ones. Suggest optimal next challenge: "Based on your history, a firm 3-month sprout would be in your sweet spot." Gently push toward harder challenges as the user builds capacity.

**Why it matters**: Csikszentmihalyi's flow theory — flow occurs when challenge matches skill. Too easy = boredom, too hard = anxiety. The Challenge Point Framework (2025 scoping review) confirms adjusting difficulty to learner performance produces positive outcomes. Adaptive spaced repetition (PNAS) improved learning efficiency 38%.

**Evidence**: Strongly supported theoretically. Flow theory (extensive research), Challenge Point Framework (2025 review), adaptive learning (PNAS). No direct consumer app precedent in the goal-tracking space.

**Scope**: Medium. Statistical analysis of historical sprouts, suggestion UI during planting, recommendation engine. Both platforms.

---

### 12. Seasonal Visual Changes on Tree
**What**: The tree's appearance changes with the calendar or engagement — spring blossoms, summer fullness, autumn colors, winter bare branches. Subtle, ambient, not interactive. Night/day cycle with fireflies at night, dew in morning.

**Why it matters**: Animal Crossing and Stardew Valley prove that seasonal visual changes create the "living world" feeling that drives sustained engagement. Viridi's real-time succulent growth retains users through patience and beauty. The tree already has wind animation — seasonal appearance is the natural extension.

**Evidence**: Validated. Animal Crossing / Stardew Valley retention mechanics, Viridi's real-time growth model. Low implementation cost relative to emotional impact.

**Scope**: Small-medium. CSS/canvas changes for web, SwiftUI view updates for iOS. Asset creation for seasonal tree states.

---

### 13. Haptic Vocabulary for Gardening
**What**: Distinct haptic feedback for each action — a firm "thump" for planting (seed into soil), soft flowing triple-tap for watering (droplets), rich celebratory crescendo for harvesting, heavy drag for uprooting. Reinforces the physicality of the gardening metaphor.

**Why it matters**: Apple's Mindfulness app uses haptics as the *primary* interaction — users close their eyes and follow the taps. ChantFlow uses graduated haptic patterns for meditation milestones. Haptics reinforce that Trunk is a *physical* garden, not an abstract tracker. No competitor has a gardening haptic vocabulary.

**Evidence**: Moderately validated. Apple Mindfulness (haptics as primary UX), ChantFlow (graduated patterns), Core Haptics framework documentation. Contributes to "premium feel" correlated with retention.

**Scope**: Small. UIFeedbackGenerator calls per action type (hours of work). Custom AHAP patterns for richer feedback (days).

---

### 14. PWA Service Worker
**What**: Add a service worker to cache the web app shell + static assets. Enable offline watering that syncs when reconnected. Web push notifications. Install prompt for home screen.

**Why it matters**: Trunk's web app is local-first with event-sourced architecture — it's *already* architecturally a PWA. Adding the service worker is the last mile. Web push (macOS Safari, Chrome, Firefox, Android) extends notification reach. PWAs see 53% higher conversion than mobile websites.

**Evidence**: Validated. PWA engagement data, iOS 16.4+ web push support. Trunk's architecture makes this almost free.

**Scope**: Small. Service worker, manifest.json, caching strategy. 1-2 days.

---

### 15. Cross-Branch Correlation Insights
**What**: An Exist.io-style correlation engine that finds relationships across branches. "Your mood entries on the Relationships branch are more positive during weeks you also water the Health branch." User-initiated (tap "Show me patterns"), not pushed.

**Why it matters**: Bearable's correlation engine ("screen time correlates with weight changes") is its killer feature — users have "aha moments" that drive retention. Exist.io built an entire business on cross-stream correlations. Trunk has 8 branches of life data — the cross-branch signal is rich and unique.

**Evidence**: Validated. Bearable (4.8★, passionate user base), Exist.io (core product thesis). Finding surprising personal correlations creates the "this app knows me" feeling.

**Scope**: Large. Statistical analysis across branches, correlation strength/confidence computation, insight UI. Requires sufficient data volume (months of use).

---

## Full Findings by Lens

### Lens 1: Competitor & Category Analysis

**The landscape (25+ apps analyzed across 7 tiers):**

Tier 1 — Direct competitors with metaphor/depth: Finch (virtual pet bird, 60% D1 retention, $80/yr), Habitica (RPG, 15M+ downloads but declining), Forest (focus timer, 1.5M real trees planted), Pattrn (AI pattern detection, new), Griply (goals→habits hierarchy).

Tier 2 — Pure habit trackers: Streaks (12-habit limit, best widgets), Strides, Loop (open source), HabitNow, Fabulous (guided routines), Habitify (cross-platform).

Tier 3 — Journaling: Daylio (tap-first mood logging, massive user base), Day One (premium journaling, 4.8★), Journey, Reflectly (AI-guided), Stoic (CBT/stoicism), Apple Journal.

Tier 4 — Mood/health tracking: Bearable (correlation engine, 4.8★), Exist (auto-import correlations).

Tier 5-7 — Task managers, build-your-own systems, coaching: Todoist, Things 3, TickTick, Notion, Obsidian, GoalsWon.

**What the best do that Trunk doesn't**: Virtual pet/companion (Finch), AI prompts/insights (Pattrn, Reflectly), automatic data import from wearables (Bearable, Exist), correlation/pattern finding (Exist, Bearable), real-world impact tied to in-app actions (Forest), photo/media in entries (Day One), "On This Day" retrospectives (Day One), widgets (Streaks — most-used feature).

**What they ALL do badly (Trunk's structural advantages):**
1. **Habit trackers lose the "why"** — checkbox dependency without deeper purpose. Trunk's soil economy inherently connects daily action to long-term meaning.
2. **Binary success/failure** — broken streaks shown as red marks. Trunk's watering model (some water is fine) and uproot (graceful failure) counter this.
3. **No app models lifetime growth** — every competitor tracks weeks/months. Trunk's 10→120 soil over ~20 years is unprecedented.
4. **80% user abandonment within 3 days** — the entire category has a retention crisis. Trunk's constrained economy (limited soil, seasonal commitment) may create healthy scarcity.
5. **Tracking overload** — most apps allow unlimited habits. Trunk's soil constraint naturally limits active goals.
6. **No app handles life domains well** — most are flat lists. Trunk's 8×8 structure gives automatic life-area organization.

**Category gaps nobody fills**: Decade-scale growth tracking, graceful goal abandonment, seasonal commitment modeling, scarcity-based motivation, integrated reflection by life domain, growth visualization that evolves over years, event-sourced personal history.

**Monetization**: One-time purchase is strongly preferred (41% subscription fatigue). Best model: one-time for core + optional subscription for sync/AI. Never gate growth capability behind payment.

**Trends (2024-2026)**: AI personalization (58% integration), subscription fatigue → one-time purchases, mental wellness integration (44% want it), wearable integration (49% demand), widgets as table stakes, anti-gamification / "slow growth" backlash (Finch succeeds here), community as liability (Habitica's collapse), local-first / privacy-first growing demand.

---

### Lens 2: Behavioral Psychology

**Key frameworks and how Trunk maps:**

**Self-Determination Theory (SDT)**: Three needs — autonomy (Trunk ✓), competence (Trunk ✓ via soil), relatedness (Trunk ✗ — completely absent). A 2024 systematic review found most apps optimize for engagement with the app rather than motivation toward actual behavior change. Trunk should optimize for internalization.

**Organismic Integration Theory (OIT)**: Continuum from external → introjected → identified → integrated motivation. Trunk sits mostly intrinsic (journaling/reflection is reflective), but soil economy and streaks are extrinsic. Risk: when soil becomes the reason for watering instead of genuine reflection, the app has failed.

**Fogg Behavior Model**: B = MAP (Motivation × Ability × Prompt). When motivation dips after 3 months, ability must be high (behavior easy) and prompts reliable. Trunk's watering is already low-friction but has no prompt mechanism (no notifications).

**The 2-3 month motivation cliff**: Lally et al. (2010) found habit automaticity plateaus at median 66 days (range 18-254). The 2-3 month mark is when novelty fades but habit hasn't formed — the danger zone. Streak anxiety (CHI 2020) and abstinence violation effect compound this.

**What a psychologist would add to Trunk:**
1. Normalize missed days — "Research shows missing one day doesn't affect habit formation"
2. Values clarification — why does this branch matter to you?
3. Cognitive reframing prompts — "what did you learn?" not just "what did you do?"
4. Non-linear progress visualization — growth isn't linear, lean into seasonal rhythms
5. Emotional check-ins — track mood alongside behavior
6. Barrier identification — "what's getting in the way?" is more useful than "did you do it?"
7. Self-efficacy building — show past successes when motivation dips

**Evidence-based gaps in Trunk:**
1. No self-compassion after missed days (Lally 2010, Neff 2023, CHI 2020)
2. No relatedness/social connection (SDT — but see anti-patterns on social)
3. No internalization support — tracks behavior but doesn't help connect to identity/values (OIT, Oxford 2024)
4. No implementation intentions — users set goals but not when/where/how (Gollwitzer, 1,900+ papers)
5. Missing middle time horizons — daily and lifetime exist, but monthly/quarterly/annual reflection is absent (Temporal Motivation Theory)

**Goal tracking vs. habit tracking**: Combined approach is optimal. Goals provide initial motivation (Locke & Latham), habits sustain behavior through automaticity. Trunk is a goal tracker with habit-like logging — a good hybrid. Missing: explicit habit scaffolding ("when will you do this?").

---

### Lens 3: Data & Intelligence Layer

**Pattern detection opportunities (validated by comparable apps):**
- Neglected branch detection (Exist.io model — track relative to personal baseline)
- Seasonal/cyclical patterns (Apple Health Trends — 90-day vs 365-day baseline)
- Time-of-day patterns (when users journal carries signal)
- Completion rate trends by season × environment × branch (Habitify — 93% abandonment prediction)
- Watering frequency as health signal (Apple Health walking steadiness — personal baseline deviation)
- Difficulty calibration from outcome data (flow theory)

**What creates the "this app knows me" feeling:**
- Spotify Wrapped: mirrors identity back to you ("Pop Princess") — 200M+ engagement
- Exist.io: correlations the user didn't notice ("mood 15% higher on walking days")
- Gyroscope: comprehensive Health Score as digital twin
- Duolingo: adaptive difficulty that meets you where you are
- Common thread: reflecting back patterns the user didn't consciously notice, not surveillance

**Personalized nudges vs generic reminders**: JAMA 2025 (n=9,501) found personalized nudges performed no better than generic reminders for medication adherence. But JMIR 2024 found nudges significantly increased engagement in behavioral change contexts. The difference: behavioral change benefits from contextual framing while binary tasks (did you take the pill?) don't.

**Journal text analysis without invasiveness**: On-device analysis first. Aggregate, don't quote ("Health entries tend to be more positive" not quoting entries). User-initiated, not ambient. Mirror, don't interpret ("You mentioned 'tired' in 4 of 7 entries" not "You seem burnt out"). Opt-in per feature.

**Year in Review design**: Spotify Wrapped teaches chapters with pacing (big picture → messy middle → achievements), identity reflection (archetype assignment), shareable cards, emotional arc. 2024 lesson: AI-generated content felt impersonal — users want their data presented beautifully, not AI's interpretation.

**AI for journaling**: Smart prompts from context, not from reading entries (MindScape research). Theme surfacing from entries (user-initiated, Rosebud model). Reflective follow-up questions (Socratic, not diagnostic). Cross-sprout connections. Harvest reflection guides. The AI should be a curious companion that asks better questions, not a therapist that offers diagnoses.

---

### Lens 4: Metaphor Expansion

**Natural phenomena → human experiences (ranked by organicness):**

**Dormancy/Wintering (10/10 organic)**: Burnout recovery, grief, rest. Tree enters winter state — bare branches, snow, roots deepen invisibly. Season timers freeze. Katherine May's *Wintering*: rest as preparation, not failure. Addresses Trunk's biggest emotional gap.

**Roots (9/10)**: Invisible inner work, therapy, self-knowledge, values. Root depth from sustained engagement — the bamboo tree (5 years invisible growth, then explosive). Jungian: roots = unconscious, canopy = persona. Completes the visual metaphor.

**Composting/Decay → Renewal (9/10)**: Failed goals becoming lessons, grief transforming into wisdom. Uprooted goals enter a compost pile, slowly decomposing into richer soil. PMI "compost pile model of career success." Reframes failure entirely.

**Growth Rings (9/10)**: Annual life review, life chapters, lifetime patterns. Cross-section with clickable rings. Wide = abundant years, narrow = difficult. All valid. The fingerprint of a life.

**Storms/Weather (8/10)**: Life crises, external disruptions. User-initiated: "I'm in a storm." Tree sways harder, leaves may fall, but tree survives. After storms: stronger bark, character. Organic if user-initiated, forced if algorithmic.

**Canopy vs Roots (8/10)**: External achievements vs inner work. Toggle between views. Powerful but risks feeling judgmental.

**Mycorrhizal Networks (7/10)**: Hidden connections between branches. When sprouts on different branches are watered together, invisible connections form. Beautiful concept, complex detection.

**Cross-Pollination (7/10)**: Cross-branch inspiration. Watering different branches same day triggers connecting prompts. Best as subtle suggestion, not mechanic.

**Difficult experience metaphors**: Burnout → dormancy, grief → autumn/leaf fall, failure → composting, stagnation → underground growth (bamboo), overcommitment → drought, setback → storm scars becoming character.

**Visual/sensory possibilities**: Seasonal appearance, weather layers, root visualization, growth ring cross-section, bark texture evolution, night/day cycle, frost on unwatered sprouts. Audio: rustling leaves, rain during journaling, birdsong in spring, harvest chimes. Haptics: planting thump, watering droplets, harvest crescendo.

**Legacy metaphors**: Growth rings as life fingerprint, the Giving Tree reversed (tree grows because you gave to it), seed legacy (pass wisdom forward), memorial garden.

**Literary/philosophical sources**: Buddhism (Bodhi tree — sitting with growth), Rumi (garden of the soul), Tolkien (Ents — "Don't be hasty"), Jung (tree archetype — conscious/unconscious integration), Taoism (wu wei — "Nature does not hurry, yet everything is accomplished"), indigenous seven generations thinking, Tanzanian proverb ("The wind does not break the tree that bends").

---

### Lens 5: Platform & Medium Opportunities

**Priority ranking (impact × feasibility):**

1. **iOS Widgets** (★★★★★, HIGH feasibility): Living tree + water progress. Unique — no competitor has a living visualization widget. Finch data: 47% higher check-ins.

2. **Notifications** (★★★★★, HIGH): Gardening-voice, adaptive timing, max 1/day, user-controlled tone. Duolingo: 72% more engagement, 124% longer streaks. Protect the channel by never over-sending.

3. **PWA Service Worker** (★★★★, HIGH): Almost free given existing architecture. Offline support, web push, install prompt. 1-2 days.

4. **Morning/Evening Ritual UX** (★★★★, HIGH): Framing change, not new tech. 6am reset already creates rhythm. First water = morning ritual, third water = evening wind-down. Monday = sun anchor.

5. **Haptics** (★★★★, HIGH): Gardening haptic vocabulary. Simple UIFeedbackGenerator calls = hours of work.

6. **Watch Complication** (★★★★, MEDIUM): Water drops counter (●●○). Quick-water via voice. Under 30 seconds.

7. **Shareable Milestones** (★★★★, MEDIUM): Tree snapshot, milestone cards, selective reflection sharing. Drives organic growth. Not a social network — export only.

8. **Live Activities** (★★★, MEDIUM): Daily water counter on Lock Screen. Visible all day.

9. **Siri Shortcuts** (★★★, MEDIUM): "Hey Siri, water my sprout." Power user feature. App Intents framework.

10. **Ambient Sound** (★★★, MEDIUM): Rustling leaves, rain during journaling, harvest chimes. Atmosphere, not content.

11. **StandBy Mode** (★★★, HIGH): Free with widget work. Tree as bedside/desk companion during charging.

12. **Annual Review** (★★★, MEDIUM): "Year in Growth" wrapped-style. Drives word-of-mouth.

13. **Vision Pro** (★★★★★, LOW): Perfect metaphor fit — 3D tree in your room. Tiny audience. Wait.

---

### Lens 6: Anti-Patterns — What NOT to Build

**Feature bloat**: Calm and Headspace now sit at 1.5-1.6★ on Trustpilot after adding too much. Trunk's 7 event types and single-screen tree are its strength. Every feature must pass: "Does this make the tree simpler to tend, or does it add a new thing to manage?"

**Gamification backfire**: The overjustification effect — external rewards replace intrinsic motivation. Frontiers in Psychology: S-shaped curve where motivation weakens when gamification becomes excessive. Cornell GAINS/DRAINs (2025): data tracking and gamification cause distraction, information overload, and reduced self-efficacy. Never add XP, badges, levels, leaderboards, or achievement unlocks.

**Streak anxiety**: "What starts as motivation gradually mutates into avoidance, anxiety, and behavioural dependence." Abstinence violation effect: perfection-seekers are more likely to quit entirely after one slip. Streaks especially fail ADHD users. Gentler Streak (Apple Design Award): rest states without guilt. Duolingo streak freezes increased DAU by 0.38%.

**Social features**: Strava research: runners modified training to control their Strava image rather than optimizing for health. Social comparison causes cortisol release, envy, guilt, lowered self-evaluations (meta-analysis). "If it's not on Strava it didn't happen" — performance for audience replaces performance for self. Growth is personal. Never add shared gardens, leaderboards, public profiles.

**AI overreach**: Rosebud users question data safety despite encryption. Illinois banned AI from making psychotherapeutic decisions. Duolingo's "AI-first" pivot caused mass exodus. The invasion spectrum: prompts ✅, sentiment analysis ⚠️, unsolicited advice ❌, summarizing growth ❌, AI coach responding to entries ❌. The user is the gardener; the app is the soil, not the botanist.

**Notification fatigue**: 68% of fitness app uninstallers cite notification fatigue. Even 1 push/week leads to 10% disabling and 6% uninstalling. Research: disabling notifications improved digital well-being without reducing engagement. If notifications exist, maximum 1/day, user-controlled, no guilt language.

**Complexity creep**: 92% of habit tracking attempts fail within 60 days. 7+ simultaneous habits = 78% higher abandonment. Self-tracking can be "experienced as a reminder that one is sick." Paradox of choice: too many options decrease satisfaction. Never add mood sliders, tagging systems, analytics dashboards, or category management.

**Dark patterns in wellness**: Noom — $62M settlement for deceptive auto-renewals. MyFitnessPal — 75% of eating disorder patients used it, 73% perceived it as contributing to their disorder. Never gate soil capacity behind payments, show ads between watering, create "premium sprout types," or use "Upgrade to grow faster."

**Quantified self trap**: Goodhart's Law — when a measure becomes a target, it ceases to be a good measure. Quantified data may "alienate individuals from authentic experiences." Describing exercise through data "disregards enjoyment." The tree visualization should feel like looking at a garden, not a quarterly report.

**Abandonment curve**: 80% abandon within 3 days, 27% D1 retention → 6.5% D30. Top causes: novelty fade (weeks 1-3), tracking fatigue (weeks 2-4), broken streaks (month 1-2), feature overload (month 1-3), goal disconnect (month 2+). Trunk's 20-year arc sets slowness expectations — but watering must feel valuable in itself, every single time.

---

## Anti-Pattern Watchlist

| Anti-Pattern | Risk Level | Evidence | Trunk's Current Status |
|---|---|---|---|
| Adding social features | CRITICAL | Strava cortisol research, meta-analysis on social comparison | ✅ Safe — no social features |
| Premium that gates growth | CRITICAL | Noom settlement, MyFitnessPal/ED research | ✅ Safe — no monetization |
| XP/badges/leaderboards | CRITICAL | Overjustification effect, Cornell GAINS/DRAINs 2025 | ✅ Safe — soil economy is metaphor-native |
| Notification guilt language | HIGH | 68% uninstall rate, UCSF research | ✅ Safe — no notifications yet |
| Streak punishment | HIGH | Abstinence violation effect, ADHD research, CHI 2020 | ⚠️ Has streaks — needs compassionate redesign |
| AI that interprets journals | HIGH | Rosebud privacy concerns, Duolingo AI backlash | ✅ Safe — prompts only |
| Analytics dashboards | MEDIUM | Goodhart's Law, quantified self paradox | ✅ Safe — metaphorical visualization only |
| Mood/tag form fields | MEDIUM | 92% tracker failure, complexity creep | ✅ Safe — free text journaling |
| Feature bloat generally | HIGH | Calm/Headspace Trustpilot decline | ✅ Safe — minimal feature set |
| Over-measurement | MEDIUM | Measurement alienation research | ⚠️ Soil score exists — keep it background |

**The meta-principle**: Trunk should feel like a quiet garden you visit, not a system that manages you. Every feature should pass the "garden test" — would a real garden do this? Gardens don't send notifications. Gardens don't have leaderboards. Gardens don't tell you that you're growing wrong. Gardens wait.
