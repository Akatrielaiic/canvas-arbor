import { describe, expect, it } from "vitest";
import { applyReplacements, linkOccurrences, linkTargets, mentions, plainText, replacements } from "../src/text";

describe("plainText", () => {
	it("gives up on content that does not render as its characters", () => {
		for (const md of ["![[a.png]]", "```js\nx\n```", "| a | b |", "# Title", "$$x$$"]) expect(plainText(md)).toBeNull();
	});
	it("reads links, lists and emphasis as they show", () => {
		expect(plainText("[[folder/Note#h|shown]] and [[folder/Note]]")).toBe("shown and Note");
		expect(plainText("[text](https://example.com)")).toBe("text");
		expect(plainText("- [ ] task\n- item")).toBe("☐ task\n• item");
		expect(plainText("**bold** and *it* and `code`\n\n")).toBe("bold and it and code");
	});
});

describe("renaming links", () => {
	it("only matches a whole file name", () => {
		expect(linkOccurrences("![[image-1.png]] ![[1.png]]", "1.png")).toEqual([20]);
		expect(mentions("see [[a/pic.png|x]]", "pic.png")).toBe(true);
		expect(mentions("picture.png", "pic.png")).toBe(false);
	});
	it("finds the target of each kind of link, without heading, alias or title", () => {
		const text = "![[a/1.png#x|alt]] [t](b/2.png#h \"title\") [t](<c/3 x.png>) [[4.png^block]]";
		expect(linkTargets(text).map(([s, e]) => text.slice(s, e))).toEqual(["a/1.png", "b/2.png", "c/3 x.png", "4.png"]);
	});
	it("ignores alt text, display text and plain brackets", () => {
		// Review of PR #1: these must not count as links to 1.png.
		expect(mentions("![1.png](other.png)", "1.png")).toBe(false);
		expect(mentions("[1.png]", "1.png")).toBe(false);
		expect(mentions("[[other.png|1.png]]", "1.png")).toBe(false);
		expect(mentions("[see [x] 1.png](other.png)", "1.png")).toBe(false);
		expect(mentions("1.png", "1.png")).toBe(false);
		expect(replacements("![1.png](other.png) [1.png]", "1.png", "map.png")).toEqual([]);
	});
	it("still finds the target next to a misleading alt text", () => {
		const text = "![1.png](1.png) ![[1.png|1.png]]";
		expect(applyReplacements(text, replacements(text, "1.png", "map.png"))).toBe("![1.png](map.png) ![[map.png|1.png]]");
		expect(mentions("![](sub/dir/1.png)", "1.png")).toBe(true);
		expect(mentions("![](image-1.png)", "1.png")).toBe(false);
	});
	it("rewrites wikilinks and encoded Markdown links", () => {
		const text = "![[Pasted image 1.png]] and ![](Pasted%20image%201.png)";
		const out = applyReplacements(text, replacements(text, "Pasted image 1.png", "My map.png"));
		expect(out).toBe("![[My map.png]] and ![](My%20map.png)");
	});
});
