// Zones on a live canvas: glue between Obsidian's canvas objects and the pure zone engine.
// A zone is a group; see zone-engine.ts for the rules.
import { App, Modal, Setting, SuggestModal, prepareFuzzySearch } from "obsidian";
import type { Canvas, CanvasEdge, CanvasNode } from "./canvas";
import { t } from "./i18n";
import { hooks, isGroup, parentOf } from "./tree";
import {
	type CanvasData as ZoneData,
	type CanvasNode as ZoneNode,
	type Layout,
	addMapZone,
	addZone,
	arrangeZoneMaps,
	balanceZoneMaps,
	moveMapZone,
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
		if (from && to && isGroup(from) && isGroup(to)) {
			edges.push({ id: e.id, fromNode: from.id, toNode: to.id, fromSide: e.from.side, toSide: e.to.side });
		}
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

/** Which zone each node was in last time, per canvas: a zone dropped over another doesn't take its nodes. */
const stays = new WeakMap<Canvas, Map<string, string>>();

/** Wraps every zone around its contents and pushes overlaps apart. Returns whether anything moved. */
export function tidy(canvas: Canvas, pinned: string[]): boolean {
	const data = snapshot(canvas);
	if (!data.nodes.some((n) => n.type === "group")) return false;
	const layout = zoneLayout(canvas);
	for (let pass = 0, last = ""; pass < 5; pass++) {
		stays.set(canvas, tidyZones(data, layout, pinned, stays.get(canvas)));
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
	stays.set(canvas, arrangeZoneMaps(data, zoneLayout(canvas), stays.get(canvas)));
	return apply(canvas, data);
}

/**
 * Makes the live arrows between zones match `data`: same order, same sides. The order of the
 * arrows is the order of the zones in a map, so when it changes they are taken out and put back.
 */
function syncMapEdges(canvas: Canvas, data: ZoneData): void {
	const groups = new Set(data.nodes.filter((n) => n.type === "group").map((n) => n.id));
	const wanted = data.edges.filter((e) => groups.has(e.fromNode) && groups.has(e.toNode));
	const live = [...canvas.edges.values()].filter((e) => e.from?.node && e.to?.node && isGroup(e.from.node) && isGroup(e.to.node));
	const key = (id: string, side: unknown) => `${id}:${String(side)}`;
	if (live.map((e) => key(e.id, e.from.side)).join() === wanted.map((e) => key(e.id, e.fromSide)).join()) return;
	if (!canvas.removeEdge) return;
	const byId = new Map<string, CanvasEdge>(live.map((e) => [e.id, e]));
	const edges = wanted.map((e) => {
		const old = byId.get(e.id)?.getData();
		return { ...(old ?? { id: e.id, fromNode: e.fromNode, toNode: e.toNode }), fromSide: e.fromSide, toSide: e.toSide };
	});
	for (const e of live) canvas.removeEdge(e);
	canvas.importData({ nodes: [], edges });
}

/** Moves a zone up / down beside its siblings, round the root at the ends. Returns whether it moved. */
export function moveZoneInMap(canvas: Canvas, zone: CanvasNode, where: "up" | "down", balanceFrom: number): boolean {
	const next = moveMapZone(snapshot(canvas), zone.id, where, zoneLayout(canvas), { balanceFrom });
	if (!next) return false;
	syncMapEdges(canvas, next);
	apply(canvas, next);
	return true;
}

/**
 * Adds an empty zone to the zone map of `from`, joined to it by an arrow: its child (beside it) or
 * its sibling (below it). The map is laid out again. Returns the new zone, or null.
 */
export function addZoneInMap(canvas: Canvas, from: CanvasNode, kind: "child" | "sibling", balanceFrom: number, color?: string): CanvasNode | null {
	const result = addMapZone(snapshot(canvas), from.id, kind, zoneLayout(canvas), { color, balanceFrom });
	if (!result) return null;
	canvas.importData({ nodes: [result.zone], edges: [] });
	syncMapEdges(canvas, result.data);
	apply(canvas, result.data);
	return canvas.nodes.get(result.zone.id) ?? null;
}

/** Balances every zone map whose first zone has enough children, as Tidy does for mind maps. Returns whether anything changed. */
export function balanceMaps(canvas: Canvas, balanceFrom: number): boolean {
	const data = snapshot(canvas);
	if (!data.edges.some((e) => data.nodes.find((n) => n.id === e.fromNode)?.type === "group")) return false;
	balanceZoneMaps(data, zoneLayout(canvas), { balanceFrom });
	syncMapEdges(canvas, data);
	return apply(canvas, data);
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
	// The moved nodes belong to that zone now, whatever it overlaps until it is tidied.
	const stay = stays.get(canvas) ?? new Map<string, string>();
	for (const id of ids) stay.set(id, zoneId);
	stays.set(canvas, stay);
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
