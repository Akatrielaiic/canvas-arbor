import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReplacements, linkOccurrences, linkTargets, mentions, replacements } from "../src/links.ts";

const rename = (text: string, from: string, to: string) => applyReplacements(text, replacements(text, from, to));

test("finds the target of each kind of link, without heading, alias or title", () => {
	const text = '![[a/1.png#x|alt]] [t](b/2.png#h "title") [t](<c/3 x.png>) [[4.png^block]]';
	assert.deepEqual(linkTargets(text).map(([s, e]) => text.slice(s, e)), ["a/1.png", "b/2.png", "c/3 x.png", "4.png"]);
});

test("only a whole file name matches", () => {
	assert.deepEqual(linkOccurrences("![[image-1.png]] ![[1.png]]", "1.png"), [20]);
	assert.equal(mentions("![](image-1.png)", "1.png"), false);
	assert.equal(mentions("see [[a/pic.png|x]]", "pic.png"), true);
	assert.equal(mentions("![](sub/dir/1.png)", "1.png"), true);
});

test("alt text, display text and plain brackets are not link targets", () => {
	assert.equal(mentions("![1.png](other.png)", "1.png"), false);
	assert.equal(mentions("[1.png]", "1.png"), false);
	assert.equal(mentions("[[other.png|1.png]]", "1.png"), false);
	assert.equal(mentions("[see [x] 1.png](other.png)", "1.png"), false);
	assert.equal(mentions("1.png", "1.png"), false);
	assert.equal(rename("![1.png](other.png) [1.png]", "1.png", "map.png"), "![1.png](other.png) [1.png]");
});

test("rewrites the target and leaves a matching alt text alone", () => {
	assert.equal(rename("![1.png](1.png) ![[1.png|1.png]]", "1.png", "map.png"), "![1.png](map.png) ![[map.png|1.png]]");
});

test("rewrites wikilinks and URL-encoded Markdown links", () => {
	const text = "![[Pasted image 1.png]] and ![](Pasted%20image%201.png)";
	assert.equal(rename(text, "Pasted image 1.png", "My map.png"), "![[My map.png]] and ![](My%20map.png)");
});
