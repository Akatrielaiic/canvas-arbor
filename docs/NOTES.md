# Implementation notes

Things that are not obvious from the code, kept from the original notes of the plugin this one was forked from.

- **Canvas has no public API.** The internal methods used (`createTextNode`, `importData`, `menu.render`, `moveAndResize`…) were checked against Obsidian's own `app.js`. `src/canvas.ts` lists the shapes relied on.
- **Keys while typing go through CodeMirror.** A node's editor lives in an iframe, so a `keydown` listener on the window never sees its keys: those are handled by an editor extension (`registerEditorExtension`). Keys on a selected node that is not being edited use a capturing listener on the window. Enter is never taken while an input method is composing (`isComposing`).
- **A new node needs `attach()` and `render()` before `startEditing()`**, or it has no editor yet and the call does nothing.
- **Cmd/Ctrl+F is registered on the canvas view's own scope.** The key belongs to "Search current file", whose hotkey fires before a plugin's listener would.
- **Why the default horizontal gap is 160.** Canvas edges are Bézier curves whose control points reach out half the distance between the ends, clamped to 70–150 px. With less room than that the curve loops back on itself, and many siblings look knotted.
