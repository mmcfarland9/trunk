//
//  SharedConstants.swift
//  Trunk
//
//  AUTO-GENERATED from shared/constants.json
//  DO NOT EDIT DIRECTLY - run 'node shared/generate-constants.js'
//

import Foundation

// MARK: - Shared Constants

enum SharedConstants {

    // MARK: - Soil

    enum Soil {
        static let startingCapacity: Double = 10
        static let maxCapacity: Double = 120

        /// Planting costs by season and environment
        static let plantingCosts: [String: [String: Int]] = [
            "2w": ["fertile": 2, "firm": 3, "barren": 4],
            "1m": ["fertile": 3, "firm": 5, "barren": 6],
            "3m": ["fertile": 5, "firm": 8, "barren": 10],
            "6m": ["fertile": 8, "firm": 12, "barren": 16],
            "1y": ["fertile": 12, "firm": 18, "barren": 24]
        ]

        /// Environment multipliers for rewards
        static let environmentMultipliers: [String: Double] = [
            "fertile": 1.1,
            "firm": 1.75,
            "barren": 2.4
        ]

        /// Result multipliers (1-5 scale)
        static let resultMultipliers: [Int: Double] = [
            1: 0.4,
            2: 0.55,
            3: 0.7,
            4: 0.85,
            5: 1
        ]

        /// Recovery rates
        static let waterRecovery: Double = 0.05
        static let sunRecovery: Double = 0.35
        static let uprootRefundRate: Double = 0.25
    }

    // MARK: - Water

    enum Water {
        static let dailyCapacity: Int = 3
        static let resetHour: Int = 6
    }

    // MARK: - Sun

    enum Sun {
        static let weeklyCapacity: Int = 1
        static let resetHour: Int = 6
    }

    // MARK: - Seasons

    enum Seasons {
        static let baseRewards: [String: Double] = [
            "2w": 0.26,
            "1m": 0.56,
            "3m": 1.95,
            "6m": 4.16,
            "1y": 8.84
        ]

        static let durations: [String: Int] = [
            "2w": 1209600000,
            "1m": 2592000000,
            "3m": 7776000000,
            "6m": 15552000000,
            "1y": 31536000000
        ]

        static let labels: [String: String] = [
            "2w": "2 weeks",
            "1m": "1 month",
            "3m": "3 months",
            "6m": "6 months",
            "1y": "1 year"
        ]
    }

    // MARK: - Environments

    enum Environments {
        static let labels: [String: String] = [
            "fertile": "Fertile",
            "firm": "Firm",
            "barren": "Barren"
        ]

        static let descriptions: [String: String] = [
            "fertile": "Easy to achieve",
            "firm": "Challenging stretch",
            "barren": "Very difficult"
        ]

        static let formHints: [String: String] = [
            "fertile": "[Comfortable terrain · no soil bonus]",
            "firm": "[New obstacles · +1 soil capacity]",
            "barren": "[Hostile conditions · +2 soil capacity]"
        ]
    }

    // MARK: - Results

    enum Results {
        static let labels: [Int: String] = [
            1: "Minimal",
            2: "Partial",
            3: "Good",
            4: "Strong",
            5: "Exceptional"
        ]

        static let descriptions: [Int: String] = [
            1: "Showed up but little progress",
            2: "Made some progress",
            3: "Met most expectations",
            4: "Exceeded expectations",
            5: "Fully achieved and then some"
        ]

        static let emojis: [Int: String] = [
            1: "🥀",
            2: "🌱",
            3: "🌿",
            4: "🌳",
            5: "🌲"
        ]
    }

    // MARK: - Tree

    enum Tree {
        static let branchCount: Int = 8
        static let twigCount: Int = 8

        static let branchNames: [String] = [
            "CORE",
            "BRAIN",
            "VOICE",
            "HANDS",
            "HEART",
            "BREATH",
            "BACK",
            "FEET"
        ]

        static let branchDescriptions: [String] = [
            "fitness & vitality",
            "knowledge & curiosity",
            "expression & creativity",
            "making & craft",
            "love & family",
            "regulation & renewal",
            "belonging & community",
            "stability & direction"
        ]

        /// Twig labels indexed by [branchIndex][twigIndex]
        static let twigLabels: [[String]] = [
            ["movement", "strength", "sport", "technique", "maintenance", "nutrition", "sleep", "appearance"],
            ["reading", "writing", "reasoning", "focus", "memory", "analysis", "dialogue", "exploration"],
            ["practice", "composition", "interpretation", "performance", "consumption", "curation", "completion", "publication"],
            ["design", "fabrication", "assembly", "repair", "refinement", "tooling", "tending", "preparation"],
            ["homemaking", "care", "presence", "intimacy", "communication", "ritual", "adventure", "joy"],
            ["observation", "nature", "flow", "repose", "idleness", "exposure", "abstinence", "reflection"],
            ["connection", "support", "gathering", "membership", "stewardship", "advocacy", "service", "culture"],
            ["work", "development", "positioning", "ventures", "finance", "operations", "planning", "administration"]
        ]

        /// Get twig label for a given branch and twig index
        static func twigLabel(branchIndex: Int, twigIndex: Int) -> String {
            guard branchIndex >= 0, branchIndex < twigLabels.count,
                  twigIndex >= 0, twigIndex < twigLabels[branchIndex].count else {
                return "Twig \(twigIndex + 1)"
            }
            return twigLabels[branchIndex][twigIndex]
        }

        /// Get branch name for a given index
        static func branchName(_ index: Int) -> String {
            guard index >= 0, index < branchNames.count else {
                return "Branch \(index + 1)"
            }
            return branchNames[index]
        }
    }

    // MARK: - Chart

    enum Chart {
        /// Fixed-interval bucket sizes in seconds, keyed by range ID
        static let fixedIntervalBuckets: [String: Int] = [
            "1d": 3600,
            "1w": 21600,
            "1m": 86400,
            "3m": 604800
        ]

        /// Ranges that use calendar-snapped semimonthly bucketing (1st & 15th of each month)
        static let semimonthlyRanges: Set<String> = ["6m", "ytd"]

        /// Target node count for adaptive (ALL) range
        static let adaptiveTargetNodes: Int = 24
    }

    // MARK: - Watering Prompts

    enum WateringPrompts {
        static let prompts: [String] = [
            "Where's your head at with this — honestly?",
            "What hit you today that you didn't expect to feel?",
            "Does this still feel like yours?",
            "What's your gut saying?",
            "Dread or drive — which one showed up today?",
            "What did you actually do today?",
            "Walk me through your last session. No editing.",
            "What happened the moment you started?",
            "One moment from today. The first one that comes to mind.",
            "Was today's time well spent, or just spent?",
            "On a tank of gas — how full are you for this right now?",
            "What's making this harder than it needs to be?",
            "Where's the energy leak?",
            "What part of this still has a pulse for you?",
            "Are you running on fumes or fire?",
            "What got in the way today — and was it real or invented?",
            "What pulled you off course?",
            "Where did the wheels come off?",
            "Where did you feel the drag?",
            "What blindsided you?",
            "What moved, even a little?",
            "What actually landed today?",
            "What worked — and do you know why it worked?",
            "What would you point to as evidence you're not wasting your time?",
            "Name one thing you nailed.",
            "What's the next move — just one?",
            "What could you do in 10 minutes?",
            "What's the laziest possible thing you could do that still counts?",
            "What would unblock you right now?",
            "If you had 30 minutes tomorrow, what would you do?",
            "What are you dodging?",
            "What have you been putting off that you know matters?",
            "Forget the good reasons — what's the real reason you're stuck?",
            "What's the thing you don't want to say out loud?",
            "What would you do if no one was watching?",
            "What part of your approach would you defend to someone?",
            "What's broken in your process that you keep tolerating?",
            "If this method was someone else's idea, would you still follow it?",
            "Could you keep doing this for three more months without burning out?",
            "What's the one tweak that would change the most?",
            "What do you actually need right now — not what you think you should need?",
            "Are you grinding yourself down, or just uncomfortable because the work is real?",
            "What weight could you put down for a day?",
            "Where's the line between discipline and punishment for you right now?",
            "What would change if you asked for help?",
            "Are you in this, or going through the motions?",
            "What would make you care about this again?",
            "Remember why you started. Is that reason still alive?",
            "If you had to re-choose this today, would you?",
            "What's the thread you're holding onto?",
            "If you're being honest — are you doing enough?",
            "What are you pretending is fine that isn't?",
            "What would someone who doesn't care about your feelings say about your progress?",
            "Where are you being lazy and calling it strategic?",
            "If someone was paying you to do this, would your effort be acceptable?",
            "What are you protecting yourself from by not going harder?",
            "Is this goal still right for you, or are you too stubborn to quit?",
            "What would it take for you to admit this approach isn't working?",
            "What pattern keeps repeating that you haven't addressed?",
            "Are you building a habit or just having a good week?",
            "What do you do right before you skip or give up?",
            "When do you tend to lose momentum — what triggers the drop?",
            "How many times have you restarted this versus actually pushed through?",
            "What's the first thing that slips when life gets stressful?",
            "What keeps tripping you up that you keep pretending won't?",
            "Are you moving too fast, too slow, or about right — how do you actually know?",
            "What would change if you had half the time left?",
            "Are you spending time on this or investing time in this?",
            "What's the difference between patience and procrastination for you right now?",
            "If someone watched how you spent today, would they guess this was a priority?",
            "How much time do you spend thinking about this versus doing something about it?",
            "Are you being patient or making excuses for being slow?",
            "Are you aiming for good enough or great — and which does this actually need?",
            "What standard are you holding yourself to, and where did it come from?",
            "What would done well actually look like? Be specific.",
            "When did you last raise the bar on yourself for this?",
            "Are you cutting corners or being efficient — where's the line?",
            "Are you settling for progress when you should be demanding growth?",
            "What's the scariest next step?",
            "What are you avoiding because it might not work?",
            "What's the worst that actually happens if you just go for it?",
            "Where are you playing it safe and calling it a strategy?",
            "What risk are you not taking that you probably should?",
            "What conversation, action, or decision would move this the most — that you keep deferring?",
            "Are you avoiding the hard part or genuinely working up to it?",
            "Is your current approach the best one, or just the first one you tried?",
            "What would you change about your method if you started over tomorrow?",
            "Are you doing what works, or what you've always done?",
            "What's one thing you could try differently tomorrow?",
            "What would someone who's already succeeded at this tell you to stop doing?",
            "If you zoomed way out on your approach, what would you see that you're missing up close?",
            "Are you optimizing the right variable?",
            "Is your system set up for the person you actually are, or the person you wish you were?",
            "Did you show up today because you wanted to or because you told yourself you had to?",
            "Are you relying on motivation when you need a system?",
            "What would discipline look like on your absolute worst day?",
            "Are you waiting to feel like it?",
            "What's keeping you going right now — desire, fear, habit, or obligation?",
            "If nobody was watching or tracking, would you still do this?",
            "When the resistance hits, what do you actually do?",
            "What evidence of progress could you show someone right now?",
            "When did you last tell someone the honest truth about where you are with this?",
            "Are you tracking anything, or just hoping?",
            "What would your weekly progress report say if you had to write one tonight?",
            "Who would notice if you quietly gave up?",
            "What would it take to convince a skeptic that you're serious about this?",
            "What's the best decision you've made about this so far?",
            "What mistake taught you the most?",
            "How far have you come from where you started — does it feel like enough?",
            "What would past-you think about where you are now?",
            "What worked this week that you should do more of?",
            "What's one thing you've learned about this that you didn't expect?",
            "If you only got credit for what you've done — not what you've planned — where would you stand?",
            "What's the one thing that would make the biggest difference this week?",
            "If this goes perfectly from here, what does that actually look like?",
            "What's the next real milestone — not a vague goal, a concrete one?",
            "What are you going to wish you'd started sooner?",
            "What would make tomorrow the best day you've had for this?",
            "How will you know when this is done — what's the actual finish line?",
            "What's the version of this you'd be proud of a year from now?",
            "What are you saying no to by saying yes to this?",
            "What is this costing you that you haven't accounted for?",
            "Is the sacrifice still worth it?",
            "What else is suffering because of the time you spend here?",
            "What would you give up to guarantee this succeeds?",
            "What are you neglecting that you'll eventually have to deal with?",
            "Is this changing who you are, or just what you do?",
            "What kind of person do you need to become to finish this?",
            "Does this still align with what you actually want?",
            "Are you doing this for who you are, or who you think you should be?",
            "What would walking away say about you? What would finishing say?",
            "If you stripped away obligation and expectation, would you still choose this?",
            "What aren't you saying about this, even to yourself?",
            "What would you do right now if you stopped overthinking?",
            "What's the real reason you might quit?",
            "Is this the hard part, or have you not gotten there yet?",
            "What are you pretending doesn't bother you about this?",
            "If you could see yourself from the outside, what would concern you?",
            "What question about this do you not want to answer right now?",
            "What part of your environment is helping this, and what part is fighting it?",
            "Are you waiting for conditions to be right, or making them right?",
            "What trigger in your daily life keeps pulling you off track?",
            "What would you need to rearrange to make this easier?",
            "Who in your life makes this harder without meaning to?",
            "Are your surroundings set up for this to succeed or for you to get distracted?",
            "Where exactly does the resistance kick in — what's the specific moment?",
            "What excuse have you used more than once?",
            "What does your avoidance actually look like? Describe it.",
            "What would happen if you just sat with the discomfort instead of escaping it?",
            "What's the minimum you could do today and still look yourself in the mirror?",
            "What barrier have you accepted that you could actually remove?",
            "Rate your effort this week 1-10. Now subtract 2 for bias. How does that number feel?",
            "When was the last time you gave this your genuine best?",
            "What does a perfect day for this goal look like — and when did you last have one?",
            "Are you coasting on early momentum?",
            "What would it mean to take this more seriously than you are right now?",
            "Will this matter in five years? Does the answer change what you do today?",
            "What would a complete stranger think watching you work on this?",
            "If you had to teach someone how to do what you're doing, what would you say first?",
            "What would you do differently if this was the last time you could try?",
            "What's the most honest thing you could say about where you are right now?",
            "What's the gap between your intention and your action today?",
            "Where's the disconnect between what you say you want and what you're actually doing?",
            "What's the difference between your plan and your reality right now?",
            "Are you where you expected to be at this point? If not — why not?",
            "What would actually close the gap between where you are and where you want to be?"
        ]
    }

    // MARK: - Sun Prompts

    enum SunPrompts {
        static let generic: [String] = [
            "What's your honest relationship with {twig} right now?",
            "Where do you want {twig} to be a year from now — and what would have to change?",
            "What have you been avoiding about {twig}?",
            "If you could redesign how {twig} works in your life, what would you change first?",
            "What's the real gap between where {twig} is and where it should be?",
            "What would it take to make {twig} something you're genuinely proud of?",
            "What's the uncomfortable truth about {twig} in your life?",
            "What pattern in {twig} keeps repeating that you haven't addressed?",
            "Is {twig} getting the attention it deserves, or are you coasting?",
            "What would {twig} look like if you stopped settling?",
            "Who do you know who's thriving in {twig} — what are they doing that you're not?",
            "What's the biggest risk you could take with {twig}?",
            "What will you regret not changing about {twig} five years from now?",
            "How has {twig} changed since you last really thought about it?",
            "What story are you telling yourself about {twig} that might not be true?",
            "What does the state of {twig} reveal about your real priorities?",
            "If someone audited your {twig}, what would they find?",
            "What would {twig} look like if you treated it like your top priority for a month?",
            "What's {twig} costing you by staying the way it is?",
            "Where are you playing it safe with {twig}?",
            "What would a bold move in {twig} actually look like?",
            "What needs to die in your approach to {twig} so something better can grow?",
            "What would {twig} look like at its absolute best — be specific?",
            "What's one hard decision about {twig} you've been dodging?",
            "What would you tell your past self about {twig}?",
            "What experiment could you run with {twig} this month?",
            "How does {twig} connect to what you actually care about most?",
            "What would it feel like to have {twig} genuinely handled?",
            "What boundary around {twig} do you need to set or enforce?",
            "What's the next chapter of {twig} for you — and have you started writing it?",
            "If {twig} had a report card, what grade would you give yourself?",
            "What would your life feel like if {twig} was exactly where you wanted it?",
            "What about {twig} used to excite you that doesn't anymore?",
            "What would it look like to invest in {twig} instead of just maintain it?",
            "What's the conversation you need to have with yourself about {twig}?"
        ]

        static let specific: [String: [String]] = [
            "branch-0-twig-0": [
                "What would your life look like if you moved your body exactly the way you wanted to?",
                "A year ago, how were you moving differently — better or worse?",
                "If movement wasn't about results, what would you do for the pure feeling of it?",
                "Where does movement actually rank in your life — and where should it?"
            ],
            "branch-0-twig-1": [
                "What does being strong mean to you beyond the physical?",
                "Are you building strength or coasting on what you already have?",
                "What would feeling truly strong change about how you carry yourself?",
                "Where are you weaker than you pretend to be?"
            ],
            "branch-0-twig-2": [
                "What draws you to sport — competition, community, the rush, or something else?",
                "What has sport taught you that nothing else could?",
                "Are you playing to grow or playing to stay comfortable?",
                "What would your athletic life look like if you took it seriously for a year?"
            ],
            "branch-0-twig-3": [
                "Where in your physical life are you sloppy when you could be precise?",
                "Are you practicing or just repeating?",
                "What would real mastery look like in one area of your physical practice?",
                "What technique would transform your results if you committed to it fully?"
            ],
            "branch-0-twig-4": [
                "What are you neglecting about your body that future-you will pay for?",
                "Are you taking care of your body, or just using it until something breaks?",
                "What checkup, repair, or tune-up have you been pushing off?",
                "When was the last time you treated your body like something worth maintaining?"
            ],
            "branch-0-twig-5": [
                "What's your honest relationship with food — fuel, comfort, avoidance, or joy?",
                "If you ate exactly the way you wanted to for a month, what would change?",
                "What food habit stopped serving you a while ago that you're still clinging to?",
                "Where's the line between enjoying food and using it?"
            ],
            "branch-0-twig-6": [
                "How would your life change if you slept well for a month straight?",
                "What are you sacrificing sleep for, and is it actually worth it?",
                "When did you last wake up feeling like you genuinely rested?",
                "What's your real relationship with sleep — respect or resentment?"
            ],
            "branch-0-twig-7": [
                "How much does how you look affect how you feel — and are you honest about that?",
                "Are you presenting who you are or performing who you think you should be?",
                "What part of your appearance have you given up on that maybe you shouldn't have?",
                "What would change if you felt genuinely good about how you showed up in the world?"
            ],
            "branch-1-twig-0": [
                "What's the last thing you read that actually changed how you think?",
                "If you could read anything for the next month with no obligations, what would it be?",
                "Are you reading enough, or reading the wrong things?",
                "What kind of reader do you want to be a year from now?"
            ],
            "branch-1-twig-1": [
                "What would you write if you knew nobody would ever see it?",
                "What's the thing you most need to get down on paper right now?",
                "How has writing — or not writing — shaped how you process your life?",
                "Where do you want to be with writing in a year?"
            ],
            "branch-1-twig-2": [
                "Where in your life are you thinking clearly, and where are you fooling yourself?",
                "What's a belief you hold that you've never seriously stress-tested?",
                "When did you last change your mind about something that actually mattered?",
                "Are you thinking for yourself, or running on borrowed conclusions?"
            ],
            "branch-1-twig-3": [
                "What would your life look like if you could actually focus when it counted?",
                "What's stealing your attention that you haven't confronted?",
                "Is your ability to concentrate getting sharper or duller — and why?",
                "What would you accomplish with twice the focus you have right now?"
            ],
            "branch-1-twig-4": [
                "What do you wish you could remember better — and what would it change?",
                "Are you training your memory or just hoping it holds up?",
                "What important thing have you forgotten that you shouldn't have?",
                "How would sharper recall change your daily life?"
            ],
            "branch-1-twig-5": [
                "Where are you oversimplifying something that deserves a harder look?",
                "What problem are you sitting on that you haven't properly broken down?",
                "Do you trust your analytical instincts — should you?",
                "What would thinking more rigorously about what matters actually look like for you?"
            ],
            "branch-1-twig-6": [
                "When did you last have a conversation that genuinely shifted your thinking?",
                "Who makes you smarter when you talk to them — are you talking to them enough?",
                "What conversation are you overdue for?",
                "Are you surrounding yourself with people who challenge you or people who agree with you?"
            ],
            "branch-1-twig-7": [
                "What are you curious about that you haven't made time for?",
                "When did you last learn something purely because it fascinated you?",
                "Where has your curiosity gone flat?",
                "What would you explore if time and money weren't factors?"
            ],
            "branch-2-twig-0": [
                "Are you practicing with intention, or just logging time?",
                "What would change if you practiced the hard stuff instead of the stuff you're already good at?",
                "How much of your practice is comfort, and how much is actual growth?",
                "What would your practice look like if you treated it like a professional?"
            ],
            "branch-2-twig-1": [
                "What's the thing you most want to make that you haven't started?",
                "What would you create if you stopped worrying about whether it was good?",
                "Where does your creative voice feel strongest right now?",
                "How has your creative ambition changed in the past year?"
            ],
            "branch-2-twig-2": [
                "What piece of work would you love to inhabit and make your own?",
                "Are you interpreting or imitating — do you know the line?",
                "What do you bring to interpretation that nobody else would?",
                "What would it mean to deeply understand one piece of work this year?"
            ],
            "branch-2-twig-3": [
                "What's your relationship with being watched — fear, thrill, or indifference?",
                "When did you last perform and feel fully alive?",
                "What would change if you stopped being afraid of the audience?",
                "Where do you want to be as a performer a year from now?"
            ],
            "branch-2-twig-4": [
                "Are you consuming enough to fuel your creative life, or drowning in it?",
                "What have you consumed recently that genuinely raised your standards?",
                "Is your intake intentional or passive?",
                "What should you be paying attention to that you're ignoring?"
            ],
            "branch-2-twig-5": [
                "What's your taste — and how has it evolved recently?",
                "Are you curating your influences or just accumulating them?",
                "What would it mean to be genuinely deliberate about what you let in?",
                "How would you describe your sensibility to a stranger?"
            ],
            "branch-2-twig-6": [
                "What's the thing you most need to finish right now?",
                "What's your pattern with unfinished work — real problem or a story you tell yourself?",
                "What would change if you actually shipped the thing you keep half-doing?",
                "Are you a starter or a finisher — and which do you need to become?"
            ],
            "branch-2-twig-7": [
                "What's stopping you from putting your work out there?",
                "What would change if the right person actually saw what you've made?",
                "Are you waiting for permission that nobody's going to give you?",
                "Where do you want to be with sharing your work a year from now?"
            ],
            "branch-3-twig-0": [
                "What in your world would you redesign if you had the skill?",
                "Where is your design sense strong, and where is it underdeveloped?",
                "What would you create if you could make anything at all?",
                "How do you want your eye for design to grow this year?"
            ],
            "branch-3-twig-1": [
                "What's the most satisfying thing you've ever built from scratch?",
                "What do you want to learn to make with your own hands?",
                "Where does the urge to build show up in your life?",
                "What would you make if you had the workshop, the tools, and the time?"
            ],
            "branch-3-twig-2": [
                "What project have you been meaning to put together?",
                "Do you figure things out as you go or follow the instructions — and which serves you better?",
                "What's sitting in a box somewhere waiting for you to build it?",
                "What would it feel like to finish a big assembly project this year?"
            ],
            "branch-3-twig-3": [
                "What's broken in your world that you've been tolerating instead of fixing?",
                "Are you someone who fixes or someone who replaces — which do you want to be?",
                "What repair skill would pay for itself over and over if you learned it?",
                "What would it feel like to finally deal with the things you've been ignoring?"
            ],
            "branch-3-twig-4": [
                "What's good enough in your life that could be great with one more pass?",
                "Where do you stop too soon?",
                "What's the difference between refinement and perfectionism for you?",
                "What would get noticeably better if you gave it one more hour?"
            ],
            "branch-3-twig-5": [
                "Do you have the right tools for what you're actually trying to do?",
                "What one piece of equipment would change your capability the most?",
                "Are you maintaining your tools or running them into the ground?",
                "What does your ideal workspace look like — and how far are you from it?"
            ],
            "branch-3-twig-6": [
                "What in your care deserves more attention than you've been giving it?",
                "What would flourish if you simply showed up for it consistently?",
                "Where are you letting something die slowly by neglect?",
                "What does tending teach you that nothing else can?"
            ],
            "branch-3-twig-7": [
                "What's your honest relationship with cooking — chore, joy, or survival mode?",
                "What do you want to be able to cook a year from now that you can't today?",
                "What meal would you be proud to make for someone you love?",
                "How does cooking — or not cooking — shape your daily life?"
            ],
            "branch-4-twig-0": [
                "Does your home feel like you — and if not, what's missing?",
                "What would change in your daily life if your space actually worked for you?",
                "What part of homemaking do you neglect because it feels unglamorous?",
                "What does your ideal home feel like — not look like, feel like?"
            ],
            "branch-4-twig-1": [
                "Who are you taking care of, and who's taking care of you?",
                "Are you caring sustainably, or draining yourself dry?",
                "Who needs something from you that you've been withholding?",
                "What does care actually look like when you're doing it right?"
            ],
            "branch-4-twig-2": [
                "When were you last fully present with someone — no screens, no agenda, no escape?",
                "Where do you check out when you should be checked in?",
                "What would change if you were genuinely there for the moments you're in?",
                "What does presence cost you — and is it worth paying?"
            ],
            "branch-4-twig-3": [
                "What would deeper closeness look like in your life right now?",
                "Where are you keeping people at arm's length — and do you know why?",
                "What's the most vulnerable thing you could let someone see?",
                "Are you as close to the people who matter as you actually want to be?"
            ],
            "branch-4-twig-4": [
                "What conversation would change everything if you actually had it?",
                "Are you saying what you mean, or saying what's safe?",
                "Where does your communication break down — and what triggers it?",
                "What would you say if you knew the other person could handle it?"
            ],
            "branch-4-twig-5": [
                "What ritual or tradition have you let lapse that you actually miss?",
                "What new ritual would enrich your life or relationships?",
                "What traditions are you carrying that are dead weight?",
                "How do your rituals reflect what you actually value?"
            ],
            "branch-4-twig-6": [
                "When did you last do something genuinely new?",
                "What adventure have you been talking about but never done?",
                "Are you in a rut or a rhythm — and are you sure you know which?",
                "What would you do this month if fear and logistics disappeared?"
            ],
            "branch-4-twig-7": [
                "When did you last laugh until it hurt?",
                "Where has the fun gone — and how do you get it back?",
                "Are you making room for joy, or waiting for it to find you?",
                "What brings you genuine delight that you don't do nearly enough of?"
            ],
            "branch-5-twig-0": [
                "What have you stopped noticing in your daily life?",
                "When did you last look at something closely enough to see what others miss?",
                "What would change if you spent a week paying twice as much attention?",
                "Are you moving through the world or actually living in it?"
            ],
            "branch-5-twig-1": [
                "When did you last spend real time in nature — not exercising, just being?",
                "What part of the natural world have you disconnected from?",
                "How long has it been since you felt genuinely small in a landscape?",
                "Where do you want your relationship with the outdoors to be a year from now?"
            ],
            "branch-5-twig-2": [
                "When did you last completely lose track of time?",
                "What reliably puts you in flow — and are you doing it enough?",
                "What's blocking you from the absorption you used to reach easily?",
                "What would change if you optimized for flow instead of productivity?"
            ],
            "branch-5-twig-3": [
                "Do you actually know how to rest, or do you just collapse?",
                "What does real rest look like for you — not screens, not scrolling, actual rest?",
                "When did you last feel genuinely restored after time off?",
                "Are you resting, or just calling exhaustion downtime?"
            ],
            "branch-5-twig-4": [
                "When did you last let yourself be truly idle — no input, no output, nothing?",
                "What are you afraid will happen if you stop being productive?",
                "What shows up in your head when there's nothing to do?",
                "Could you sit in an empty room for an hour without reaching for something?"
            ],
            "branch-5-twig-5": [
                "What discomfort have you been avoiding that might actually be good for you?",
                "When did you last deliberately put yourself in a hard situation?",
                "Where are your comfort zones shrinking instead of expanding?",
                "What would you learn by doing something difficult just because it's difficult?"
            ],
            "branch-5-twig-6": [
                "What would you discover about yourself by going without something you rely on?",
                "What are you depending on more than you'd like to admit?",
                "When did you last give something up — and what did the absence reveal?",
                "What's the thing you're most afraid to go without?"
            ],
            "branch-5-twig-7": [
                "Are you reflecting or just ruminating — do you know the difference?",
                "What have you learned about yourself recently that surprised you?",
                "What question about your life do you keep dodging?",
                "When did your last real insight arrive — and did you act on it?"
            ],
            "branch-6-twig-0": [
                "Who have you lost touch with that you wish you hadn't?",
                "What would your social life look like if you actually maintained it?",
                "Are you as connected as you want to be, or quietly drifting?",
                "What relationship would shift if you made the first move?"
            ],
            "branch-6-twig-1": [
                "Who are you supporting right now — and is it the right kind of support?",
                "When did you last help someone without being asked?",
                "What would it look like to be the kind of support you wish you'd had?",
                "Are you giving real support, or just performing it?"
            ],
            "branch-6-twig-2": [
                "When did you last bring people together?",
                "What would you host if logistics weren't an issue?",
                "Are you someone who gathers people, or someone who waits to be invited?",
                "What would it mean to be the person who makes things happen?"
            ],
            "branch-6-twig-3": [
                "Where do you belong — and where do you wish you belonged?",
                "What group or community would enrich your life if you actually joined?",
                "Have your memberships gone stale — do you even notice?",
                "What would it feel like to truly belong somewhere?"
            ],
            "branch-6-twig-4": [
                "What are you responsible for that you're not taking seriously enough?",
                "Where could you take real ownership of something bigger than yourself?",
                "What would the thing you steward look like if you gave it your full attention?",
                "Are you a good steward of what's been entrusted to you — honestly?"
            ],
            "branch-6-twig-5": [
                "What do you believe in strongly enough to speak up about — and are you?",
                "Where are you staying quiet when your voice is needed?",
                "What would you fight for if you had more courage?",
                "Are you an advocate or a bystander?"
            ],
            "branch-6-twig-6": [
                "When did you last serve someone with zero expectation of return?",
                "Where could you make the biggest difference with the least effort?",
                "Is service part of your life, or just something you think about?",
                "What would you do for your community if you had unlimited time?"
            ],
            "branch-6-twig-7": [
                "What cultural tradition or practice do you want to be part of?",
                "Are you contributing to the culture around you, or just consuming it?",
                "What part of your cultural identity matters most — and are you honoring it?",
                "What cultural experience would expand your world right now?"
            ],
            "branch-7-twig-0": [
                "Is your work taking you somewhere, or just keeping you occupied?",
                "What would your career look like if you redesigned it from scratch?",
                "Where are you settling professionally — and what's it getting you?",
                "What's the career conversation you keep avoiding?"
            ],
            "branch-7-twig-1": [
                "What skill would change your trajectory if you developed it this year?",
                "Are you growing professionally, or have you plateaued without noticing?",
                "What's the gap between your current capabilities and where you need to be?",
                "What would you invest in learning if you had a full year of development time?"
            ],
            "branch-7-twig-2": [
                "How are you positioned in your field — and is it where you want to be?",
                "What would change if the right people knew what you were capable of?",
                "Are you building your reputation deliberately or letting it happen to you?",
                "What one move would put you in a fundamentally better position a year from now?"
            ],
            "branch-7-twig-3": [
                "What's the idea you keep circling but never start?",
                "What small bet could change your trajectory?",
                "Where's the line between ambition and distraction for you right now?",
                "Are you someone who starts things — should you be?"
            ],
            "branch-7-twig-4": [
                "What's the honest state of your financial life — no spin?",
                "What money conversation are you avoiding?",
                "Where do you want to be financially in five years, and do your habits match?",
                "Is your relationship with money healthy, avoidant, or anxious?"
            ],
            "branch-7-twig-5": [
                "What system in your life is broken that you keep patching instead of replacing?",
                "If you audited how your day-to-day runs, what would you overhaul first?",
                "Where are you losing time to things that could be automated or killed?",
                "What one operational change would give you the most time back?"
            ],
            "branch-7-twig-6": [
                "How far ahead are you actually planning — and is it far enough?",
                "Could you write your plan for the next year right now? What does that tell you?",
                "Are you planning or daydreaming — what's the honest difference?",
                "What would change if you spent one focused hour a week on real strategy?"
            ],
            "branch-7-twig-7": [
                "What admin task have you been ignoring that's quietly making your life worse?",
                "How much mental space is life admin stealing from you right now?",
                "What would it feel like to be completely caught up on the boring stuff?",
                "What one administrative thing would clear the most weight off your mind?"
            ]
        ]

        /// Get a random prompt for a twig, replacing {twig} token with the label
        static func randomPrompt(twigId: String, twigLabel: String, excluding: Set<String> = []) -> String {
            let allGeneric = generic.filter { !excluding.contains($0) }
            let allSpecific = (specific[twigId] ?? []).filter { !excluding.contains($0) }

            let hasGeneric = !allGeneric.isEmpty
            let hasSpecific = !allSpecific.isEmpty

            guard hasGeneric || hasSpecific else {
                return generic.randomElement()?.replacingOccurrences(of: "{twig}", with: twigLabel)
                    ?? "What are you reflecting on today?"
            }

            let selected: String
            if !hasGeneric {
                selected = allSpecific.randomElement()!
            } else if !hasSpecific {
                selected = allGeneric.randomElement()!
            } else {
                selected = Double.random(in: 0...1) < 0.75
                    ? allGeneric.randomElement()!
                    : allSpecific.randomElement()!
            }

            return selected.replacingOccurrences(of: "{twig}", with: twigLabel)
        }
    }

    // MARK: - Prompt Config

    enum Prompts {
        static let recentWaterLimit: Int = 10
        static let recentShineLimit: Int = 15
        static let genericWeight: Double = 0.75
    }

    // MARK: - Event Types

    enum EventTypes {
        static let all: [String] = [
            "sprout_planted",
            "sprout_watered",
            "sprout_harvested",
            "sprout_uprooted",
            "sprout_edited",
            "sun_shone",
            "leaf_created"
        ]
    }

    // MARK: - Validation

    enum Validation {
        static let maxTitleLength: Int = 60
        static let maxLeafNameLength: Int = 40
        static let maxBloomLength: Int = 60
    }
}
