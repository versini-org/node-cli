import { describe, expect, it } from "vitest";
import { compareSizes, formatDelta, formatSize } from "../compare.js";

describe("formatSize", () => {
	it("uses the kilo base it is given", () => {
		expect(formatSize(153000, 1000)).toBe("153 kB");
		expect(formatSize(268288, 1024)).toBe("262 kB");
		expect(formatSize(266076, 1024)).toBe("259.84 kB");
	});

	it("handles zero, bytes and megabytes", () => {
		expect(formatSize(0, 1024)).toBe("0 B");
		expect(formatSize(512, 1024)).toBe("512 B");
		expect(formatSize(1402880, 1024)).toBe("1.34 MB");
	});
});

describe("formatDelta", () => {
	const base = { kilo: 1024, threshold: 0 };

	it("shows growth with an up arrow, kB and percent", () => {
		expect(formatDelta({ ...base, size: 266076, previous: 264806 })).toBe(
			"▲ +1.24 kB (+0.48%)",
		);
	});

	it("shows shrinkage with a down arrow and minus signs", () => {
		expect(formatDelta({ ...base, size: 49152, previous: 50176 })).toBe(
			"▼ −1 kB (−2.04%)",
		);
	});

	it("shows no change for equal sizes", () => {
		expect(formatDelta({ ...base, size: 1000, previous: 1000 })).toBe(
			"= no change",
		);
	});

	it("treats changes under the threshold as no change", () => {
		expect(
			formatDelta({ kilo: 1024, threshold: 15, size: 1014, previous: 1000 }),
		).toBe("= no change");
		expect(
			formatDelta({ kilo: 1024, threshold: 15, size: 1015, previous: 1000 }),
		).toBe("▲ +15 B (+1.50%)");
	});

	it("labels an entry missing from the baseline as new", () => {
		expect(formatDelta({ ...base, size: 1000, previous: undefined })).toBe(
			"new",
		);
	});

	it("omits the percentage when the baseline was empty", () => {
		expect(formatDelta({ ...base, size: 2048, previous: 0 })).toBe("▲ +2 kB");
	});

	it("never points the arrow against the direction of change", () => {
		for (let i = 0; i < 500; i++) {
			const previous = Math.floor(Math.random() * 500000);
			const size = Math.floor(Math.random() * 500000);
			const threshold = Math.floor(Math.random() * 50);
			const delta = formatDelta({ kilo: 1000, threshold, size, previous });
			const diff = size - previous;
			if (Math.abs(diff) < threshold || diff === 0) {
				expect(delta).toBe("= no change");
			} else if (diff > 0) {
				expect(delta.startsWith("▲ +")).toBe(true);
			} else {
				expect(delta.startsWith("▼ −")).toBe(true);
			}
		}
	});
});

describe("compareSizes", () => {
	const current = [
		{ name: "first-paint", size: 150425, sizeLimit: 153000, passed: true },
	];

	it("renders the table with a vs main column and the baseline commit", () => {
		const { data, passed } = compareSizes({
			current,
			baseline: [{ name: "first-paint", size: 151142 }],
			baseSha: "a41c9e2d0b5f",
			kilo: 1000,
		});
		expect(passed).toBe(true);
		expect(data).toBe(
			[
				"## Bundle Size",
				"",
				"| Status | Section | Size (gzip) | vs main | Limit (gzip) |",
				"| --- | --- | --- | --- | --- |",
				"| ✅ | first-paint | 150.43 kB | ▼ −717 B (−0.47%) | 153 kB |",
				"",
				"<sub>Compared with `main` @ `a41c9e2`.</sub>",
				"",
			].join("\n"),
		);
	});

	it("says so when there is no baseline", () => {
		const { data } = compareSizes({ current, baseSha: "a41c9e2" });
		expect(data).toContain("| ✅ | first-paint | 146.9 kB | n/a | 149.41 kB |");
		expect(data).toContain(
			"<sub>⚠️ No baseline found for `main` @ `a41c9e2`, so no change is shown.</sub>",
		);
	});

	it("omits the commit when none is given", () => {
		const { data } = compareSizes({ current, baseline: [] });
		expect(data).toContain("<sub>Compared with `main`.</sub>");
		expect(data).toContain("| new |");
	});

	it("uses the custom header, base ref and footer", () => {
		const { data } = compareSizes({
			current,
			baseline: current,
			header: "### First-paint bundle",
			baseRef: "develop",
			footer: "<sub>Budget lives in .size-limit.json.</sub>",
		});
		expect(data.startsWith("### First-paint bundle\n")).toBe(true);
		expect(data).toContain("| vs develop |");
		expect(data).toContain("Compared with `develop`.");
		expect(
			data.endsWith("<sub>Budget lives in .size-limit.json.</sub>\n"),
		).toBe(true);
	});

	it("fails when an entry is over its limit, with or without passed", () => {
		expect(
			compareSizes({ current: [{ name: "a", size: 11, sizeLimit: 10 }] })
				.passed,
		).toBe(false);
		expect(
			compareSizes({ current: [{ name: "a", size: 1, passed: false }] }).passed,
		).toBe(false);
		expect(compareSizes({ current: [{ name: "a", size: 1 }] }).passed).toBe(
			true,
		);
	});

	it("marks failing rows and shows a dash for a missing limit", () => {
		const { data } = compareSizes({
			current: [
				{ name: "over", size: 11, sizeLimit: 10 },
				{ name: "free", size: 5 },
			],
		});
		expect(data).toContain("| ❌ | over | 11 B | n/a | 10 B |");
		expect(data).toContain("| ✅ | free | 5 B | n/a | — |");
	});

	it("escapes pipes in names so the table keeps its columns", () => {
		const { data } = compareSizes({ current: [{ name: "a|b", size: 1 }] });
		expect(data).toContain("| a\\|b |");
	});
});
