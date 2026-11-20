# Canvas Arbor

Mind maps on Obsidian Canvas, from the keyboard: Shift+Tab and Shift+Enter add
nodes, Shift+arrow moves between nodes and the arrows that join them, Enter
writes on either. Branches collapse, and the map lays itself out in one of
three structures (right, both sides, downward), balanced, compact and with room
for the arrows' labels. Hand-drawn arrows are kept as links and routed around
nodes, and maps go to and from Markdown lists.

Based on
[Canvas Quick Mindmap](https://github.com/RainaJIA716/obsidian-canvas-quick-mindmap)
by RainaJIA716.

Obsidian Canvas is a great place to think, but building a mind map in it is slow:
create a node, drag it into place, drag an edge from one node to the other, resize,
repeat. Canvas Arbor turns that into typing. Press **Shift+Tab** and the next
idea appears to the right, already connected and ready for text. Press **Shift+Enter** and
it appears below, on the same level. Enter and Tab keep their usual job in the text. The canvas stays a normal `.canvas` file —
nothing new to learn, nothing locked in.

<!-- GIF (uncomment when recorded): ![Typing a map: Shift+Tab and Shift+Enter add connected nodes](docs/media/type-your-map.gif) -->

## Features

- **Type your map.** While editing a node, **Shift+Tab** adds a child node (to
  the right, as Tab indents) and **Shift+Enter** a sibling (below, as Enter starts
  a new line). Enter and Tab work as usual: line break, list indent. The new
  node is connected, placed and opened for typing.
- **Keyboard on a selected node.** **Enter** edits it (cursor at the end);
  **Shift+Tab** and **Shift+Enter** add a child or a sibling, as while typing.
  **Esc** stops typing and leaves the node selected.
- **Move around with Shift+arrow.** With a node selected, **Shift+arrow** goes
  to its parent, its nearest child, or the previous / next node on the same
  level. **Alt+Up / Alt+Down** move the node before or after its sibling; a branch
  of the central node goes round it clockwise, past the top or bottom of its
  side to the same end of the other side, as zones do. Plain arrows
  still nudge the node, as Canvas does.
- **Write on arrows from the keyboard.** On the way to a parent or child,
  Shift+arrow stops on the arrow that joins the two nodes. **Enter** opens its
  label, **Esc** leaves it with the arrow still selected. The map makes room
  for the label: the children move away until it fits between the nodes.
- **Collapse branches.** The chevron button on a selected node hides everything
  below it; a badge shows how many nodes are hidden, click it to open the branch
  again. The map closes the gap. Hidden nodes stay in the `.canvas` file.
- **+ buttons on the node.** Select a node and two round **+** buttons appear: right
  for a child, below for a sibling. They work on phones and tablets too.
- **Automatic layout, three structures.** Each map grows to the right, on both
  sides of its central node (like MindNode), or downward like an org chart.
  The structure is read from the map itself: branches left of the central node
  mean both sides, arrows leaving it from below mean downward. Branches fit
  into each other's free space, so nothing overlaps and little space is wasted.
- **Balanced maps.** From 5 branches on the central node (adjustable), the map
  keeps them even on both sides, whenever you add a branch to the central node
  and when you tidy. Branches run clockwise, as in MindNode: down the right
  side, then up the left one, so the newest branch sits top left and the
  others keep their order. With an odd count the right side gets the extra one.
  Commands: *Balance map on both sides*, *Map grows to the right*, *Map grows
  downward* (selected map, or every map when nothing is selected).
- **Tidy button.** One click in the canvas toolbar re-lays out every tree on the
  canvas, points branch arrows the way their branch grows, pulls overlapping
  trees apart and moves loose nodes out of the way. With a node selected, only
  its mind map is laid out again and nothing else moves. One undo restores everything.
- **Nodes fit their text.** Mind map nodes grow and shrink as you type; long text
  wraps at a maximum width instead of making a huge node. Notes, images, code
  blocks, tables and headings keep their size.
- **Search the canvas.** **Cmd/Ctrl+F** (or the magnifier in the toolbar) opens a
  find bar. It searches node text, group labels, links, file names and the
  content of embedded notes. Matches are highlighted, the rest dimmed;
  **Enter / Shift+Enter** jump between them, **Esc** closes and leaves the
  result selected so Enter edits it.
- **Branch colours.** A new node takes the colour of the node it was added
  from, so a coloured branch stays coloured as it grows.
- **Markdown lists in and out.** *Copy map as Markdown list* puts the selected
  branch (or every map) on the clipboard as a nested list; *Paste Markdown list
  as map* turns a nested list, with or without headings, into branches of the
  selected node, or into new maps when nothing is selected.
- **Copy image nodes.** Select an image and click the copy button in its corner
  to put the full-size picture on the clipboard (WebP, GIF, SVG and others are
  converted to PNG).
- **Pasted images get real names.** Images pasted or dropped into a canvas are
  renamed after the canvas (`Plan.png`, `Plan-1.png`…), the way Paste Image
  Rename does it for notes — including links inside text nodes.
- **Zones.** A zone is a named group. *New zone* adds an empty one, with a name
  and a colour. *Move to zone…* in a node's menu (or the command, **Cmd/Ctrl+Shift+M**)
  sends the selected nodes there, with their branches, keeping the map's shape;
  type a name that doesn't exist and press Enter to create that zone on the spot.
  Tidy keeps every tree and loose node inside its zone.
  A node changes zone only when you move it there: drag it in or out, or use
  *Move to zone…*; its branches go with it. A layout, a zone that grows, or a new zone never takes nodes
  that aren't its own: nodes in no zone are pushed out of the way, and a new node
  belongs to its parent's zone.
- **Zone maps.** Join zones with arrows and they become a map, laid out like a
  mind map around the first one, exactly as nodes are: its children clockwise
  round it (on the right from top to bottom, on the left from bottom to top),
  deeper zones top to bottom, evenly spaced. New zones are placed and balanced
  as new nodes are: on the side that takes less room, and from *Balance on both
  sides from this many branches* on, the sides are evened out whenever a zone is
  added and when you tidy. When a zone grows or shrinks, the map is
  laid out again; a zone dragged out of place goes back. With a zone selected,
  **Shift+Tab** adds a zone beside it and **Shift+Enter** one below it, joined
  by an arrow, with its name ready for typing; **Enter** renames the zone;
  **Alt+Up / Alt+Down** move it one step, and past the top or bottom of its
  column round to the other side of the first zone. Nodes stay in their zone
  even if another zone is dropped over it. Only zones joined by arrows move
  (and the nodes in no zone they would cover); works with or without
  *Responsive zones*.
- **Responsive zones** (setting, off by default). Every group wraps its nodes and
  the branches below them, growing and shrinking as the map changes; nodes and
  groups that would overlap are pushed apart, to the right or down, and the
  selected node stays where it is.
- **Keys in the canvas help.** The canvas help (the **?** among the canvas
  controls) lists Canvas Arbor's keys below Canvas's own, with the ones you
  have changed.

<!-- GIF (uncomment when recorded): ![Shift+arrow moves between nodes, Alt+arrow reorders siblings](docs/media/move-and-reorder.gif) -->
<!-- GIF (uncomment when recorded): ![One click on Tidy lays a messy canvas out](docs/media/tidy.gif) -->
<!-- GIF (uncomment when recorded): ![Collapsing a branch hides it and the map closes the gap](docs/media/collapse.gif) -->
<!-- GIF (uncomment when recorded): ![A pasted Markdown list becomes a map](docs/media/list-to-map.gif) -->

## Keys

| Key | While typing in a node | Node selected | Arrow selected |
|---|---|---|---|
| Shift+Tab | New child node | New child node | — |
| Shift+Enter | New sibling node | New sibling node | — |
| Enter | Line break | Edit the node | Write the label |
| Tab | Indent (as usual) | — | — |
| Shift+arrow | Select text | Go to the parent, child or neighbouring node, stopping on the arrow in between | Go to the node at either end, or to the next branch's arrow |
| Alt+Up / Alt+Down | — | Move the node before / after its sibling (round the central node at the ends) | — |
| Shift+Tab / Shift+Enter, zone selected | — | New zone beside / below it, in the same zone map | — |
| Enter, zone selected | — | Rename the zone | — |
| Alt+Up / Alt+Down, zone selected | — | Move the zone one step, round the first zone at the ends | — |
| Esc | Stop typing, node stays selected | — | Stop writing the label, arrow stays selected |
| Cmd/Ctrl+F | Search the canvas | Search the canvas | Search the canvas |

With **Shift+Enter adds a child, Shift+Tab a sibling** turned on, the two
new-node keys swap roles.

In a downward map the reordering keys are Alt+Left / Alt+Right. Collapsing has
no key of its own: give *Collapse or expand branch* a hotkey if you want one.

Shift+Enter is never taken while an input method (Chinese, Japanese…) is still
choosing characters.

## Use cases

- Brainstorm on a canvas without touching the mouse: type, Shift+Tab, type, Shift+Enter.
- Turn a messy canvas into a clean tree with one click.
- Find the node you wrote last week on a big canvas.
- Paste screenshots into a canvas and get sensible file names.

## Settings

- **Auto layout** — rearrange the tree after each new node (off: keep your
  manual positions and place new nodes in the nearest free spot).
- **Shift+Enter adds a child, Shift+Tab a sibling** — swap the two new-node keys.
- **Shift+arrow moves between nodes** — off leaves Shift+arrow to Canvas.
- **Shift+arrow stops on arrows** — off goes straight from node to node.
- **Compact layout** — branches use each other's free space (off: each branch
  takes a full-height band).
- **Animate moves** — nodes and zones glide to their new place (about 0.2 s)
  when the map is laid out, tidied or rearranged, instead of jumping; arrows
  follow them. Off when your system asks for reduced motion, and on Canvas
  Pensum's Pensatorium.
- **Balance on both sides from this many branches** — from this count on, the
  central node's branches are kept even on both sides (0: never).
- **Extra arrows are links** — a node with several incoming arrows keeps one
  as its branch (right-to-left first, then the one from a node on its left,
  then the oldest). The others, and arrows pointing back to the left, are links:
  layout and tidy don't move nodes for them or change their sides, and two maps
  joined by a link stay two maps. Off: every arrow is a branch, as before.
- **Route links around nodes** — after layout and tidy, links are reattached to
  the sides that keep them short and off other nodes.
- **Horizontal / vertical gap** — spacing of the tree. Below 160 px horizontal,
  Obsidian's curved edges start to loop back.
- **New nodes take the branch's colour**.
- **Fit nodes to their text** and **maximum node width**.
- **Rename attachments pasted into a canvas**.
- **Cmd/Ctrl+Shift+M moves to a zone** — the key for *Move to zone…*. It lives
  on the canvas, like Cmd/Ctrl+F: outside a canvas the key is free.
- **Responsive zones** — groups wrap their contents and overlaps are pushed
  apart. Off by default, because it reshapes the groups of every canvas you
  edit: turn it on if you use groups as zones.

## Notes

- Works on the canvas Obsidian already has; it uses Canvas's internal API, which
  is not officially documented, and is tested on Obsidian 1.15.
- Only nodes that are part of a mind map (have an edge) resize while you type,
  so ordinary nodes on a canvas are left alone.
- Zones work the same way in [Canvas Pensum](https://github.com/Akatrielaiic/canvas-pensum),
  a task desk on Canvas. With both plugins on, Pensum looks after its own
  canvas (the Pensatorium) and Canvas Arbor after every other one.
- Collapsed branches are remembered in the plugin's data, per canvas file. If
  that data is lost (or the plugin is off) the branches are simply all open.
- Renaming only touches files that the open canvas actually uses within a few
  seconds of them appearing, so files created by sync or other plugins are left
  alone.

## Install

Canvas Arbor is not in the Community plugins directory. Install it with
[BRAT](https://github.com/TfTHacker/obsidian42-brat) (*Add beta plugin*, then
this repository), which also keeps it up to date, or copy `main.js`,
`manifest.json` and `styles.css` from the latest release into
`<vault>/.obsidian/plugins/canvas-arbor/`.

It has its own plugin id, so it can sit next to Canvas Quick Mindmap; enable
only one of the two.

## Support

If Canvas Arbor is useful to you, you can
[buy me a coffee](https://www.paypal.com/paypalme/nicotio). Thank you!

## Development

`npm ci`, then `npm run dev` (watch), `npm run build`, `npm test`, `npm run lint`.
`npm run check:shared` checks that the files shared verbatim with
[Canvas Pensum](https://github.com/Akatrielaiic/canvas-pensum)
(`src/zone-engine.ts`, `src/help.ts`) still match its copies.
The layout (`src/layout.ts`), tree reading (`src/tree.ts`), link renaming
(`src/text.ts`) and Markdown lists (`src/outline.ts`) have unit tests in `tests/`.

## Credits and license

Canvas Arbor started as a fork of
[Canvas Quick Mindmap](https://github.com/RainaJIA716/obsidian-canvas-quick-mindmap)
by RainaJIA716. MIT, see [LICENSE](LICENSE). Listed in the Community Plugins
directory with
[the original author's written permission](https://github.com/RainaJIA716/obsidian-canvas-quick-mindmap/pull/1#issuecomment-7002764816).
