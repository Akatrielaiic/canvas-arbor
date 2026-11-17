import { describe, expect, it } from "vitest";
import { type CanvasData, type CanvasNode, type Layout, addMapZone, arrangeZoneMaps, linkZonesTo, mapGaps, tidyZones, zoneParents } from "../src/zone-engine";

const layout: Layout = { cardWidth: 400, cardHeight: 400, gap: 40, columns: 2 };
const { across, along } = mapGaps(layout);
const at = (data: CanvasData, id: string) => data.nodes.find((n) => n.id === id)!;
const overlap = (a: CanvasNode, b: CanvasNode) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const zone = (id: string, x: number, y: number, width = 920, height = 480): CanvasNode => ({ id, type: "group", label: id, x, y, width, height });
const card = (id: string, x: number, y: number): CanvasNode => ({ id, type: "file", file: `${id}.md`, x, y, width: 400, height: 400 });
const arrow = (from: string, to: string) => ({ id: `${from}>${to}`, fromNode: from, toNode: to });
const ids = (() => {
	let i = 0;
	return () => `n${++i}`;
})();
const tidy = (data: CanvasData) => {
	for (let pass = 0, last = ""; pass < 5; pass++) {
		tidyZones(data, layout);
		const now = JSON.stringify(data.nodes);
		if (now === last) break;
		last = now;
	}
};
const stable = (data: CanvasData) => {
	const before = JSON.stringify(data);
	tidyZones(data, layout);
	expect(JSON.stringify(data)).toBe(before);
};
const noOverlaps = (data: CanvasData) => {
	const groups = data.nodes.filter((n) => n.type === "group");
	for (const a of groups) for (const b of groups) if (a !== b) expect(overlap(a, b), `${a.id} / ${b.id}`).toBe(false);
};

describe("zone maps", () => {
	it("reads the tree from arrows between top-level zones, ignoring loops", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 2000, 0), zone("b", 4000, 0), card("c", 40, 40)],
			edges: [arrow("root", "a"), arrow("a", "b"), arrow("b", "root"), arrow("c", "a")],
		};
		expect([...zoneParents(data)]).toEqual([
			["a", "root"],
			["b", "a"],
		]);
	});

	it("puts children beside the root, stacked and centred, keeping their side and order", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("r1", 3000, -900), zone("r2", 1500, 2000), zone("l1", -3000, 500)],
			edges: [arrow("root", "r1"), arrow("root", "r2"), arrow("root", "l1")],
		};
		arrangeZoneMaps(data, layout);
		const root = at(data, "root");
		const [r1, r2, l1] = ["r1", "r2", "l1"].map((id) => at(data, id));
		expect(root.x).toBe(0);
		expect(root.y).toBe(0);
		expect(r1.x).toBe(root.x + root.width + across);
		expect(r2.x).toBe(r1.x);
		expect(r2.y).toBe(r1.y + r1.height + along);
		expect((r1.y + r2.y + r2.height) / 2).toBe(root.y + root.height / 2);
		expect(l1.x + l1.width).toBe(root.x - across);
		expect(l1.y + l1.height / 2).toBe(root.y + root.height / 2);
	});

	it("takes each zone's cards along", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 5000, 5000), card("c", 5040, 5040)],
			edges: [arrow("root", "a")],
		};
		arrangeZoneMaps(data, layout);
		const a = at(data, "a");
		expect(at(data, "c").x - a.x).toBe(40);
		expect(at(data, "c").y - a.y).toBe(40);
	});

	it("respaces the map when a zone grows, and stays put the second time", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 1500, 0), zone("b", 1500, 700), card("c1", 1540, 40)],
			edges: [arrow("root", "a"), arrow("root", "b")],
		};
		tidy(data);
		stable(data);
		noOverlaps(data);
		// "a" gets more cards: it grows, and "b" moves down to keep the gap.
		const a = at(data, "a");
		data.nodes.push(card("c2", a.x + 40, a.y + 480), card("c3", a.x + 40, a.y + 920));
		tidy(data);
		stable(data);
		noOverlaps(data);
		expect(at(data, "b").y).toBe(at(data, "a").y + at(data, "a").height + along);
	});

	it("moves a whole map out of the way of other zones, without bending it", () => {
		const data: CanvasData = {
			nodes: [zone("other", 1400, 300, 600, 600), zone("root", 0, 0), zone("a", 1500, 0)],
			edges: [arrow("root", "a")],
		};
		tidy(data);
		stable(data);
		noOverlaps(data);
		expect(at(data, "a").x - at(data, "root").x).toBe(at(data, "root").width + across);
	});

	it("adds a child on the lighter side of the root, then siblings below it", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0), zone("r1", 2000, 0)], edges: [arrow("root", "r1")] };
		data = addMapZone(data, "root", "child", layout, { newId: ids })!.data;
		const added = data.nodes[0];
		expect(added.x + added.width).toBe(at(data, "root").x - across);
		const sib = addMapZone(data, added.id, "sibling", layout, { newId: ids, label: "Next" })!;
		data = sib.data;
		expect(sib.zone.label).toBe("Next");
		expect(at(data, sib.zone.id).x).toBe(at(data, added.id).x);
		expect(at(data, sib.zone.id).y).toBeGreaterThan(at(data, added.id).y);
		expect(zoneParents(data).get(sib.zone.id)).toBe("root");
		tidy(data);
		stable(data);
		noOverlaps(data);
	});

	it("puts a sibling between its zone and the next one", () => {
		let data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 2000, -600), zone("b", 2000, 600)],
			edges: [arrow("root", "a"), arrow("root", "b")],
		};
		data = addMapZone(data, "a", "sibling", layout, { newId: () => "mid" })!.data;
		arrangeZoneMaps(data, layout);
		const ys = ["a", "mid", "b"].map((id) => at(data, id).y);
		expect([...ys].sort((p, q) => p - q)).toEqual(ys);
	});

	it("keeps a grandchild on its parent's side", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0), zone("l", -2000, 0)], edges: [arrow("root", "l")] };
		data = addMapZone(data, "l", "child", layout, { newId: () => "g" })!.data;
		expect(at(data, "g").x + at(data, "g").width).toBe(at(data, "l").x - across);
	});

	it("links loose zones and other maps' roots to a root, once", () => {
		const data: CanvasData = {
			nodes: [zone("inbox", 0, 0), zone("a", 3000, 0), zone("b", -3000, 0), zone("b1", -5000, 0), zone("inner", 3040, 40, 100, 100)],
			edges: [arrow("b", "b1")],
		};
		const linked = linkZonesTo(data, "inbox", { newId: ids })!;
		expect(zoneParents(linked).get("a")).toBe("inbox");
		expect(zoneParents(linked).get("b")).toBe("inbox");
		expect(zoneParents(linked).get("b1")).toBe("b");
		expect(zoneParents(linked).has("inner")).toBe(false);
		expect(linkZonesTo(linked, "inbox")).toBeNull();
	});

	it("leaves canvases without zone arrows exactly as before", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), zone("b", 3000, 0), card("c", 40, 40)], edges: [arrow("c", "b")] };
		const before = JSON.stringify(data);
		arrangeZoneMaps(data, layout);
		expect(JSON.stringify(data)).toBe(before);
	});
});
