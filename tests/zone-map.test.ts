import { describe, expect, it } from "vitest";
import { type CanvasData, type CanvasNode, type Layout, addMapZone, arrangeZoneMaps, balanceZoneMaps, linkZonesTo, mapGaps, moveMapZone, tidyZones, zoneParents } from "../src/zone-engine";

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

	it("adds a child on the lighter side of the root, then the next one clockwise", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0), zone("r1", 2000, 0)], edges: [arrow("root", "r1")] };
		data = addMapZone(data, "root", "child", layout, { newId: ids })!.data;
		const added = data.nodes[0];
		expect(added.x + added.width).toBe(at(data, "root").x - across);
		// On the left, clockwise is upwards: the sibling goes above.
		const sib = addMapZone(data, added.id, "sibling", layout, { newId: ids, label: "Next" })!;
		data = sib.data;
		expect(sib.zone.label).toBe("Next");
		expect(at(data, sib.zone.id).x).toBe(at(data, added.id).x);
		expect(at(data, sib.zone.id).y).toBeLessThan(at(data, added.id).y);
		expect(zoneParents(data).get(sib.zone.id)).toBe("root");
		// A new child of the root on the left goes on top too (last clockwise).
		data = addMapZone(data, "root", "child", layout, { newId: () => "r2" })!.data;
		expect(at(data, "r2").x).toBe(at(data, "r1").x);
		const unbalanced = { balanceFrom: 0 };
		data = addMapZone(data, "root", "child", layout, { newId: () => "r3", ...unbalanced })!.data;
		expect(at(data, "r3").y).toBeGreaterThan(at(data, "r2").y);
		data = addMapZone(data, "root", "child", layout, { newId: () => "l3", ...unbalanced })!.data;
		expect(at(data, "l3").x).toBe(at(data, added.id).x);
		expect(at(data, "l3").y).toBeLessThan(at(data, sib.zone.id).y);
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

	it("puts a dragged zone back in its place: order and side come from the arrows", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 0, 0), zone("b", 0, 0)],
			edges: [
				{ ...arrow("root", "a"), fromSide: "right", toSide: "left" },
				{ ...arrow("root", "b"), fromSide: "right", toSide: "left" },
			],
		};
		tidy(data);
		const placed = JSON.stringify(data.nodes);
		// Drag "b" above "a" and onto the other side: it goes back.
		at(data, "b").x = -3000;
		at(data, "b").y = -3000;
		tidy(data);
		expect(JSON.stringify(data.nodes)).toBe(placed);
	});

	it("doesn't let a zone dropped over another take its cards", () => {
		const data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 0, 0), zone("b", 0, 0), card("ca", 0, 0), card("cb", 0, 0)],
			edges: [arrow("root", "a"), arrow("root", "b")],
		};
		// Put one card in each zone, then lay out.
		at(data, "a").x = 3000;
		at(data, "b").x = 3000;
		at(data, "b").y = 3000;
		Object.assign(at(data, "ca"), { x: 3040, y: 40 });
		Object.assign(at(data, "cb"), { x: 3040, y: 3040 });
		let stay = tidyZones(data, layout);
		for (let i = 0; i < 4; i++) stay = tidyZones(data, layout, [], stay);
		expect(stay.get("ca")?.zone).toBe("a");
		expect(stay.get("cb")?.zone).toBe("b");
		// Drag "a" (with its card) exactly over "b": both cards sit in both zones.
		const a = at(data, "a");
		const b = at(data, "b");
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		for (const n of [a, at(data, "ca")]) {
			n.x += dx;
			n.y += dy;
		}
		for (let i = 0; i < 5; i++) stay = tidyZones(data, layout, [], stay);
		expect(stay.get("ca")?.zone).toBe("a");
		expect(stay.get("cb")?.zone).toBe("b");
		noOverlaps(data);
		expect(zoneParents(data).get("a")).toBe("root");
	});

	it("moves a zone up and down round the root, clockwise, crossing at the ends", () => {
		const r = { fromSide: "right", toSide: "left" };
		const l = { fromSide: "left", toSide: "right" };
		let data: CanvasData = {
			nodes: [zone("root", 0, 0), zone("a", 0, 0), zone("b", 0, 0), zone("c", 0, 0), zone("d", 0, 0)],
			// Right: a above b. Left, clockwise from the bottom: c, then d above it.
			edges: [
				{ ...arrow("root", "a"), ...r },
				{ ...arrow("root", "b"), ...r },
				{ ...arrow("root", "c"), ...l },
				{ ...arrow("root", "d"), ...l },
			],
		};
		arrangeZoneMaps(data, layout);
		const y = (id: string) => at(data, id).y;
		const onLeft = (id: string) => at(data, id).x < at(data, "root").x;
		expect(y("d")).toBeLessThan(y("c"));
		// b down: past the bottom of the right, to the bottom of the left.
		data = moveMapZone(data, "b", "down", layout)!;
		expect(onLeft("b")).toBe(true);
		expect(y("b")).toBeGreaterThan(y("c"));
		// b down again: back to the bottom of the right.
		data = moveMapZone(data, "b", "down", layout)!;
		expect(onLeft("b")).toBe(false);
		expect(y("b")).toBeGreaterThan(y("a"));
		// d up: past the top of the left, to the top of the right.
		data = moveMapZone(data, "d", "up", layout)!;
		expect(onLeft("d")).toBe(false);
		expect(y("d")).toBeLessThan(y("a"));
		// c up on the left: nothing above it now but... it is alone: over to the top of the right.
		data = moveMapZone(data, "c", "up", layout)!;
		expect(onLeft("c")).toBe(false);
		expect(y("c")).toBeLessThan(y("d"));
		// Within a column: b up swaps with a.
		data = moveMapZone(data, "b", "up", layout)!;
		expect(y("b")).toBeLessThan(y("a"));
		stable(data);
		// A deeper zone only moves among its siblings.
		data = addMapZone(data, "a", "child", layout, { newId: () => "a1" })!.data;
		expect(moveMapZone(data, "a1", "up", layout)).toBeNull();
	});

	it("keeps deeper zones top to bottom on the left too, as mind map nodes", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0), zone("l", -2000, 0)], edges: [{ ...arrow("root", "l"), fromSide: "left", toSide: "right" }] };
		data = addMapZone(data, "l", "child", layout, { newId: () => "l1" })!.data;
		data = addMapZone(data, "l1", "sibling", layout, { newId: () => "l2" })!.data;
		data = addMapZone(data, "l", "child", layout, { newId: () => "l3" })!.data;
		const y = (id: string) => at(data, id).y;
		expect(y("l1")).toBeLessThan(y("l2"));
		expect(y("l2")).toBeLessThan(y("l3"));
		data = moveMapZone(data, "l3", "up", layout)!;
		expect(y("l3")).toBeLessThan(y("l2"));
		expect(moveMapZone(data, "l1", "up", layout)).toBeNull();
		stable(data);
	});

	it("balances the root's children like a mind map from five on, keeping the clockwise order", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0)], edges: [] };
		const made: string[] = [];
		for (let i = 0; i < 6; i++) {
			const r = addMapZone(data, "root", "child", layout, { newId: ids })!;
			data = r.data;
			made.push(r.zone.id);
		}
		const onLeft = (id: string) => at(data, id).x < at(data, "root").x;
		// Six zones of the same size: three on each side.
		expect(made.filter(onLeft).length).toBe(3);
		// Clockwise: the first three down the right, the last three up the left (the newest top left).
		expect(made.slice(0, 3).every((id) => !onLeft(id))).toBe(true);
		expect(at(data, made[5]).y).toBeLessThan(at(data, made[3]).y);
		// A zone that grows tips the balance: Tidy moves the split.
		Object.assign(at(data, made[0]), { height: 3000 });
		balanceZoneMaps(data, layout);
		expect(made.filter(onLeft).length).toBe(5);
		expect(onLeft(made[0])).toBe(false);
		tidy(data);
		stable(data);
		noOverlaps(data);
	});

	it("in a balanced map, Alt+Up/Down trade places round the ring", () => {
		let data: CanvasData = { nodes: [zone("root", 0, 0)], edges: [] };
		const made: string[] = [];
		for (let i = 0; i < 6; i++) {
			const r = addMapZone(data, "root", "child", layout, { newId: ids })!;
			data = r.data;
			made.push(r.zone.id);
		}
		const onLeft = (id: string) => at(data, id).x < at(data, "root").x;
		const ends = () => {
			const right = made.filter((id) => !onLeft(id)).sort((a, b) => at(data, a).y - at(data, b).y);
			const left = made.filter(onLeft).sort((a, b) => at(data, a).y - at(data, b).y);
			return { topRight: right[0], bottomRight: right[right.length - 1], topLeft: left[0], bottomLeft: left[left.length - 1] };
		};
		// The bottom one on the right goes down: it trades places with the bottom one on the left.
		const before = ends();
		data = moveMapZone(data, before.bottomRight, "down", layout)!;
		expect(ends().bottomLeft).toBe(before.bottomRight);
		expect(ends().bottomRight).toBe(before.bottomLeft);
		// The top one on the left goes up: it trades places with the top one on the right.
		const now = ends();
		data = moveMapZone(data, now.topLeft, "up", layout)!;
		expect(ends().topRight).toBe(now.topLeft);
		expect(ends().topLeft).toBe(now.topRight);
		stable(data);
	});
});

describe("zone membership changes only by hand", () => {
	const inside = (n: CanvasNode, z: CanvasNode) => {
		const cx = n.x + n.width / 2;
		const cy = n.y + n.height / 2;
		return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
	};
	const settle = (data: CanvasData, stay: ReturnType<typeof tidyZones>, moved?: Set<string>) => {
		stay = tidyZones(data, layout, [], stay, moved ?? new Set());
		for (let i = 0; i < 4; i++) stay = tidyZones(data, layout, [], stay, new Set());
		return stay;
	};

	it("pushes a node in no zone out of a zone that grows over it, and keeps it out", () => {
		const data: CanvasData = { nodes: [zone("z", 0, 0), card("in", 40, 40), card("loose", 1200, 40)], edges: [] };
		let stay = settle(data, tidyZones(data, layout));
		expect(stay.get("loose")?.zone).toBeUndefined();
		// A tree layout moves "in" right, so the zone grows over "loose".
		at(data, "in").x = 1100;
		stay = settle(data, stay);
		expect(stay.get("in")?.zone).toBe("z");
		expect(stay.get("loose")?.zone).toBeUndefined();
		expect(overlap(at(data, "z"), at(data, "loose"))).toBe(false);
		const before = JSON.stringify(data);
		settle(data, stay);
		expect(JSON.stringify(data)).toBe(before);
	});

	it("keeps a node in its zone when a layout moves it over another zone", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), zone("b", 2000, 0), card("ca", 40, 40), card("cb", 2040, 40)], edges: [] };
		let stay = settle(data, tidyZones(data, layout));
		Object.assign(at(data, "ca"), { x: 2500, y: 40 }); // moved by a layout, not by hand
		stay = settle(data, stay);
		expect(stay.get("ca")?.zone).toBe("a");
		expect(inside(at(data, "ca"), at(data, "a"))).toBe(true);
		noOverlaps(data);
	});

	it("moves a node to the zone it was dragged into", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), zone("b", 2000, 0), card("ca", 40, 40), card("loose", 40, 1200)], edges: [] };
		let stay = settle(data, tidyZones(data, layout));
		Object.assign(at(data, "ca"), { x: 2500, y: 40 });
		Object.assign(at(data, "loose"), { x: 60, y: 60 });
		stay = settle(data, stay, new Set(["ca", "loose"]));
		expect(stay.get("ca")?.zone).toBe("b");
		expect(stay.get("loose")?.zone).toBe("a");
	});

	it("without a list of dragged nodes, a changed position counts as moved by hand", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), zone("b", 2000, 0), card("ca", 40, 40)], edges: [] };
		let stay = tidyZones(data, layout);
		for (let i = 0; i < 4; i++) stay = tidyZones(data, layout, [], stay);
		Object.assign(at(data, "ca"), { x: 2500, y: 40 });
		stay = tidyZones(data, layout, [], stay);
		expect(stay.get("ca")?.zone).toBe("b");
	});

	it("takes a dragged node's branches along, into a zone and out again", () => {
		const data: CanvasData = {
			nodes: [zone("a", 0, 0), zone("b", 4000, 0), card("ca", 40, 40), card("cb", 4040, 40), card("p", 40, 2000), card("k", 540, 2000), card("g", 1040, 2000), card("away", 4480, 40)],
			edges: [arrow("p", "k"), arrow("k", "g"), arrow("p", "away")],
		};
		let stay = settle(data, tidyZones(data, layout));
		expect(stay.get("away")?.zone).toBe("b");
		// Only "p" is dragged, into "a"; its children stay where they were for now.
		Object.assign(at(data, "p"), { x: 60, y: 60 });
		stay = settle(data, stay, new Set(["p"]));
		for (const id of ["p", "k", "g"]) expect(stay.get(id)?.zone, id).toBe("a");
		expect(stay.get("away")?.zone, "a branch in another zone stays there").toBe("b");
		for (const id of ["p", "k", "g"]) expect(overlap(at(data, "b"), at(data, id)), id).toBe(false);
		const before = JSON.stringify(data);
		settle(data, stay);
		expect(JSON.stringify(data)).toBe(before);
		// Dragged out again: the branch leaves with it.
		Object.assign(at(data, "p"), { x: -3000, y: 3000 });
		stay = settle(data, stay, new Set(["p"]));
		for (const id of ["p", "k", "g"]) expect(stay.get(id)?.zone, id).toBeUndefined();
		expect(stay.get("away")?.zone).toBe("b");
	});

	it("gives a new node its parent's zone, wherever it lands", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), zone("b", 2000, 0), card("p", 40, 40), card("q", 2040, 40)], edges: [] };
		let stay = settle(data, tidyZones(data, layout));
		data.nodes.push(card("kid", 2500, 40), card("free", 2500, 600));
		data.edges.push(arrow("p", "kid"));
		at(data, "free").x = 1400; // loose new node with no parent: where it is
		stay = settle(data, stay);
		expect(stay.get("kid")?.zone).toBe("a");
		expect(inside(at(data, "kid"), at(data, "a"))).toBe(true);
		noOverlaps(data);
	});

	it("a new child of a node in no zone stays out of zones", () => {
		const data: CanvasData = { nodes: [zone("a", 0, 0), card("ca", 40, 40), card("p", -1000, 40)], edges: [] };
		let stay = settle(data, tidyZones(data, layout));
		data.nodes.push(card("kid", 60, 60));
		data.edges.push(arrow("p", "kid"));
		stay = settle(data, stay);
		expect(stay.get("kid")?.zone).toBeUndefined();
		expect(overlap(at(data, "a"), at(data, "kid"))).toBe(false);
	});

	it("a new map zone pushes nodes in no zone out of the way, also without responsive zones", () => {
		const data: CanvasData = { nodes: [zone("root", 0, 0), card("loose", 1100, 40)], edges: [] };
		let stay = arrangeZoneMaps(data, layout, undefined, new Set());
		const added = addMapZone(data, "root", "child", layout, { newId: ids })!;
		expect(overlap(at(added.data, added.zone.id), at(added.data, "loose"))).toBe(true);
		stay = arrangeZoneMaps(added.data, layout, stay, new Set());
		expect(stay.get("loose")?.zone).toBeUndefined();
		expect(overlap(at(added.data, added.zone.id), at(added.data, "loose"))).toBe(false);
		const before = JSON.stringify(added.data);
		arrangeZoneMaps(added.data, layout, stay, new Set());
		expect(JSON.stringify(added.data)).toBe(before);
	});
});
