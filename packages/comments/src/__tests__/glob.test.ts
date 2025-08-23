import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { augmentPatterns, expandGlobs } from "../glob.js";
import { parseAndTransformComments } from "../lib.js";

describe("glob utilities & additional lib branches", () => {
	it("augmentPatterns adds deep variant only when needed", () => {
		const input = ["/tmp/dir/*.ts", "/tmp/dir/**/a.ts", "/tmp/file.txt"]; // second already deep, third no wildcard folder/file split
		const out = augmentPatterns(input);
		// Should add one deep variant for first pattern
		const additions = out.filter((p) => p.includes("**/*.ts"));
		expect(additions.length).toBe(1);
	});

	it("expandGlobs matches literals and wildcards including ?", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "comments-glob2-"));
		const files = ["a.ts", "ab.ts", "abc.ts", "note.md"]; // to test ? wildcard and *
		for (const f of files) {
			fs.writeFileSync(path.join(root, f), "// x", "utf8");
		}
		const patterns = [
			path.join(root, "a?.ts"), // should match ab.ts only
			path.join(root, "a*.ts"), // matches a.ts, ab.ts, abc.ts
			path.join(root, "note.md"), // literal
		];
		const expanded = expandGlobs(patterns)
			.map((p) => path.basename(p))
			.sort();
		expect(expanded).toEqual(["a.ts", "ab.ts", "abc.ts", "note.md"].sort());
	});

	it("expandGlobs handles symlinks when followSymlinks true", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "comments-glob-sym-"));
		const target = path.join(root, "target.ts");
		fs.writeFileSync(target, "// target", "utf8");
		const link = path.join(root, "link.ts");
		try {
			fs.symlinkSync(target, link);
		} catch {
			// Some file systems may not allow symlinks (CI on Windows); skip gracefully.
			return;
		}
		const pattern = path.join(root, "*.ts");
		const noFollow = expandGlobs([pattern], { followSymlinks: false });
		expect(noFollow).toContain(target);
		expect(noFollow).not.toContain(link);
		const withFollow = expandGlobs([pattern], { followSymlinks: true });
		expect(withFollow).toContain(target);
		expect(withFollow).toContain(link);
	});

	it("expandGlobs handles file literals, duplicate patterns and nonexistent paths", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "comments-glob-lit-"));
		const file = path.join(root, "only.ts");
		fs.writeFileSync(file, "// only", "utf8");
		// duplicate patterns plus a nonexistent literal
		const patterns = [file, file, path.join(root, "missing.ts")];
		const out = expandGlobs(patterns);
		expect(out).toEqual([file]); // only once
	});

	it("lib buildJsDoc preserves blank line separation and fences (edge branch)", () => {
		const input = [
			"/**",
			" * First paragraph line",
			" *",
			" * ```sh",
			" * echo hi",
			" * ```",
			" *",
			" * Second paragraph without period",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			width: 60,
			wrapLineComments: true,
			mergeLineComments: false,
		}).transformed;
		// At least one blank line (line with only '*') preserved around fence
		const starBlankCount = out
			.split(/\n/)
			.filter((l) => /^\s*\*\s*$/.test(l)).length;
		expect(starBlankCount).toBeGreaterThanOrEqual(1);
		// Fenced code block retained
		expect(out).toContain("```sh");
		// Second paragraph ended with period added
		expect(/Second paragraph without period\./.test(out)).toBe(true);
	});
});
