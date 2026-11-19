// Link text helpers for renaming pasted attachments. No Obsidian imports, so they can be tested with
// `npm test` (Node's built-in test runner).

export interface Replacement { from: number; to: number; insert: string }

/** Names appear raw in wikilinks and URL-encoded in Markdown links. */
function nameForms(oldName: string, newName: string): [string, string][] {
	const forms: [string, string][] = [[oldName, newName]];
	if (encodeURI(oldName) !== oldName) forms.push([encodeURI(oldName), encodeURI(newName)]);
	return forms;
}

/**
 * Spans of `text` that are link targets: the path of a wikilink (`[[path#heading|alias]]`, embeds too)
 * or the destination of a Markdown link (`[text](path#heading "title")`, `[text](<path with spaces>)`),
 * without the heading / block part. Alias and display text are never targets.
 */
const LINK = /\[\[([^[\]|#^\n]*)[^\]\n]*\]\]|\[(?:[^[\]\n]|\[[^[\]\n]*\])*\]\((?:<([^<>\n]*)>|([^()\s]*))[^()\n]*\)/g;

export function linkTargets(text: string): [number, number][] {
	const out: [number, number][] = [];
	for (const m of text.matchAll(LINK)) {
		const at = m.index ?? 0;
		if (m[1] !== undefined) {
			out.push([at + 2, at + 2 + m[1].length]);
			continue;
		}
		// Neither the destination nor the title can hold "(", so the last "](" opens the destination.
		const target = m[2] ?? m[3] ?? "";
		const start = at + m[0].lastIndexOf("](") + 2 + (m[2] !== undefined ? 1 : 0);
		const hash = target.indexOf("#");
		out.push([start, start + (hash >= 0 ? hash : target.length)]);
	}
	return out;
}

/**
 * Where `name` is a whole link target: the target is the name itself or a path ending in `/name`.
 * Not part of a longer name ("1.png" in "image-1.png"), not alt or display text ("![1.png](other.png)").
 */
export function linkOccurrences(text: string, name: string): number[] {
	const out: number[] = [];
	for (const [start, end] of linkTargets(text)) {
		const at = end - name.length;
		if (at >= start && text.slice(at, end) === name && (at === start || text[at - 1] === "/")) out.push(at);
	}
	return out;
}

export function mentions(text: string, name: string): boolean {
	return nameForms(name, name).some(([from]) => linkOccurrences(text, from).length > 0);
}

export function replacements(text: string, oldName: string, newName: string): Replacement[] {
	const out: Replacement[] = [];
	for (const [from, to] of nameForms(oldName, newName)) {
		for (const i of linkOccurrences(text, from)) out.push({ from: i, to: i + from.length, insert: to });
	}
	return out.sort((a, b) => a.from - b.from);
}

export function applyReplacements(text: string, changes: Replacement[]): string {
	let result = "";
	let pos = 0;
	for (const c of changes) {
		result += text.slice(pos, c.from) + c.insert;
		pos = c.to;
	}
	return result + text.slice(pos);
}
