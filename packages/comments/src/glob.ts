import fs from "node:fs";
import path from "node:path";
import micromatch from "micromatch";

export interface GlobOptions {
	followSymlinks?: boolean;
}

const WILDCARD_CHARS = /[!*?]/; // Detects basic glob characters

function patternRoot(pattern: string): string {
	if (!WILDCARD_CHARS.test(pattern)) {
		return path.dirname(pattern) || ".";
	}
	const firstWildcard = pattern.search(/[*!?]/);
	let rootPart =
		firstWildcard === -1 ? pattern : pattern.slice(0, firstWildcard);
	if (!rootPart.endsWith("/")) {
		rootPart = path.dirname(rootPart);
	}
	if (!rootPart.length) {
		return ".";
	}
	return rootPart;
}

function walk(root: string, followSymlinks: boolean): string[] {
	const results: string[] = [];
	function recur(dir: string) {
		let entries: fs.Dirent[] = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const full = path.join(dir, e.name);
			if (e.isSymbolicLink()) {
				if (!followSymlinks) {
					continue;
				}
				let stat;
				try {
					stat = fs.statSync(full);
				} catch {
					continue;
				}
				if (stat.isDirectory()) {
					recur(full);
				} else if (stat.isFile()) {
					results.push(full);
				}
				continue;
			}
			if (e.isDirectory()) {
				recur(full);
			} else if (e.isFile()) {
				results.push(full);
			}
		}
	}
	const start = root || ".";
	if (!fs.existsSync(start)) {
		return [];
	}
	const st = fs.statSync(start);
	if (st.isFile()) {
		return [start];
	}
	recur(start);
	return results;
}

export function expandGlobs(
	patterns: string[],
	options: GlobOptions = {},
): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const pattern of patterns) {
		// Literal file (no metachars).
		if (!WILDCARD_CHARS.test(pattern)) {
			if (
				fs.existsSync(pattern) &&
				fs.statSync(pattern).isFile() &&
				!seen.has(pattern)
			) {
				seen.add(pattern);
				out.push(pattern);
			}
			continue;
		}
		const root = patternRoot(pattern);
		const files = walk(root, options.followSymlinks || false);
		const mmPattern = pattern.replace(/\\/g, "/");
		for (const f of files) {
			const normalized = f.replace(/\\/g, "/");
			if (micromatch.isMatch(normalized, mmPattern)) {
				if (!seen.has(f)) {
					seen.add(f);
					out.push(f);
				}
			}
		}
	}
	return out;
}
