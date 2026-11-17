# Canvas Arbor: notes for Claude

Obsidian plugin by `Akatrielaiic`: mind maps on Canvas from the keyboard. Forked from Canvas Quick Mindmap by RainaJIA716 (MIT, credited in the README). Sister plugin: [Canvas Pensum](https://github.com/Akatrielaiic/canvas-pensum) (a task desk on Canvas). Clone both side by side (`../canvas-pensum`); several things below depend on it.

Read `README.md` (what it does), `CHANGELOG.md` and `docs/NOTES.md` (why some things are done the odd way) before changing behaviour.

## Working on this project

- Code, UI text, README and commits are in English. The interface is English only (the Chinese translation inherited from the fork was removed in 0.5.0; don't add translations back).
- Releases are how changes reach the maintainer: he installs through **BRAT** and tests each release in a real vault (Obsidian 1.15 on macOS, also iOS). Nothing is tried until it is released.
- **You cannot run Obsidian.** Anything touching the UI or canvas internals is untested until the maintainer tries it: say so plainly, and say what was verified (lint, tests, build, reading Obsidian's bundle).
- Decision already taken, don't reopen unprompted (0.7.0, reversing the earlier "Enter adds a node"): Enter and Tab keep their usual job while typing; **Shift+Tab adds a child, Shift+Enter a sibling**, while typing and on a selected node; Enter on a selected node (or arrow) edits it. Shift+Tab no longer selects the parent (Esc and Shift+arrow do that). The setting `shiftEnterAddsChild` swaps the two new-node keys.
- One word for the things on a canvas here: **node** (Canvas Pensum says "card").

## Commands

```bash
npm ci
npm run lint          # eslint with eslint-plugin-obsidianmd; must stay clean
npm test              # vitest
npm run build         # tsc --noEmit + esbuild -> main.js
npm run check:shared  # shared files still match Canvas Pensum's copies
```

Some `obsidianmd` lint rules cannot be disabled with a comment (`no-default-hotkeys` is one): fix the code instead.

## Releasing

1. Bump the version in `manifest.json` and `package.json`, add it to `versions.json`, run `npm install --package-lock-only`.
2. Add a `CHANGELOG.md` entry (user-facing, like the existing ones). Lint, test, build.
3. Commit, `git tag X.Y.Z` (no `v`), `git push origin main X.Y.Z`.
4. `release.yml` checks the tag matches the manifest, builds, and attaches `main.js`, `manifest.json`, `styles.css`. Check it: `gh run watch`, `gh release view X.Y.Z`.

## Architecture

| File | Role |
|---|---|
| `src/main.ts` | Almost everything that touches Obsidian: keys, adding nodes, layout, tidy, folds, search wiring, zones wiring. Large; find things by method name. |
| `src/layout.ts`, `src/tree.ts`, `src/geometry.ts` | Tree reading and layout maths. Unit-tested. |
| `src/zone-engine.ts` | Pure. Zones: place, move, keep groups wrapped around contents without overlaps. **Shared verbatim with Canvas Pensum.** |
| `src/zones.ts` | Glue between live canvas objects and the zone engine; zone picker and prompt. |
| `src/help.ts` | Adds rows to the canvas help modal. **Shared verbatim with Canvas Pensum.** |
| `src/search.ts`, `src/outline.ts`, `src/text.ts` | Canvas search, Markdown lists in/out, link renaming. |
| `src/i18n.ts` | All UI strings (English). |
| `src/settings.ts` | Settings, declared once as sections and rendered both declaratively (1.13+) and with `display()` (older). |
| `src/canvas.ts` | The shapes of Canvas internals relied on. |

**Shared files.** `src/zone-engine.ts`, `src/help.ts`, `scripts/check-shared.mjs` exist identically in both repos. Change both copies together and run `npm run check:shared`.

## Things that are easy to get wrong

- **Canvas internals are undocumented.** To see how Obsidian really behaves, read its bundle: `~/Library/Application Support/obsidian/obsidian-<version>.asar` is readable as text; search it with Python/regex.
- **Keys.** No default hotkeys. Canvas keys (`Cmd/Ctrl+F`, Shift+arrows, `Cmd/Ctrl+Shift+M`) are registered on each canvas view's `scope` in `claimKeys`, and re-claimed when settings are saved. A scope runs only the **first** handler registered for a key; Obsidian runs only the **first** command bound to a hotkey even if its `checkCallback` fails. Canvas Pensum registers `M` too, so each plugin exposes `zoneCommand(checking)` / `zoneKey()` and hands over to the other.
- **Division with Canvas Pensum.** If Pensum is enabled and the canvas is its Pensatorium (`pensumOwns`), Arbor adds no zone menu items and does not tidy zones there.
- **Zones.** A zone is a group. For the engine, "children" are Arbor's *branches* only (`parentOf`), not links between maps. Hidden nodes of collapsed branches are left out of the snapshot and follow through `syncFolds`. *Responsive zones* is **off by default** because it reshapes the groups of every canvas the user edits.
- **Zone tidying must be idempotent**: it runs after every layout and after every canvas save, and a tidy that keeps changing things would save forever.
- **Zone maps** (0.8.0). Arrows between top-level groups make a tree (`zoneParents` in the engine: oldest arrow wins, loops ignored), laid out around its root by `arrange` in `zone-engine.ts`. **The arrows hold the shape**: a root child's side is its arrow's `fromSide`, siblings come in the order of their arrows in the file; positions never decide, so a dragged zone goes back. Placement and balancing follow the node rules too (`join`, `balanceRoot` in the engine, with the `balanceFrom` setting): a root's new child goes to the side with less reach; from `balanceFrom` children on, the ring is re-split evenly on every add, on Alt moves (swap with the ring neighbour) and on Tidy (`zones.balanceMaps`). Same rules as node maps: the root's children clockwise (right top to bottom, then left bottom to top: on the left the first arrow is the bottom zone), deeper levels top to bottom. Alt+Up/Down (`moveMapZone` for zones, `stepRound` for nodes) move one step and, for the root's children, cross to the other side at the ends (balanced node maps: swap with the ring neighbour, since `balance` re-splits the sides); live, `syncMapEdges` removes and re-imports the zone arrows to reorder them. Map zones are never nested (`enclosing`), and `tidyZones` / `arrangeZoneMaps` take and return `stay` (node id -> zone id) so a zone dropped over another doesn't take its nodes (`stays` in zones.ts). `snapshot` keeps group-to-group arrows, with sides. `runZones` now runs on every canvas save even with *Responsive zones* off: then only `arrangeZoneMaps` runs (nothing wrapped or pushed). Shift+Tab / Shift+Enter on a selected group add a zone (`addZoneInMap`); on the Pensatorium they are left to Pensum.
- **Tidy** (the toolbar button) only pushes trees and loose nodes that share a group, so nothing leaves its zone.

## State and ideas

Not yet done: try *Responsive zones* and Tidy-with-groups on real canvases; verify on iPad; record the GIFs listed in `docs/media/README.md` and uncomment their lines in the README; submit to the community directory (via community.obsidian.md with the maintainer's Obsidian account; he does this himself).
