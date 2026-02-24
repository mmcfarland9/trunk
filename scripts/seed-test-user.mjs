#!/usr/bin/env node
/**
 * seed-test-user.mjs
 *
 * Generates ~189 realistic events spanning Sept 23 2025 – Feb 22 2026 for the
 * test user "E2E Tester" (test@trunk.michaelpmcfarland.com). Outputs SQL INSERT statements.
 *
 * Usage:
 *   node scripts/seed-test-user.mjs              # prints SQL to stdout
 *   node scripts/seed-test-user.mjs --json       # prints JSON array to stdout
 *   node scripts/seed-test-user.mjs --sql-files  # writes SEED_BATCH_*.sql files
 *   node scripts/seed-test-user.mjs --teardown   # prints DELETE SQL for cleanup
 *
 * Test user:
 *   Email: test@trunk.michaelpmcfarland.com
 *   Name:  E2E Tester
 *   UUID:  a4e226c0-e9b4-4723-8e09-60ec09524d24
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prompts = readFileSync(join(__dirname, '../shared/assets/watering-prompts.txt'), 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.trim().startsWith('#'))
let waterIndex = 0

const USER_ID = 'a4e226c0-e9b4-4723-8e09-60ec09524d24'

// ─── Stable UUIDs for all 17 sprouts and 3 leaves ───────────────────────────
const S = {
  journal2w:       'a7c1e2f0-0001-4aaa-b001-000000000001', // S1  Journal daily 2w
  walk20min:       'a7c1e2f0-0002-4aaa-b002-000000000002', // S2  Walk 20 min daily
  run5k:           'a7c1e2f0-0003-4aaa-b003-000000000003', // S3  Run a 5K
  trackSpending:   'a7c1e2f0-0004-4aaa-b004-000000000004', // S4  Track spending 1m
  guitar3chords:   'a7c1e2f0-0005-4aaa-b005-000000000005', // S5  Learn 3 guitar chords
  shortStory:      'a7c1e2f0-0006-4aaa-b006-000000000006', // S6  Write a short story
  cook3recipes:    'a7c1e2f0-0007-4aaa-b007-000000000007', // S7  Cook 3 new recipes
  emergencyFund:   'a7c1e2f0-0008-4aaa-b008-000000000008', // S8  Emergency fund tracker
  mealPrep:        'a7c1e2f0-0009-4aaa-b009-000000000009', // S9  Meal prep Sundays
  dailyWalks:      'a7c1e2f0-000a-4aaa-b00a-00000000000a', // S10 Take daily walks again
  mindfulWalk:     'a7c1e2f0-000b-4aaa-b00b-00000000000b', // S11 Walk with intention
  dailyOutdoor:    'a7c1e2f0-000c-4aaa-b00c-00000000000c', // S12 Daily outdoor time (uprooted)
  writeEveryOther: 'a7c1e2f0-000d-4aaa-b00d-00000000000d', // S13 Write every other day (uprooted)
  organizeGarage:  'a7c1e2f0-000e-4aaa-b00e-00000000000e', // S14 Organize garage
  resumeWriting:   'a7c1e2f0-000f-4aaa-b00f-00000000000f', // S15 Resume writing habit
  parkRun:         'a7c1e2f0-0010-4aaa-b010-000000000010', // S16 Park run Saturdays
  read2books:      'a7c1e2f0-0011-4aaa-b011-000000000011', // S17 Read 2 books this month
  meditate:        'a7c1e2f0-0012-4aaa-b012-000000000012', // S18 Meditate 10 min daily
  springGarden:    'a7c1e2f0-0013-4aaa-b013-000000000013', // S19 Plan spring garden
  gameNight:       'a7c1e2f0-0014-4aaa-b014-000000000014', // S20 Host game night
}

const L = {
  writingJourney: 'b8d2f3a0-0001-4bbb-c001-000000000001',
  morningRoutine: 'b8d2f3a0-0002-4bbb-c002-000000000002',
  guitarPath:     'b8d2f3a0-0003-4bbb-c003-000000000003',
  gettingMoving:  'b8d2f3a0-0004-4bbb-c004-000000000004',
  moneyAwareness: 'b8d2f3a0-0005-4bbb-c005-000000000005',
  kitchenSkills:  'b8d2f3a0-0006-4bbb-c006-000000000006',
  eatingWell:     'b8d2f3a0-0007-4bbb-c007-000000000007',
  homeProjects:   'b8d2f3a0-0008-4bbb-c008-000000000008',
  readingLife:    'b8d2f3a0-0009-4bbb-c009-000000000009',
  innerStillness: 'b8d2f3a0-000a-4bbb-c00a-00000000000a',
  gardenDreams:   'b8d2f3a0-000b-4bbb-c00b-00000000000b',
  socialLife:     'b8d2f3a0-000c-4bbb-c00c-00000000000c',
}

// ─── Twig helpers ────────────────────────────────────────────────────────────
const TWIG_LABELS = {
  '0-0': 'movement', '0-1': 'nutrition', '0-2': 'sleep', '0-3': 'recovery',
  '0-4': 'maintenance', '0-5': 'energy', '0-6': 'flexibility', '0-7': 'strength',
  '1-0': 'reading', '1-1': 'writing', '1-2': 'languages', '1-3': 'courses',
  '1-4': 'skills', '1-5': 'curiosity', '1-6': 'practice', '1-7': 'teaching',
  '2-0': 'projects', '2-1': 'planning', '2-2': 'focus', '2-3': 'networking',
  '2-4': 'leadership', '2-5': 'mentoring', '2-6': 'growth', '2-7': 'review',
  '3-0': 'cooking', '3-1': 'cleaning', '3-2': 'repairs', '3-3': 'decorating',
  '3-4': 'refinement', '3-5': 'gardening', '3-6': 'tending', '3-7': 'hosting',
  '4-0': 'budgeting', '4-1': 'saving', '4-2': 'investing', '4-3': 'debt',
  '4-4': 'generosity', '4-5': 'earning', '4-6': 'tracking', '4-7': 'planning',
  '5-0': 'meditation', '5-1': 'journaling', '5-2': 'flow', '5-3': 'gratitude',
  '5-4': 'therapy', '5-5': 'boundaries', '5-6': 'beliefs', '5-7': 'reflection',
  '6-0': 'partner', '6-1': 'family', '6-2': 'friends', '6-3': 'community',
  '6-4': 'listening', '6-5': 'vulnerability', '6-6': 'boundaries', '6-7': 'kindness',
  '7-0': 'music', '7-1': 'art', '7-2': 'movement', '7-3': 'games',
  '7-4': 'nature', '7-5': 'travel', '7-6': 'humor', '7-7': 'exploration',
}

function tid(short) { return `branch-${short[0]}-twig-${short[2]}` }
function tlab(short) { return TWIG_LABELS[short] || 'unknown' }

// CDT = UTC-5 (before Nov 2 2025 7:00 UTC), CST = UTC-6 (after)
function chicago(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, h, min))
  const dstEnd = new Date('2025-11-02T07:00:00Z')
  dt.setUTCHours(dt.getUTCHours() + (dt < dstEnd ? 5 : 6))
  return dt.toISOString()
}

// ─── Event builders ──────────────────────────────────────────────────────────
const events = []
function cid(ts) { return `${ts}-${randomUUID().slice(0, 8)}` }

function plant(date, time, sproutId, twig, title, season, env, soilCost, blooms, leafId) {
  const ts = chicago(date, time)
  const c = cid(ts)
  const e = {
    type: 'sprout_planted', timestamp: ts, sproutId, twigId: tid(twig),
    title, season, environment: env, soilCost, leafId,
    bloomWither: blooms[0], bloomBudding: blooms[1], bloomFlourish: blooms[2], client_id: c,
  }
  events.push({ type: e.type, payload: e, client_id: c, client_timestamp: ts })
}

function water(date, time, sproutId, content) {
  const ts = chicago(date, time)
  const c = cid(ts)
  const prompt = prompts[waterIndex++ % prompts.length]
  events.push({ type: 'sprout_watered', payload: { type: 'sprout_watered', timestamp: ts, sproutId, content, prompt, client_id: c }, client_id: c, client_timestamp: ts })
}

function harvest(date, time, sproutId, result, capacityGained, reflection) {
  const ts = chicago(date, time)
  const c = cid(ts)
  events.push({ type: 'sprout_harvested', payload: { type: 'sprout_harvested', timestamp: ts, sproutId, result, capacityGained, reflection, client_id: c }, client_id: c, client_timestamp: ts })
}

function uproot(date, time, sproutId, soilReturned) {
  const ts = chicago(date, time)
  const c = cid(ts)
  events.push({ type: 'sprout_uprooted', payload: { type: 'sprout_uprooted', timestamp: ts, sproutId, soilReturned, client_id: c }, client_id: c, client_timestamp: ts })
}

function sun(date, time, twig, content) {
  const ts = chicago(date, time)
  const c = cid(ts)
  events.push({ type: 'sun_shone', payload: { type: 'sun_shone', timestamp: ts, twigId: tid(twig), twigLabel: tlab(twig), content, client_id: c }, client_id: c, client_timestamp: ts })
}

function leaf(date, time, leafId, twig, name) {
  const ts = chicago(date, time)
  const c = cid(ts)
  events.push({ type: 'leaf_created', payload: { type: 'leaf_created', timestamp: ts, leafId, twigId: tid(twig), name, client_id: c }, client_id: c, client_timestamp: ts })
}

// ═════════════════════════════════════════════════════════════════════════════
// NARRATIVE: 5-month journey (Sept 23 2025 – Feb 22 2026)
// ═════════════════════════════════════════════════════════════════════════════

// ── Week 1: Sept 23-28 (Eager start) ────────────────────────────────────────
leaf('2025-09-23', '09:00', L.writingJourney, '1-1', 'Writing Journey')
plant('2025-09-23', '09:15', S.journal2w, '1-1', 'Journal daily for 2 weeks', '2w', 'fertile', 2,
  ['Wrote once', 'Wrote most days', 'Journaling feels natural'], L.writingJourney)
leaf('2025-09-23', '09:25', L.gettingMoving, '0-0', 'Getting Moving')
plant('2025-09-23', '09:30', S.walk20min, '0-0', 'Walk 20 min daily', '2w', 'fertile', 2,
  ['Walked once', 'Walking most days', 'Daily walks are automatic'], L.gettingMoving)
water('2025-09-23', '20:00', S.journal2w, 'First entry. Feels weird writing to nobody. But also freeing.')
water('2025-09-23', '20:15', S.walk20min, 'Evening walk around the block. Nice sunset.')
water('2025-09-24', '07:30', S.journal2w, 'Morning pages. Stream of consciousness. Mostly anxieties.')
water('2025-09-24', '17:00', S.walk20min, 'Walked to the coffee shop instead of driving.')
water('2025-09-25', '21:00', S.journal2w, 'Wrote about childhood. Surprised where the pen took me.')
water('2025-09-25', '12:00', S.walk20min, 'Lunchtime walk. Found a new path through the park.')
water('2025-09-26', '22:00', S.journal2w, 'Short entry tonight. Tired but showed up.')
water('2025-09-26', '07:00', S.walk20min, 'Morning walk before work. Crisp fall air.')
sun('2025-09-27', '10:00', '1-1', 'Writing is harder than I thought. The blank page is intimidating but also exciting. Two sprouts feels right for starting out.')
water('2025-09-27', '20:30', S.journal2w, 'Wrote about what I want from this app. Goals for the year.')
water('2025-09-28', '11:00', S.walk20min, 'Long walk with the dog. He loved the leaves.')

// ── Week 2: Sept 29 – Oct 5 ─────────────────────────────────────────────────
water('2025-09-29', '07:15', S.journal2w, 'Quick morning entry. Gratitude list. Simple but effective.')
water('2025-09-29', '17:30', S.walk20min, 'After-work walk. Listened to a podcast.')
water('2025-09-30', '22:00', S.journal2w, 'Late night writing. Can\'t sleep, might as well write.')
water('2025-10-01', '12:15', S.walk20min, 'Walked during lunch. The routine is forming.')
water('2025-10-01', '21:30', S.journal2w, 'Wrote about an old friendship. Miss that connection.')
water('2025-10-02', '07:00', S.walk20min, 'Morning walk. Saw a hawk.')
water('2025-10-03', '20:00', S.journal2w, 'Reflecting on the week. Writing is becoming easier.')
sun('2025-10-04', '09:00', '0-0', 'Walking has become the highlight of my day. Simple but grounding. The morning air clears my head better than coffee.')
water('2025-10-04', '16:00', S.walk20min, 'Weekend stroll through the neighborhood. Noticed houses I never paid attention to.')
water('2025-10-05', '21:00', S.journal2w, 'Last entry before harvest. Two weeks of writing. I did it.')

// ── Week 3: Oct 6-12 (First harvests, expanding) ────────────────────────────
harvest('2025-10-08', '08:00', S.journal2w, 4, 0.3387, 'Two weeks of daily writing. Missed one day but the habit is forming. Surprised how much I had to say.')
harvest('2025-10-08', '08:15', S.walk20min, 3, 0.1742, 'Walked most days. Some were just 10 minutes but I showed up.')
plant('2025-10-06', '09:00', S.run5k, '0-0', 'Run a 5K', '3m', 'firm', 8,
  ['Ran once', 'Running 2x/week', 'Completed a 5K'], L.gettingMoving)
leaf('2025-10-06', '09:10', L.moneyAwareness, '4-0', 'Money Awareness')
plant('2025-10-06', '09:15', S.trackSpending, '4-0', 'Track spending for 1 month', '1m', 'fertile', 3,
  ['Tracked 1 week', 'Tracked most days', 'Full month tracked with insights'], L.moneyAwareness)
water('2025-10-06', '18:00', S.run5k, 'First run. Made it 8 minutes before stopping. Humbling start.')
water('2025-10-07', '20:00', S.trackSpending, 'Set up a spreadsheet. Logged today\'s purchases.')
water('2025-10-08', '06:30', S.run5k, 'Morning jog. 10 minutes. Legs are sore.')
water('2025-10-09', '21:00', S.trackSpending, 'Logged everything. That coffee habit is expensive.')
water('2025-10-10', '17:30', S.run5k, 'After work run. 12 minutes. Getting slightly easier.')
sun('2025-10-11', '10:30', '4-0', 'Money awareness is uncomfortable but necessary. Seeing where it all goes is the first step.')
water('2025-10-11', '15:00', S.trackSpending, 'Weekend spending audit. Eating out is the big one.')
water('2025-10-12', '08:00', S.run5k, 'Sunday morning run. 13 minutes. Breathing is improving.')

// ── Week 4: Oct 13-19 (Guitar enters) ───────────────────────────────────────
leaf('2025-10-13', '19:00', L.guitarPath, '7-0', 'Guitar Path')
plant('2025-10-13', '19:15', S.guitar3chords, '7-0', 'Learn 3 guitar chords', '1m', 'fertile', 3,
  ['Learned 1 chord', 'Can play 3 chords slowly', 'Smooth chord transitions'], L.guitarPath)
water('2025-10-13', '20:00', S.guitar3chords, 'Dusted off the guitar. Learned G major. Fingers hurt.')
water('2025-10-14', '06:45', S.run5k, 'Morning run. 14 minutes. Hit a wall at 10 but pushed through.')
water('2025-10-14', '21:00', S.trackSpending, 'Groceries and gas. Trying to cook more, eat out less.')
water('2025-10-15', '20:30', S.guitar3chords, 'C major and back to G. The transitions are ugly.')
water('2025-10-16', '17:00', S.run5k, 'Short run. 10 minutes. Tired from work.')
water('2025-10-17', '21:00', S.trackSpending, 'Midweek log. On track. Small purchases add up.')
water('2025-10-17', '21:30', S.guitar3chords, 'D major. Three chords now. Can almost play a song.')
sun('2025-10-18', '11:00', '7-0', 'Guitar is pure joy. The sore fingers are worth it. Music feels like the creative outlet I\'ve been missing.')
water('2025-10-18', '16:00', S.run5k, 'Weekend long run attempt. 18 minutes. New personal best.')
water('2025-10-19', '20:00', S.guitar3chords, 'Practiced transitions: G-C-D. Getting smoother.')

// ── Week 5: Oct 20-26 (Short story) ─────────────────────────────────────────
plant('2025-10-20', '08:00', S.shortStory, '1-1', 'Write a short story', '1m', 'firm', 5,
  ['Started an outline', 'First draft half done', 'Complete short story drafted'], L.writingJourney)
water('2025-10-20', '21:00', S.shortStory, 'Brainstormed story ideas. Something about a lighthouse keeper.')
water('2025-10-21', '06:30', S.run5k, 'Morning run. 15 minutes steady. Less walking breaks.')
water('2025-10-21', '20:00', S.trackSpending, 'Logged. Starting to see weekly patterns.')
water('2025-10-22', '21:30', S.guitar3chords, 'Guitar practice. G-C-D progression feels natural now.')
water('2025-10-22', '22:00', S.shortStory, 'Outlined the story. Three acts. Lighthouse, storm, revelation.')
water('2025-10-23', '17:30', S.run5k, 'Quick run after work. 12 minutes. Just maintaining.')
water('2025-10-24', '21:00', S.guitar3chords, 'Learned Em. Four chords now. Can play Knockin\' on Heaven\'s Door badly.')
water('2025-10-24', '21:30', S.shortStory, 'Wrote 500 words. The keeper\'s voice is coming through.')
sun('2025-10-25', '10:00', '1-1', 'Writing fiction is completely different from journaling. The characters surprise me. The lighthouse story has a life of its own.')
water('2025-10-25', '14:00', S.run5k, 'Long run. 20 minutes. Starting to feel like a runner.')
water('2025-10-26', '20:00', S.trackSpending, 'Weekly review. Spent less on eating out. Progress.')

// ── Week 6: Oct 27 – Nov 2 (Peak activity) ──────────────────────────────────
water('2025-10-27', '06:30', S.run5k, 'Early run. 16 minutes. Dark out but streetlights helped.')
water('2025-10-27', '21:00', S.shortStory, '800 words today. The storm scene is writing itself.')
water('2025-10-28', '20:30', S.guitar3chords, 'Guitar. Am chord now. Fingers are callousing.')
water('2025-10-29', '17:30', S.run5k, 'Run in the rain. Oddly refreshing. 18 minutes.')
water('2025-10-29', '22:00', S.shortStory, 'Wrote the climax. The keeper makes his choice.')
water('2025-10-30', '21:00', S.trackSpending, 'End of month approaching. Budget mostly held.')
water('2025-10-31', '20:00', S.guitar3chords, 'Halloween practice. Played for trick-or-treaters. They were polite about it.')
leaf('2025-11-01', '08:55', L.kitchenSkills, '3-0', 'Kitchen Skills')
plant('2025-11-01', '09:00', S.cook3recipes, '3-0', 'Cook 3 new recipes', '2w', 'fertile', 2,
  ['Tried 1 recipe', 'Cooked 2 new dishes', 'Three new recipes in rotation'], L.kitchenSkills)
sun('2025-11-01', '10:30', '3-0', 'Cooking has been neglected. Time to feed myself better. Connected to the running too — fuel matters.')
water('2025-11-01', '18:00', S.cook3recipes, 'Tried Thai basil chicken. Decent. Too much fish sauce.')
water('2025-11-02', '14:00', S.run5k, 'Sunday run. 22 minutes. Might actually make the 5K.')

// ── Week 7: Nov 3-9 ─────────────────────────────────────────────────────────
water('2025-11-03', '21:00', S.shortStory, 'Editing pass. Cut 200 words. Tighter now.')
water('2025-11-04', '06:30', S.run5k, 'Morning run. 17 minutes. Consistent.')
harvest('2025-11-06', '20:00', S.trackSpending, 3, 0.1712, 'Tracked spending for a full month. Eye-opening. The awareness alone changed my habits.')
water('2025-11-05', '19:00', S.cook3recipes, 'Made shakshuka. Easy and delicious.')
water('2025-11-05', '20:00', S.guitar3chords, 'Five chords now. Learning a full song.')
water('2025-11-06', '17:30', S.run5k, 'Run in the cold. 15 minutes. Need gloves.')
water('2025-11-06', '22:00', S.shortStory, 'Second draft done. Need fresh eyes before the final pass.')
plant('2025-11-07', '08:00', S.emergencyFund, '4-0', 'Build an emergency fund tracker', '1m', 'firm', 5,
  ['Researched savings accounts', 'Tracker built, first deposit made', 'Automated savings with clear target'], L.moneyAwareness)
water('2025-11-07', '20:00', S.emergencyFund, 'Researched high-yield savings accounts. Numbers are better than expected.')
sun('2025-11-08', '11:00', '0-0', 'Running in November requires a different kind of commitment. The cold is a test. Passing it every time.')
water('2025-11-08', '14:00', S.run5k, 'Weekend run. 24 minutes. So close to 5K distance.')
water('2025-11-09', '19:00', S.cook3recipes, 'Made roasted cauliflower tacos. New favorite.')

// ── Week 8: Nov 10-16 ───────────────────────────────────────────────────────
water('2025-11-10', '06:30', S.run5k, 'Morning run. 20 minutes steady. No walk breaks.')
water('2025-11-10', '21:00', S.shortStory, 'Final draft of the lighthouse story. 2,400 words. Done.')
water('2025-11-11', '20:00', S.guitar3chords, 'Learning Wish You Were Here intro. Beautiful melody.')
water('2025-11-11', '20:30', S.emergencyFund, 'Set up automatic transfers. $50/week to savings.')
harvest('2025-11-16', '08:00', S.cook3recipes, 4, 0.3330, 'Three new recipes learned. Thai chicken is in rotation. Cooking feels less like a chore now.')
water('2025-11-12', '17:30', S.run5k, 'Midweek run. 22 minutes. Feeling strong.')
water('2025-11-13', '21:00', S.emergencyFund, 'Tracking the emergency fund. $200 saved so far.')
water('2025-11-14', '20:00', S.guitar3chords, 'Guitar. Can play a full song start to finish now. Rough but recognizable.')
harvest('2025-11-14', '21:00', S.guitar3chords, 4, 0.3319, 'Learned 5 chords. Fingers don\'t hurt anymore. Can play two songs badly.')
harvest('2025-11-20', '22:00', S.shortStory, 5, 0.5854, 'The lighthouse story is finished. Actually proud of it. Sent it to two friends.')
sun('2025-11-15', '10:00', '5-7', 'Reflecting on two months in. The tree is growing. Each harvest feels like proof that slow is okay.')
water('2025-11-15', '14:00', S.run5k, 'Long Saturday run. 26 minutes. 5K is within reach.')
water('2025-11-16', '20:00', S.emergencyFund, 'Adjusted budget. Can do $75/week to savings.')

// ── Week 9: Nov 17-23 ───────────────────────────────────────────────────────
leaf('2025-11-17', '07:55', L.eatingWell, '0-1', 'Eating Well')
plant('2025-11-17', '08:00', S.mealPrep, '0-1', 'Meal prep Sundays', '2w', 'fertile', 2,
  ['Prepped one meal', 'Prepped 3 meals', 'Full week prepped'], L.eatingWell)
water('2025-11-17', '18:00', S.mealPrep, 'First meal prep Sunday. Made chili and rice bowls. Enough for 4 days.')
water('2025-11-18', '06:30', S.run5k, 'Morning run. 18 minutes. Legs felt heavy.')
water('2025-11-19', '20:00', S.emergencyFund, 'Emergency fund at $350. Ahead of schedule.')
water('2025-11-20', '17:30', S.run5k, 'Short run. 12 minutes. Just didn\'t have it today.')
plant('2025-11-21', '21:30', S.dailyWalks, '0-0', 'Take daily walks again', '2w', 'fertile', 2,
  ['Walked once', 'Walking most days', 'Daily walks restored'], L.gettingMoving)
sun('2025-11-22', '10:00', '0-1', 'Meal prep saves money and time. Why didn\'t I do this sooner?')
water('2025-11-22', '14:00', S.run5k, 'Saturday run. 25 minutes. Pushed through the mental wall.')
water('2025-11-22', '18:00', S.dailyWalks, 'Afternoon walk. Getting dark early now.')
water('2025-11-23', '11:00', S.mealPrep, 'Prepped chicken stir-fry and pasta. Feeling organized.')

// ── Week 10: Nov 24-30 ──────────────────────────────────────────────────────
water('2025-11-24', '17:00', S.dailyWalks, 'Walk after work. Listened to an audiobook.')
water('2025-11-25', '06:30', S.run5k, 'Morning run. 20 minutes. Autopilot.')
water('2025-11-25', '21:00', S.emergencyFund, 'Emergency fund update. $475. Getting there.')
water('2025-11-26', '18:00', S.dailyWalks, 'Short walk. Cold but needed the air.')
harvest('2025-12-02', '08:00', S.mealPrep, 3, 0.1699, 'Meal prepped both weekends. Saved money and ate better.')
plant('2025-11-28', '09:00', S.mindfulWalk, '0-0', 'Walk with intention', '2w', 'fertile', 2,
  ['Walked once mindfully', 'Walking with awareness most days', 'Mindful walking is natural'], L.gettingMoving)
water('2025-11-28', '15:00', S.dailyWalks, 'Post-Thanksgiving walk. Needed it.')
water('2025-11-28', '16:00', S.mindfulWalk, 'First intentional walk. Noticed the trees. Really noticed.')
sun('2025-11-29', '10:00', '2-2', 'Focus has been scattered. Too many sprouts active. Need to think about what matters most.')
plant('2025-11-29', '20:00', S.dailyOutdoor, '0-0', 'Daily outdoor time', '2w', 'fertile', 2,
  ['Went outside once', 'Outside most days', 'Daily outdoor habit locked in'], L.gettingMoving)
water('2025-11-29', '14:00', S.run5k, 'Saturday run. 27 minutes. Almost there.')
water('2025-11-30', '17:00', S.mindfulWalk, 'Evening walk. Counted my steps. 2,000.')
water('2025-11-30', '20:00', S.emergencyFund, 'Month-end. Emergency fund at $550.')
harvest('2025-12-07', '08:00', S.dailyWalks, 3, 0.1693, 'Walked most days. Simple but effective.')
plant('2025-11-30', '20:30', S.writeEveryOther, '1-1', 'Write every other day', '3m', 'firm', 8,
  ['Wrote once', 'Writing weekly', 'Writing every other day consistently'], L.writingJourney)

// ── December: Burnout + harvests ─────────────────────────────────────────────
harvest('2025-12-13', '09:00', S.mindfulWalk, 2, 0.1108, 'Mindful walking is harder than regular walking. Managed a few times.')
water('2025-12-02', '16:30', S.dailyOutdoor, 'Short walk. Mind was elsewhere.')
harvest('2025-12-08', '19:00', S.emergencyFund, 2, 0.2894, 'Budget tracking for a month. Didn\'t stick with it as well as I hoped.')
water('2025-12-04', '06:30', S.writeEveryOther, 'Barely half a page. Going through the motions.')
water('2025-12-05', '16:00', S.dailyOutdoor, 'Didn\'t really walk, just sat outside for 5 minutes.')
sun('2025-12-07', '11:00', '0-0', 'Haven\'t been moving much. Feeling the effects physically and mentally.')
water('2025-12-08', '06:30', S.writeEveryOther, 'One sentence. I don\'t feel like writing.')
uproot('2025-12-10', '10:00', S.dailyOutdoor, 0.50)
uproot('2025-12-12', '10:00', S.writeEveryOther, 0.75)
harvest('2026-01-05', '08:00', S.run5k, 4, 0.6050, 'Ran a 5K at the New Year\'s fun run. 34 minutes. Not fast, but finished.')

// ── The break ────────────────────────────────────────────────────────────────
sun('2025-12-29', '15:00', '5-7', 'Year-end reflection. Proud of what I started in September. The lapse is real but so is the foundation.')

// ── January: Recommitment ────────────────────────────────────────────────────
leaf('2026-01-05', '09:55', L.homeProjects, '3-4', 'Home Projects')
plant('2026-01-05', '10:00', S.organizeGarage, '3-4', 'Organize garage', '2w', 'fertile', 2,
  ['Cleared one shelf', 'Garage is mostly organized', 'Garage is clean and everything has a place'], L.homeProjects)
water('2026-01-05', '14:00', S.organizeGarage, 'Cleared out the first shelf. Found my old baseball glove.')
water('2026-01-07', '11:00', S.organizeGarage, 'Sorted tools. Threw out a bag of junk. Feels lighter.')
water('2026-01-09', '15:30', S.organizeGarage, 'Organized the workbench area. Starting to see the floor.')
sun('2026-01-11', '10:00', '3-4', 'Satisfying to create order from chaos. The garage project is grounding.')
plant('2026-01-12', '09:00', S.resumeWriting, '1-1', 'Resume writing habit', '2w', 'fertile', 2,
  ['Wrote once', 'Wrote 2-3 times a week', 'Writing feels natural again'], L.writingJourney)
water('2026-01-12', '14:00', S.organizeGarage, 'Swept the garage floor. Donated a box of old stuff.')
water('2026-01-13', '20:30', S.resumeWriting, 'First journal entry in weeks. Wrote about the break.')
water('2026-01-14', '11:30', S.organizeGarage, 'Hung up the bikes. Garage is looking good.')
water('2026-01-15', '21:00', S.resumeWriting, 'Wrote about New Year\'s intentions. Not resolutions, intentions.')
water('2026-01-16', '10:00', S.organizeGarage, 'Final touches on the garage. Labels on all the bins.')
water('2026-01-17', '20:00', S.resumeWriting, 'Short entry about the cold weather. Cozy inside.')
sun('2026-01-18', '10:30', '1-1', 'Returning to writing after the break. The pen feels heavier but also more honest.')
harvest('2026-01-19', '16:00', S.organizeGarage, 3, 0.1703, 'Garage is organized. Found things I forgot I had.')

// ── Late Jan: Park runs + writing harvest ────────────────────────────────────
leaf('2026-01-20', '08:00', L.morningRoutine, '0-0', 'Morning Routine')
plant('2026-01-20', '08:15', S.parkRun, '0-0', 'Park run Saturdays', '1m', 'fertile', 3,
  ['Ran once', 'Running most Saturdays', 'Saturday park run is locked in'], L.morningRoutine)
water('2026-01-20', '21:00', S.resumeWriting, 'Wrote about starting the running goal. Nervous but excited.')
water('2026-01-21', '07:30', S.parkRun, 'First park run. Managed 15 minutes before walking. Humbling.')
water('2026-01-22', '17:00', S.parkRun, 'Short jog around the block. Just keeping the momentum.')
water('2026-01-22', '20:30', S.resumeWriting, 'Journaled about the run. My legs are sore but my mood is up.')
water('2026-01-23', '21:00', S.resumeWriting, 'Quick entry. Grateful for the routine taking shape.')
water('2026-01-24', '08:00', S.parkRun, 'Saturday park run #2. Went 20 minutes straight. Huge win.')
water('2026-01-25', '10:00', S.parkRun, 'Recovery walk after yesterday\'s run. Easy and enjoyable.')
sun('2026-01-25', '11:00', '0-0', 'Running in the cold is surprisingly invigorating. The park run is becoming mine.')
water('2026-01-26', '08:30', S.parkRun, 'Easy jog. Starting to look forward to running.')
harvest('2026-01-26', '19:00', S.resumeWriting, 3, 0.1699, 'Two weeks of writing. Not as deep as the first round, but the habit returned.')
water('2026-01-27', '07:15', S.parkRun, 'Ran a new route through the park. Found a trail I didn\'t know about.')
water('2026-01-28', '16:00', S.parkRun, 'Rest day but went for a walk. Legs feeling strong.')
water('2026-01-29', '06:30', S.parkRun, 'Quick 15 min jog before work. Morning running hits different.')
water('2026-01-30', '07:00', S.parkRun, 'Interval training. Walk-run-walk-run. Building stamina.')
water('2026-01-31', '08:00', S.parkRun, 'Saturday park run #3. 25 minutes nonstop. Getting real.')

// ── February: Full momentum ─────────────────────────────────────────────────
water('2026-02-01', '10:00', S.parkRun, 'Gentle recovery walk. Listening to a podcast.')
sun('2026-02-01', '11:30', '1-0', 'Picking up books again. Missed this. Two books this month feels ambitious but right.')
water('2026-02-02', '07:00', S.parkRun, 'Monday jog. Starting the week with movement feels right.')
water('2026-02-03', '07:15', S.parkRun, 'Short jog in the rain. Felt alive.')
leaf('2026-02-03', '19:55', L.readingLife, '1-0', 'Reading Life')
plant('2026-02-03', '20:00', S.read2books, '1-0', 'Read 2 books this month', '1m', 'firm', 5,
  ['Started one book', 'Halfway through second book', 'Both books finished with notes'], L.readingLife)
water('2026-02-03', '22:00', S.read2books, 'Started The Overstory by Richard Powers. Beautiful prose.')
water('2026-02-04', '08:30', S.read2books, 'Read 30 pages on the train. Hooked.')
water('2026-02-04', '18:00', S.parkRun, 'Rest day. Foam rolling and stretching instead.')
water('2026-02-05', '12:30', S.read2books, 'Lunchtime reading. This book is changing how I see trees.')
water('2026-02-06', '07:00', S.parkRun, 'Park run getting longer. 30 minutes without stopping.')
water('2026-02-06', '21:30', S.read2books, 'Evening reading. Almost halfway through The Overstory.')
water('2026-02-07', '08:00', S.parkRun, 'Saturday park run #4. Ran the full loop for the first time.')
sun('2026-02-08', '10:00', '5-2', 'Starting to understand what flow means. Meditation is harder than running.')
water('2026-02-08', '22:00', S.read2books, 'Finished The Overstory. Incredible. Starting book two tomorrow.')
water('2026-02-09', '07:00', S.parkRun, 'Monday run. Found my pace. Not fast, but steady.')

// ── Feb 10+: Meditation + final stretch ──────────────────────────────────────
leaf('2026-02-10', '06:55', L.innerStillness, '5-2', 'Inner Stillness')
plant('2026-02-10', '07:00', S.meditate, '5-2', 'Meditate 10 min daily', '3m', 'fertile', 5,
  ['Meditated once', 'Meditating most days', 'Daily meditation is effortless'], L.innerStillness)
water('2026-02-10', '07:15', S.meditate, 'First meditation session. 10 minutes felt like an hour.')
water('2026-02-10', '21:30', S.read2books, 'Started Piranesi by Susanna Clarke. Weird and wonderful.')
water('2026-02-11', '07:00', S.parkRun, 'Short jog. Legs are tired but the habit is strong.')
water('2026-02-11', '07:15', S.meditate, 'Meditation day 2. Mind wandered constantly. That\'s normal apparently.')
water('2026-02-12', '16:30', S.parkRun, 'Rest day. Walked instead. Enjoying the cold air.')
water('2026-02-12', '22:00', S.read2books, 'Piranesi is strange. I keep thinking about the statues.')
water('2026-02-13', '07:00', S.meditate, 'Meditation getting slightly easier. Focused on breathing.')
water('2026-02-13', '21:00', S.read2books, 'Read a big chunk of Piranesi. The mystery is deepening.')
water('2026-02-14', '07:30', S.parkRun, 'Valentine\'s Day run. Treated myself to a coffee after.')
water('2026-02-14', '07:45', S.meditate, 'Morning meditation. Noticed I was calmer all day.')
sun('2026-02-15', '10:30', '0-4', 'Taking care of myself isn\'t selfish. It\'s the foundation for everything else.')
water('2026-02-15', '16:00', S.read2books, 'Finished Piranesi. Now to find book three...')
water('2026-02-16', '06:45', S.meditate, 'Meditation before the run. Good combo.')
water('2026-02-16', '07:00', S.parkRun, 'Ran in the morning fog. Magical.')
water('2026-02-16', '21:00', S.read2books, 'Started Circe by Madeline Miller. Mythology meets feminism.')
water('2026-02-17', '07:00', S.meditate, '10 minutes of quiet. Getting hooked on the stillness.')
leaf('2026-02-17', '18:55', L.gardenDreams, '3-6', 'Garden Dreams')
plant('2026-02-17', '19:00', S.springGarden, '3-6', 'Plan spring garden', '2w', 'fertile', 2,
  ['Browsed seed catalogs', 'Have a planting plan sketched', 'Full garden plan with timeline'], L.gardenDreams)
water('2026-02-17', '20:00', S.springGarden, 'Browsed seed catalogs online. Tomatoes and herbs for sure.')
water('2026-02-18', '07:00', S.parkRun, 'Park run in the cold. Getting tougher.')
water('2026-02-18', '07:15', S.meditate, 'Morning meditation. Actually looked forward to it today.')
water('2026-02-18', '22:00', S.read2books, 'Read 40 pages of Circe. Love her voice.')
water('2026-02-19', '19:30', S.springGarden, 'Sketched a garden layout. Raised beds might work.')
water('2026-02-19', '21:30', S.read2books, 'Evening reading. Circe\'s transformation is gripping.')
water('2026-02-20', '07:00', S.meditate, 'Post-harvest meditation. Reflecting on the running journey.')
water('2026-02-20', '16:00', S.springGarden, 'Measured the backyard plot. Bigger than I thought.')
harvest('2026-02-20', '18:00', S.parkRun, 4, 0.4434, 'A month of park runs. Saturday mornings belong to the trail now.')
water('2026-02-21', '07:00', S.meditate, '10 minutes. Noticed sounds I usually ignore. Birds outside.')
leaf('2026-02-21', '10:55', L.socialLife, '6-2', 'Social Life')
plant('2026-02-21', '11:00', S.gameNight, '6-2', 'Host game night', '2w', 'fertile', 2,
  ['Texted friends about it', 'Date is set and planned', 'Hosted a great night, next one scheduled'], L.socialLife)
water('2026-02-21', '22:00', S.read2books, 'Halfway through Circe. Taking my time with this one.')
water('2026-02-22', '10:00', S.gameNight, 'Texted the group chat. Saturday March 1st works for everyone.')
water('2026-02-22', '14:00', S.springGarden, 'Ordered seeds online. Basil, tomatoes, peppers, cilantro.')
sun('2026-02-22', '16:00', '3-6', 'Spring is coming. Excited to grow things — in the garden and in life. Five months in and the tree is filling out.')

// ═════════════════════════════════════════════════════════════════════════════
// Sort and output
// ═════════════════════════════════════════════════════════════════════════════
events.sort((a, b) => a.client_timestamp.localeCompare(b.client_timestamp))

const mode = process.argv[2] || '--sql'

function esc(str) { return str.replace(/'/g, "''") }

function toSQL(batch) {
  const header = 'INSERT INTO events (user_id, type, payload, client_id, client_timestamp) VALUES\n'
  const rows = batch.map(e => {
    const p = esc(JSON.stringify(e.payload))
    return `('${USER_ID}', '${e.type}', '${p}'::jsonb, '${e.client_id}', '${e.client_timestamp}')`
  })
  return header + rows.join(',\n') + ';'
}

if (mode === '--teardown') {
  console.log(`-- Remove all seed events for test user`)
  console.log(`DELETE FROM events WHERE user_id = '${USER_ID}';`)
  console.log(`-- Optionally remove the test user:`)
  console.log(`-- DELETE FROM auth.users WHERE id = '${USER_ID}';`)
  process.exit(0)
}

if (mode === '--json') {
  const output = events.map(e => ({ user_id: USER_ID, ...e }))
  console.log(JSON.stringify(output, null, 2))
} else if (mode === '--sql-files') {
  const BATCH = 50
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH)
    const idx = Math.floor(i / BATCH)
    const f = `SEED_BATCH_${idx}.sql`
    writeFileSync(f, toSQL(batch))
    console.log(`Wrote ${f} (${batch.length} events)`)
  }
} else {
  console.log(toSQL(events))
}

console.error(`\nTotal: ${events.length} events`)
const c = {}
for (const e of events) c[e.type] = (c[e.type] || 0) + 1
console.error(JSON.stringify(c, null, 2))
