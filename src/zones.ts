// Zones on a live canvas: glue between Obsidian's canvas objects and the pure zone engine.
// A zone is a group; see zone-engine.ts for the rules.
import { App, Modal, Setting, SuggestModal, prepareFuzzySearch } from "obsidian";
import type { Canvas, CanvasNode } from "./canvas";
import { t } from "./i18n";
import { hooks, isGroup, parentOf } from "./tree";
import {
	type CanvasData as ZoneData,
	type CanvasNode as ZoneNode,
	type Layout,
	addMapZone,
	addZone,
	arrangeZoneMaps,
	groupsBySize,
	moveToZone,
	tidyZones,
	zoneOf,
} from "./zone-engine";

/** Mind map nodes are small, so the grid follows the canvas's default text card. */
export function zoneLayout(canvas: Canvas): Layout {
	const size = canvas.config.defaultTextNodeDimensions;
	return { cardWidth: size.width, cardHeight: size.height, gap: 40, columns: 3 };
}

/**
 * The canvas as the engine sees it. Nodes hidden in a collapsed branch are left out (they follow
 * their branch on their own), and the only arrows are branches, parent to child: links between
 * maps don't make one map the child of another. Arrows between zones are kept: they make zone maps.
 */
export function snapshot(canvas: Canvas): ZoneData {
	const nodes: ZoneNode[] = [];
	const edges: ZoneData["edges"] = [];
	for (const n of canvas.nodes.values()) {
		if (hooks.hidden(n)) continue;
		const data = n.getData();
		const node: ZoneNode = { id: n.id, type: data.type, x: n.x, y: n.y, width: n.width, height: n.height };
		if (data.color) node.color = data.color;
		if (data.label) node.label = data.label;
		nodes.push(node);
		const parent = isGroup(n) ? null : parentOf(n);
		if (parent && !hooks.hidden(parent)) edges.push({ id: `${parent.id}>${n.id}`, fromNode: parent.id, toNode: n.id });
	}
	for (const e of canvas.edges.values()) {
		const from = e.from?.node;
		const to = e.to?.node;
		if (from && to && isGroup(from) && isGroup(to)) edges.push({ id: e.id, fromNode: from.id, toNode: to.id });
	}
	return { nodes, edges };
}

/** Moves and resizes the live nodes to match `data`. Returns whether anything changed. */
export function apply(canvas: Canvas, data: ZoneData): boolean {
	let changed = false;
	for (const n of data.nodes) {
		const live = canvas.nodes.get(n.id);
		if (!live) continue;
		const same = (a: number, b: number) => Math.abs(a - b) <= 0.5;
		if (same(live.x, n.x) && same(live.y, n.y) && same(live.width, n.width) && same(live.height, n.height)) continue;
		live.moveAndResize({ x: n.x, y: n.y, width: n.width, height: n.height });
		changed = true;
	}
	return changed;
}

/** Wraps every zone around its contents and pushes overlaps apart. Returns whether anything moved. */
export function tidy(canvas: Canvas, pinned: string[]): boolean {
	const data = snapshot(canvas);
	if (!data.nodes.some((n) => n.type === "group")) return false;
	const layout = zoneLayout(canvas);
	for (let pass = 0, last = ""; pass < 5; pass++) {
		tidyZones(data, layout, pinned);
		const now = JSON.stringify(data.nodes);
		if (now === last) break;
		last = now;
	}
	return apply(canvas, data);
}

/** Zone maps only (zones joined by arrows): laid out again, nothing else wrapped or pushed. Returns whether anything moved. */
export function arrangeMaps(canvas: Canvas): boolean {
	const data = snapshot(canvas);
	if (!data.edges.some((e) => data.nodes.find((n) => n.id === e.fromNode)?.type === "group")) return false;
	arrangeZoneMaps(data, zoneLayout(canvas));
	return apply(canvas, data);
}

/**
 * Adds an empty zone to the zone map of `from`, joined to it by an arrow: its child (beside it) or
 * its sibling (below it). The map is laid out again. Returns the new zone, or null.
 */
export function addZoneInMap(canvas: Canvas, from: CanvasNode, kind: "child" | "sibling", color?: string): CanvasNode | null {
	const result = addMapZone(snapshot(canvas), from.id, kind, zoneLayout(canvas), { color });
	if (!result) return null;
	const edge = result.data.edges[result.data.edges.length - 1];
	canvas.importData({ nodes: [result.zone], edges: [edge] });
	apply(canvas, result.data);
	return canvas.nodes.get(result.zone.id) ?? null;
}

/** Which zone each node sits in, by node id. */
export function zoneIds(canvas: Canvas): Map<string, string | undefined> {
	const data = snapshot(canvas);
	const groups = groupsBySize(data);
	return new Map(data.nodes.filter((n) => n.type !== "group").map((n) => [n.id, zoneOf(n, groups)?.id]));
}

/** Named groups, the ones cards can be sent to. */
export function namedZones(canvas: Canvas): { id: string; label: string }[] {
	const zones: { id: string; label: string }[] = [];
	for (const n of canvas.nodes.values()) {
		const label = isGroup(n) ? n.getData().label?.trim() : "";
		if (label) zones.push({ id: n.id, label });
	}
	return zones.sort((a, b) => a.label.localeCompare(b.label));
}

function importZone(canvas: Canvas, zone: ZoneNode): CanvasNode | undefined {
	canvas.importData({ nodes: [zone], edges: [] });
	return canvas.nodes.get(zone.id);
}

/** Adds an empty zone clear of everything else and brings it into view. */
export function createZone(canvas: Canvas, zone: { label: string; color?: string }): void {
	const created = addZone(snapshot(canvas), zone, zoneLayout(canvas)).zone;
	const live = importZone(canvas, created);
	if (live) canvas.zoomToBbox(live.getBBox());
	canvas.requestSave();
}

/**
 * Sends the cards (with their branches) to a zone, creating it first when `zone` is a name.
 * Returns whether anything moved.
 */
export function sendToZone(canvas: Canvas, ids: string[], zone: { id: string } | string): boolean {
	const layout = zoneLayout(canvas);
	let data = snapshot(canvas);
	let zoneId: string;
	if (typeof zone === "string") {
		const added = addZone(data, { label: zone }, layout);
		if (!importZone(canvas, added.zone)) return false;
		data = added.data;
		zoneId = added.zone.id;
	} else {
		zoneId = zone.id;
	}
	const moved = moveToZone(data, ids, zoneId, layout);
	return moved ? apply(canvas, moved) : false;
}

/** Pick an existing zone, or type a new name and press Enter to create it. A string means "create". */
export class ZonePicker extends SuggestModal<{ id: string; label: string } | string> {
	constructor(
		app: App,
		private zones: { id: string; label: string }[],
		private onPick: (zone: { id: string; label: string } | string) => void,
	) {
		super(app);
		const s = t();
		this.setPlaceholder(s.zonePlaceholder);
		this.emptyStateText = s.zoneEmpty;
	}

	getSuggestions(query: string): ({ id: string; label: string } | string)[] {
		const name = query.trim();
		if (!name) return this.zones;
		const search = prepareFuzzySearch(name);
		const matches = this.zones
			.map((zone) => ({ zone, score: search(zone.label)?.score }))
			.filter((m): m is { zone: { id: string; label: string }; score: number } => m.score !== undefined)
			.sort((a, b) => b.score - a.score)
			.map((m) => m.zone);
		const exists = this.zones.some((z) => z.label.toLowerCase() === name.toLowerCase());
		return exists ? matches : [...matches, name];
	}

	renderSuggestion(item: { id: string; label: string } | string, el: HTMLElement): void {
		el.setText(typeof item === "string" ? t().zoneCreate.replace("{name}", item) : item.label);
	}

	onChooseSuggestion(item: { id: string; label: string } | string): void {
		this.onPick(item);
	}
}

/** Asks for the name and colour of a new zone. Resolves to null when cancelled. */
export function promptZone(app: App): Promise<{ label: string; color?: string } | null> {
	return new Promise((resolve) => {
		const s = t();
		const modal = new Modal(app);
		let label = "";
		let color = "";
		let submitted = false;
		const submit = () => {
			submitted = true;
			modal.close();
		};
		modal.titleEl.setText(s.newZone);
		new Setting(modal.contentEl).setName(s.zoneName).addText((text) => {
			text.onChange((v) => (label = v));
			text.inputEl.addEventListener("keydown", (evt) => {
				if (evt.key === "Enter" && !evt.isComposing) submit();
			});
			window.setTimeout(() => text.inputEl.focus());
		});
		new Setting(modal.contentEl).setName(s.zoneColor).addDropdown((d) =>
			d
				.addOptions({ "": s.colorNone, "1": s.colorRed, "2": s.colorOrange, "3": s.colorYellow, "4": s.colorGreen, "5": s.colorCyan, "6": s.colorPurple })
				.onChange((v) => (color = v)),
		);
		new Setting(modal.contentEl).addButton((b) => b.setButtonText(s.zoneAdd).setCta().onClick(submit));
		modal.onClose = () => resolve(submitted && label.trim() ? { label: label.trim(), color: color || undefined } : null);
		modal.open();
	});
}
