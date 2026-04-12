# Save Timeline / Git Tree Visualization

## Problem

After shiny hunting with eggs, the save flow is confusing:
- Multiple saves accumulate (hunt base, catches, post-catch with swapped daycare, etc.)
- No clear lineage — which save branched from which?
- Easy to lose track of the "main" playthrough vs hunting snapshots
- After catching a shiny and continuing (swap daycare target, save), you need to manually manage which save to hunt from next

## Concept

A visual timeline/tree for save files — like a git history. Each save knows its parent (where it branched from). Interactive UI lets you:
- See your full playthrough as a branching tree
- Understand which saves are "main line" vs hunt branches
- Click any node to see its details (party, location, daycare, badges)
- Continue from any save point
- Start a new hunt from any save

## Example Tree

```
Crystal.sav (post-trades, 6 badges, Goldenrod City)
  ├── egg-hunt-charmander.sav (party:1, daycare: Charmander + Shiny Ditto)
  │     └── catch: Shiny Charmander A14/D10/Sp10/Sc10
  │           └── egg-hunt-squirtle.sav (swapped daycare to Squirtle)
  │                 └── catch: Shiny Squirtle (...)
  │                       └── [next target...]
  └── odd-egg.sav (testing save, Odd Egg in party)
```

## Building Blocks Already In Place

- **Save parsing**: Gen 1/2 parsers extract party, boxes, DVs, location, badges, daycare parents
- **Location detection**: Crystal map group:number → location name (388 maps, all interiors)
- **Daycare detection**: Parents, DVs, shiny status, offspring species, odds calculation
- **Save discovery**: Scans checkpoint/, catches/, library/, hunts/open_* directories
- **Save preview**: Shows OT, badges, party, boxes, location in the Play page accordion
- **Guide integration**: "You are here" marker from save location
- **Session resolver**: Handles save-back/save-copy/discard after emulator closes

## What Needs Building

### 1. Save Provenance Tracking
- Store parent-child relationships between saves
- Auto-detect lineage when a save is created from a hunt catch
- Allow manual linking ("this save branched from that one")
- Schema: `save_lineage(save_hash, parent_hash, created_at, source, notes)`

### 2. Timeline Visualization
- Tree/graph view showing save relationships
- Each node shows: game, label, location, badge count, party preview, daycare status
- Branch points clearly visible (hunt starts, catches, daycare swaps)
- Interactive: click node to expand details, right-click for actions

### 3. Actions From Timeline
- "Continue from here" → launch in emulator
- "Start hunt from here" → pre-fill hunt form with this save
- "Compare saves" → diff two saves (what changed between them)
- "Set as main" → mark a save as the primary playthrough branch

### 4. Hunt Integration
- When starting an egg hunt, pick save from timeline instead of file picker
- After catch → automatically create a new node in the tree
- After swapping daycare and saving → new branch point detected

### 5. Smart Save Naming
- Auto-generate meaningful names: "Crystal - 6 badges - Goldenrod - Charmander breeding"
- Include daycare context for breeding saves
- Include catch info for hunt results

## UX Reference

- Git graph visualizations (VS Code git graph, GitHub network view)
- The existing Guide map with its location markers and progression
- MapGenie/pkmnmap.com for interactive node-based UIs

## Technical Notes

- Save hash (md5 of file content) for identity — already used in save discovery
- Lineage detection: when session resolver creates a catch save, record the source save as parent
- The Play page's SavePreview component already renders most of the node detail
- Could use a lightweight tree layout library (d3-hierarchy, react-flow) or custom SVG
