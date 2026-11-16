import { describe, expect, it } from "vitest";
import { type CanvasData, type CanvasNode, type Layout, addZone, moveToZone, tidyZones } from "../src/zone-engine";

const layout: Layout = { cardWidth: 400, cardHeight: 400, gap: 40, columns: 2 };
const overlap = (a: CanvasNode, b: CanvasNode) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (zone: CanvasNode, n: CanvasNode) =>
	n.x >= zone.x && n.y >= zone.y && n.x + n.width <= zone.x + zone.width && n.y + n.height <= zone.y + zone.height;
const at = (data: CanvasData, id: string) => data.nodes.find((n) => n.id === id)!;
const box = (data: CanvasData, id: string) => [at(data, id).x, at(data, id).y, at(data, id).width, at(data, id).height];
const stable = (data: CanvasData) => {
	const before = JSON.stringify(data);
	tidyZones(data, layout);
	expect(JSON.stringify(data)).toBe(before);
};

describe("zones", () => {
	it("adds a zone clear of everything else", () => {
		const data: CanvasData = { nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 400, height: 400 }], edges: [] };
		const one = addZone(data, { label: "Today", color: "5" }, layout, { newId: () => "z1" });
		const two = addZone(one.data, { label: "Later" }, layout, { newId: () => "z2", anchorId: "z1" });
		expect(at(two.data, "z1").color).toBe("5");
		expect(at(two.data, "z2").y).toBe(at(two.data, "z1").y);
		for (const z of ["z1", "z2"]) for (const n of two.data.nodes) if (n.id !== z) expect(overlap(at(two.data, z), n)).toBe(false);
	});

	it("moves a node into a zone with its branch, keeping the branch's shape", () => {
		const data: CanvasData = {
			nodes: [
				{ id: "z", type: "group", label: "Today", x: 5000, y: 0, width: 500, height: 500 },
				{ id: "root", type: "text", x: 0, y: 0, width: 400, height: 400 },
				{ id: "kid", type: "text", x: 500, y: 100, width: 200, height: 60 },
				{ id: "grandkid", type: "text", x: 800, y: 300, width: 200, height: 60 },
				{ id: "parent", type: "text", x: -400, y: 0, width: 200, height: 60 },
			],
			edges: [
				{ id: "e0", fromNode: "parent", toNode: "root" },
				{ id: "e1", fromNode: "root", toNode: "kid" },
				{ id: "e2", fromNode: "kid", toNode: "grandkid" },
				{ id: "e3", fromNode: "grandkid", toNode: "root" }, // a cycle must not hang
			],
		};
		const moved = moveToZone(data, ["kid", "root"], "z", layout)!;
		for (const id of ["root", "kid", "grandkid"]) expect(contains(at(moved, "z"), at(moved, id))).toBe(true);
		expect([at(moved, "kid").x - at(moved, "root").x, at(moved, "kid").y - at(moved, "root").y]).toEqual([500, 100]);
		expect([at(moved, "grandkid").x - at(moved, "root").x, at(moved, "grandkid").y - at(moved, "root").y]).toEqual([800, 300]);
		expect(at(moved, "parent").x).toBe(-400);
		expect(moveToZone(moved, ["root"], "z", layout)).toBeNull();
		expect(moveToZone(data, ["root"], "missing", layout)).toBeNull();
	});

	it("wraps a zone around its nodes, growing and shrinking, down to the size of an empty zone", () => {
		const data: CanvasData = {
			nodes: [
				{ id: "z", type: "group", label: "Today", x: 0, y: 0, width: 3000, height: 2000 },
				{ id: "empty", type: "group", label: "Later", x: 5000, y: 0, width: 3000, height: 2000 },
				{ id: "a", type: "text", x: 1000, y: 500, width: 400, height: 400 },
				{ id: "b", type: "text", x: 1500, y: 500, width: 400, height: 900 },
				{ id: "c", type: "text", x: 1000, y: 1500, width: 400, height: 400 },
			],
			edges: [],
		};
		tidyZones(data, layout);
		expect(box(data, "z")).toEqual([960, 460, 980, 1480]);
		expect(box(data, "empty")).toEqual([5000, 0, 3000, 2000]);
		at(data, "c").x = 9000;
		at(data, "b").y = 9000;
		tidyZones(data, layout);
		expect(box(data, "z")).toEqual([960, 460, 920, 480]);
		stable(data);
	});

	it("pushes overlapping nodes apart, leaving the pinned one where it is", () => {
		const make = (): CanvasData => ({
			nodes: [
				{ id: "z", type: "group", label: "Today", x: 0, y: 0, width: 1000, height: 1000 },
				{ id: "a", type: "text", x: 40, y: 40, width: 300, height: 300 },
				{ id: "b", type: "text", x: 200, y: 200, width: 300, height: 300 },
				{ id: "free1", type: "text", x: 5000, y: 5000, width: 300, height: 300 },
				{ id: "free2", type: "text", x: 5100, y: 5100, width: 300, height: 300 },
			],
			edges: [],
		});
		const plain = make();
		tidyZones(plain, layout);
		expect([at(plain, "a").x, at(plain, "a").y]).toEqual([40, 40]);
		expect(overlap(at(plain, "a"), at(plain, "b"))).toBe(false);
		expect(contains(at(plain, "z"), at(plain, "b"))).toBe(true);
		expect([at(plain, "free2").x, at(plain, "free2").y]).toEqual([5100, 5100]); // outside zones: untouched
		stable(plain);

		const pinned = make();
		tidyZones(pinned, layout, ["b"]);
		expect([at(pinned, "b").x, at(pinned, "b").y]).toEqual([200, 200]);
		expect(overlap(at(pinned, "a"), at(pinned, "b"))).toBe(false);
	});

	it("takes in children added outside the zone and pushes the neighbouring zone away", () => {
		const data: CanvasData = {
			nodes: [
				{ id: "z", type: "group", label: "Today", x: 0, y: 0, width: 480, height: 1000 },
				{ id: "next", type: "group", label: "Waiting", x: 560, y: 0, width: 480, height: 480 },
				{ id: "w", type: "text", x: 600, y: 40, width: 400, height: 400 },
				{ id: "a", type: "text", x: 40, y: 40, width: 400, height: 400 },
				{ id: "b", type: "text", x: 40, y: 500, width: 400, height: 400 },
				{ id: "kid", type: "text", x: 500, y: 600, width: 200, height: 60 },
				{ id: "elsewhere", type: "text", x: 620, y: 300, width: 100, height: 40 },
			],
			edges: [
				{ id: "e1", fromNode: "b", toNode: "kid" },
				{ id: "e2", fromNode: "a", toNode: "elsewhere" },
			],
		};
		tidyZones(data, layout);
		expect(contains(at(data, "z"), at(data, "kid"))).toBe(true);
		expect([at(data, "kid").x - at(data, "b").x, at(data, "kid").y - at(data, "b").y]).toEqual([460, 100]);
		expect(overlap(at(data, "z"), at(data, "next"))).toBe(false);
		expect(contains(at(data, "next"), at(data, "w"))).toBe(true);
		expect(contains(at(data, "next"), at(data, "elsewhere"))).toBe(true);
		stable(data);
	});
});
