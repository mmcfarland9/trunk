# Future Ideas Archive

This document archives the planned features that were designed but not implemented. These ideas represent a vision for expanding Trunk into a full collectible ecosystem game.

**Status:** Archived (never implemented)
**Version:** Draft v0.3

---

## Overview: The Flowerdex

The core concept was that every cultivated Sprout would bloom into a collectible Flower with genetic traits that could be inherited, combined, and cross-pollinated. Players would discover new species, breed rare variants, and fill their Flowerdex (similar to a Pokédex).

Failed attempts would leave behind 🥀 Wilted blooms — still collected, still part of the player's story.

---

## Species Tiers

Base species were determined by Season length. Each tier would contain multiple discoverable species.

| Tier | Season | Species |
|------|--------|---------|
| **Common** 🌼 | 1 week | Daisy, Sunflower, Whitepetal |
| **Uncommon** 🌸 | 2 weeks | Cherry Blossom, Tulip, Bouquet |
| **Rare** 🌺 | 1 month | Hibiscus, Rosette, Clover |
| **Epic** 🪻 | 3 months | Hyacinth, Four-Leaf Clover, Golden Wheat |
| **Legendary** 🪷 | 6 months | Sacred Lotus, Bonzai Spirit, Desert Guardian |
| **Mythic** 🌹 | 1 year | Eternal Rose, ???, ??? |

### Hybrid Species

When flowers from different Branches bloom near each other, they could cross-pollinate to create Hybrid species with traits from both parents.

| Parents | Result | Chance |
|---------|--------|--------|
| 🌼 + 🌸 | Blushing Daisy | ~12% |
| 🌺 + 🪻 | Tropical Hyacinth | ~8% |
| 🌸 + 🌹 | Eternal Bouquet | ~3% |
| ??? + ??? | Undiscovered | ??? |

Cross-pollination would occur when you have active sprouts in multiple Branches simultaneously.

---

## Genetic System

### Trait Categories

Every flower would carry genetic traits that pass to offspring through cross-pollination. Traits have dominant (shown) and recessive (hidden) alleles.

#### 🎨 Pigment Genes
Control petal and leaf coloration.

| Allele | Type |
|--------|------|
| Crimson (Cr) | Dominant |
| Azure (Az) | Dominant |
| Golden (Go) | Dominant |
| Ivory (iv) | Recessive |
| Obsidian (ob) | Recessive |
| Prismatic (Pr) | Rare |

#### 🍃 Foliage Genes
Determine leaf shape and structure. Affects biome compatibility.

| Allele | Type |
|--------|------|
| Broad (Br) | Dominant |
| Needle (Ne) | Dominant |
| Palmate (Pa) | Dominant |
| Variegated (va) | Recessive |
| Serrated (se) | Recessive |
| Crystalline (Xy) | Rare |

#### ✨ Aura Genes
Visual effects and special properties. All auras are recessive or rare.

| Allele | Type |
|--------|------|
| Shimmer (sh) | Recessive |
| Glow (gl) | Recessive |
| Mist (mi) | Recessive |
| Radiant (Ra) | Rare |
| Celestial (Ce) | Mythic |

#### 🌙 Temporal Genes
When the flower blooms and how long it lasts.

| Allele | Type |
|--------|------|
| Diurnal (Di) | Dominant |
| Nocturnal (no) | Recessive |
| Dawn-bloom (da) | Recessive |
| Dusk-bloom (du) | Recessive |
| Everbloom (Ev) | Rare |

#### 🏔️ Adaptation Genes
Environmental tolerance and special survival traits.

| Allele | Type |
|--------|------|
| Hardy (Ha) | Dominant |
| Aquatic (aq) | Recessive |
| Xerophyte (xe) | Recessive |
| Alpine (al) | Recessive |
| Extremophile (Ex) | Rare |

### Inheritance Mechanics

Each flower carries two alleles for every trait — one from each parent. When breeding, offspring randomly inherit one allele from each parent.

Example Punnett Square:
```
Aa × Aa → AA, Aa, Aa, aa
25% pure dominant · 50% carrier · 25% pure recessive
```

### Mutations

Genetic anomalies could produce Mutant flowers with unique traits not found in either parent.

| Type | Chance | Effect |
|------|--------|--------|
| Minor Mutation 🧬 | ~5% | Single trait shifts |
| Major Mutation 🔬 | ~1% | New trait emerges |
| Pristine Mutation 💎 | ~0.1% | Perfect trait expression |
| Anomaly 🌌 | ~0.01% | Entirely new species |

Mutation chance increases with: longer seasons, streak bonuses, specific trait combinations.

### Mutation Research

| Condition | Mutation Bonus |
|-----------|---------------|
| Base Rate | ~2% per gene per breeding |
| Hybrid Parents | +3% mutation chance |
| Stressed Growth (wrong biome) | +5% |
| Nocturnal Breeding | +2% for aura genes |
| Perfect Specimens | -50% (genetic stability) |

### Gene Sequencing Progression

As you cultivate more flowers, you unlock the ability to "read" their genetic code.

| Level | Ability |
|-------|---------|
| Novice 🔬 | See 1 dominant trait |
| Apprentice 🧬 | See all dominant traits |
| Researcher 🔭 | See hidden recessives (50%) |
| Geneticist 🧪 | Full genome visibility |
| Master 🌌 | Predict offspring traits |

### Breeding Projects

Long-term breeding goals to isolate and express specific trait combinations.

| Goal | Chance |
|------|--------|
| Pure Prismatic Rose | ~0.01% |
| Celestial Everbloom | ~0.001% |
| Crystalline Extremophile | ~0.005% |
| The Impossible Bloom | ??? |

---

## Branch Biomes

Each Branch would represent a unique biome that favors certain species and traits.

### The Eight Realms

#### 🌲 Branch 1: Evergreen Forest
Dense coniferous woodland with filtered light and cool temperatures year-round. Rich in fungi and mosses.

- **Traits:** +Needle foliage, +Cold-hardy, +Shade-tolerant
- **Native Species:** Pine Blossom, Moss Rose, Frostbell

#### 🌴 Branch 2: Tropical Rainforest
Lush, humid jungle with towering canopy. Intense competition for light drives dramatic adaptations.

- **Traits:** +Vibrant pigments, +Broad leaves, +Rapid growth
- **Native Species:** Jungle Orchid, Paradise Bird, Canopy Vine

#### 🌳 Branch 3: Temperate Woodland
Deciduous forest with four distinct seasons. The most balanced biome, ideal for hybrid breeding.

- **Traits:** +Balanced traits, +Hybrid fertility +15%, +Seasonal blooms
- **Native Species:** Oak Bloom, Maple Star, Wildflower

#### 🏜️ Branch 4: Arid Desert
Scorching days, freezing nights. Only the most adapted species survive. Extreme stress increases mutation.

- **Traits:** +Xerophyte adaptation, +Mutation +10%, +Thick stems
- **Native Species:** Desert Rose, Sandfire, Moonbloom

#### 🌊 Branch 5: Coastal Shores
Salt spray, sandy soil, constant wind. Aquatic traits emerge here. Tidal rhythms affect bloom timing.

- **Traits:** +Aquatic adaptation, +Salt-tolerant, +Tidal blooms
- **Native Species:** Sea Lavender, Coral Lily, Driftwood Rose

#### ⛰️ Branch 6: Alpine Heights
Thin air, intense UV, extreme cold. High-altitude specialists develop unique protective traits.

- **Traits:** +Alpine adaptation, +Rare mutation +20%, +Compact growth
- **Native Species:** Edelweiss, Sky Gentian, Stone Orchid

#### 🌙 Branch 7: Twilight Grove
Perpetual dusk. Bioluminescent species thrive here. Temporal genes express more freely.

- **Traits:** +Nocturnal traits, +Aura genes +25%, +Glow effects
- **Native Species:** Moonpetal, Starflower, Glowmoss

#### ✨ Branch 8: Ethereal Glade
A realm between worlds. Reality bends here. Mythic species spawn naturally. The impossible becomes possible.

- **Traits:** +Mythic species +50%, +Celestial aura, +Reality-bending
- **Native Species:** Void Lily, Prism Rose, Eternal Bloom

### Biome Interactions

Cross-pollination between adjacent biomes creates unique hybrid opportunities.

| Combination | Result |
|-------------|--------|
| 🌲 + 🌳 | Transition species, hardy hybrids (Common) |
| 🏜️ + 🌊 | Impossible — biomes too different (0%) |
| 🌙 + ✨ | Otherworldly species (Rare) |
| All 8 | ??? Universal Bloom ??? |

### Climate Events

Random events that temporarily alter biome conditions.

| Event | Effect |
|-------|--------|
| 🌧️ Monsoon | +Aquatic traits in all biomes |
| ☀️ Heatwave | +Xerophyte mutations |
| ❄️ Cold Snap | +Alpine traits spread |
| 🌫️ Strange Fog | +Ethereal effects everywhere |
| 🌈 Prismatic Dawn | +50% all rare traits (24hr) |

---

## Companion Creatures

### Insect Companions

Beneficial insects attracted to your garden.

| Creature | Effect | Attraction |
|----------|--------|------------|
| 🐝 Honeybee | +15% cross-pollination success | 5+ flowering species |
| 🦋 Butterfly | +10% mutation chance | Nectar-rich flowers |
| 🐞 Ladybug | Failed → 25% retry chance | Healthy ecosystem |
| 🪲 Scarab Beetle | +5% offspring quality | Arid/desert biomes |
| 🦗 Cricket | +Temporal gene expression | Twilight biome |
| 🐛 Silkworm | +Rare trait inheritance | Mulberry species |

### Common Garden Visitors

| Creature | Habitat | Bonus |
|----------|---------|-------|
| 🐦 Songbird | All biomes | Seeds spread faster between branches |
| 🐿️ Squirrel | Evergreen, Temperate | Caches seeds for future seasons |
| 🐇 Rabbit | Temperate, Coastal | +Luck for common species |
| 🦔 Hedgehog | Temperate, Twilight | Protects against pest damage |

### Biome-Specific Fauna

**🌲 Evergreen Forest**
- 🦌 Deer — Spreads seeds across great distances
- 🦉 Owl — +Nocturnal trait expression
- 🐻 Bear — Rare, grants +Hardy genes

**🌴 Tropical Rainforest**
- 🦜 Parrot — +25% rare species discovery
- 🐒 Monkey — Redistributes flowers between twigs
- 🦎 Chameleon — +Pigment gene variety

**🏜️ Arid Desert**
- 🦂 Scorpion — +Extremophile mutations
- 🐍 Sand Viper — Guards rare specimens
- 🦅 Eagle — Overview of entire garden (+vision)

**🌊 Coastal Shores**
- 🦀 Crab — +Aquatic trait inheritance
- 🐚 Hermit — Protects young seedlings
- 🐬 Dolphin — Rare, +Luck across all biomes

**⛰️ Alpine Heights**
- 🦙 Llama — Hardy seed transport
- 🦅 Condor — Cross-biome pollination
- 🐐 Mountain Goat — Access to impossible locations

**🌙 Twilight Grove**
- 🦇 Bat — Nocturnal pollination
- 🦊 Fox — Clever, reveals hidden traits
- 🐺 Wolf — Pack bonus, multiple wolves multiply

**✨ Ethereal Glade**
- 🦄 Unicorn — +50% Mythic species chance
- 🐉 Dragon — Legendary, guards mythic blooms
- 🦚 Phoenix Peacock — Resurrects wilted flowers (1/season)

### Legendary Guardians

Ancient beings that appear only in the most flourishing gardens.

| Guardian | Requirement | Bonus |
|----------|-------------|-------|
| 🐢 Ancient Tortoise | 100+ cultivated flowers | Time flows differently — seasons extended |
| 🦢 Swan Queen | All common species discovered | All flowers gain +Grace trait |
| 🐋 Sky Whale | Coastal + Ethereal mastery | Cross-biome breeding has no penalties |

---

## Growth States

| State | Emoji | Description |
|-------|-------|-------------|
| Seedling | 🌱 | Sprout planted, genetics determined at this stage |
| Growing | 🌿 | Season in progress, can still cross-pollinate |
| Budding | 🪺 | Ready to harvest, traits locked in |
| Bloomed | 🌸 | Successfully cultivated → added to Flowerdex |
| Wilted | 🥀 | Failed → wilted variant collected |
| Fallen | 🍂 | Uprooted → no collection, genetics lost |

---

## Progression & Collection

### Flowerdex Completion

| Category | Count |
|----------|-------|
| 📖 Base Species | 18 species across 6 tiers |
| 🧬 Hybrid Species | 24+ discoverable combinations |
| 💎 Mutant Species | ??? hidden species |
| 🎨 Trait Variants | 100+ possible trait combinations |
| 🏆 Perfect Specimens | All dominant traits expressed |

### Grove Milestones

Each Branch grows from barren soil into a thriving grove as you cultivate more flowers.

| Level | Flowers | Unlocks |
|-------|---------|---------|
| Barren 🌱 | 0 | Start your journey |
| Sprouting 🌿 | 3+ | Cross-pollination |
| Growing 🌲 | 8+ | Companions |
| Flourishing 🌳 | 25+ | Biome bonus active |
| Ancient 🌴 | 100+ | Legendary species chance + |
| Mythic Grove 🏛️ | All species | ??? |

### Creature Collection

| Category | Count |
|----------|-------|
| 🐾 Common | 12 creatures |
| 🦁 Biome-Specific | 24 creatures |
| ✨ Mythic | 3 creatures |
| 👑 Legendary | 3 guardians |
| 📖 **Total** | **42 creatures** |

### Achievements

| Achievement | Requirement |
|-------------|-------------|
| 🌰 First Seed | Plant your very first sprout |
| 🧬 First Hybrid | Discover your first cross-pollinated species |
| 🔬 Geneticist | Observe 10 different trait combinations |
| 💐 Bouquet Master | Collect one flower from each base tier |
| 🍀 Lucky Gardener | Get 3 lucky bloom upgrades |
| 🦋 Butterfly Effect | Attract all 5 companion types |
| 🌌 Anomaly Hunter | Discover a mutation anomaly species |
| 🌲🌳🌴 Full Forest | Reach Flourishing in all 8 Branches |
| 📚 Flowerdex Complete | Discover every species in existence |

---

## Design Notes

From the original draft:

- All emojis are placeholders — will be replaced with illustrated flowers
- Each species will have unique illustrated variants based on genetic traits
- Breeding mechanics inspired by Forestry/Extra Bees for Minecraft
- Flowerdex tracks discovery like a Pokédex — silhouettes for undiscovered
- Cross-pollination requires active sprouts in 2+ Branches simultaneously

### Considerations for Future

- "Greenhouse" feature to control breeding environment?
- Trading/gifting flowers or seeds between users?
- Seasonal real-world events with limited species?
- "Exhibition" mode to showcase your best specimens?

---

*Archived: January 2026*


TRUNK!

slogan:
reap what you sow

[TODO]: leaves should be green, finished stuff after sprout. twigs are brown. visualization of past success to decorate? floral colors? etc? hm..

season -- a phase or period of time
sprout -- a task or goal to be accomplished within a season
uproot -- pull a sprout out (delete, remove) for extra soil
graft -- growing from one successful sprout to another -- a saga