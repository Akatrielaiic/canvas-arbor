import { afterEach, describe, expect, it } from "vitest";
import type { Canvas, CanvasNode } from "../src/canvas";
import { batch, gliding, motionHooks, settle, target } from "../src/motion";

// A canvas just big enough for motion.ts: nodes with moveAndResize, a window for frames.
function fakeCanvas() {
	const frames: (() => void)[] = [];
	const win = { requestAnimationFrame: (f: () => void) => frames.push(f), cancelAnimationFrame: () => {} };
	const canvas = { nodes: new Map<string, CanvasNode>(), canvasEl: { win }, saves: 0, requestSave() { canvas.saves++; } } as unknown as Canvas & { saves: number };
	const node = (id: string, x: number, y: number) => {
		const n = {
			id, x, y, width: 100, height: 60, canvas,
			nodeEl: { hasClass: () => false },
			moveAndResize(r: { x: number; y: number; width: number; height: number }) { Object.assign(n, r); },
		} as unknown as CanvasNode;
		canvas.nodes.set(id, n);
		return n;
	};
	return { canvas, node, frames };
}

afterEach(() => {
	settle();
	motionHooks.enabled = () => false;
});

describe("motion", () => {
	it("leaves moved nodes where they were and lets them glide", () => {
		const { canvas, node, frames } = fakeCanvas();
		motionHooks.enabled = () => true;
		const a = node("a", 0, 0);
		const b = node("b", 500, 0);
		batch(canvas, () => a.moveAndResize({ x: 200, y: 100, width: 140, height: 60 }));
		expect([a.x, a.y, a.width]).toEqual([0, 0, 100]);
		expect(target(a)).toEqual({ x: 200, y: 100, width: 140, height: 60 });
		expect(target(b)).toBeUndefined();
		expect(gliding()).toBe(true);
		expect(frames.length).toBe(1);
	});

	it("settle puts every node where it is going and saves", () => {
		const { canvas, node } = fakeCanvas();
		motionHooks.enabled = () => true;
		const a = node("a", 0, 0);
		batch(canvas, () => a.moveAndResize({ x: 200, y: 100, width: 100, height: 60 }));
		settle();
		expect([a.x, a.y]).toEqual([200, 100]);
		expect(gliding()).toBe(false);
		expect(canvas.saves).toBe(1);
	});

	it("a new batch starts from where the nodes really are", () => {
		const { canvas, node } = fakeCanvas();
		motionHooks.enabled = () => true;
		const a = node("a", 0, 0);
		batch(canvas, () => a.moveAndResize({ x: 200, y: 0, width: 100, height: 60 }));
		let seen = -1;
		batch(canvas, () => (seen = a.x));
		expect(seen).toBe(200);
	});

	it("nested batches glide once, at the end of the outer one", () => {
		const { canvas, node } = fakeCanvas();
		motionHooks.enabled = () => true;
		const a = node("a", 0, 0);
		batch(canvas, () => {
			batch(canvas, () => a.moveAndResize({ x: 100, y: 0, width: 100, height: 60 }));
			expect(a.x).toBe(100); // inside the operation, positions are the computed ones
			a.moveAndResize({ x: 300, y: 0, width: 100, height: 60 });
		});
		expect(a.x).toBe(0);
		expect(target(a)?.x).toBe(300);
	});

	it("does nothing when motion is off", () => {
		const { canvas, node, frames } = fakeCanvas();
		const a = node("a", 0, 0);
		batch(canvas, () => a.moveAndResize({ x: 200, y: 0, width: 100, height: 60 }));
		expect(a.x).toBe(200);
		expect(gliding()).toBe(false);
		expect(frames.length).toBe(0);
	});
});
