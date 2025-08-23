import fs from "node:fs";
import path from "node:path";

export interface GlobOptions {
	followSymlinks?: boolean;
}

interface InternalPattern {
	pattern: string;
	regex: RegExp | null; // null means literal file path
	root: string; // directory root to start walking
}

const WILDCARD_CHARS = /[!*?]/;

export function augmentPatterns(patterns: string[]): string[] {
	// Add dir/**/*.ext for each dir/*.ext simple pattern.
	const extra: string[] = [];
	for (const p of patterns) {
		if (p.includes("**")) {
			continue;
		}
		const m = /^(.*)\/([^/]+)$/.exec(p);
		if (!m) {
			continue;
		}
		const [_, dir, file] = m;
		if (file.includes("*")) {
			// if pattern is like dir/*.ts add deep variant.
			if (!patterns.includes(`${dir}/**/${file}`)) {
				extra.push(`${dir}/**/${file}`);
			}
		}
	}
	return patterns.concat(extra);
}

function escapeRegex(str: string): string {
	return str.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function toRegex(pattern: string): { regex: RegExp | null; root: string } {
	if (!WILDCARD_CHARS.test(pattern)) {
		return { regex: null, root: path.dirname(pattern) || "." };
	}
	// Determine walk root: substring up to first wildcard then dirname.
	const firstWildcard = pattern.search(/[*!?]/);
	let rootPart =
		firstWildcard === -1 ? pattern : pattern.slice(0, firstWildcard);
	if (!rootPart.endsWith("/")) {
		rootPart = path.dirname(rootPart);
	}
	if (!rootPart.length) {
		rootPart = ".";
	}
	// Build regex: convert pattern path separators to '/'.
	const norm = pattern.replace(/\\/g, "/");
	let rx = "";
	for (let i = 0; i < norm.length; ) {
		if (norm[i] === "*") {
			if (norm[i + 1] === "*") {
				// '**'.
				i += 2;
				// collapse subsequent /** or trailing /
				if (norm[i] === "/") {
					// match zero or more directories.
					rx += "(?:.*?/)?";
					i++;
				} else {
					rx += ".*";
				}
				continue;
			}
			rx += "[^/]*";
			i++;
			continue;
		}
		if (norm[i] === "?") {
			rx += "[^/]";
			i++;
			continue;
		}
		rx += escapeRegex(norm[i]);
		i++;
	}
	return { regex: new RegExp(`^${rx}$`), root: rootPart };
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
	const augmented = augmentPatterns(patterns);
	const compiled: InternalPattern[] = augmented.map((p) => {
		const { regex, root } = toRegex(p);
		return { pattern: p, regex, root };
	});
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of compiled) {
		if (p.regex === null) {
			if (fs.existsSync(p.pattern) && fs.statSync(p.pattern).isFile()) {
				if (!seen.has(p.pattern)) {
					seen.add(p.pattern);
					out.push(p.pattern);
				}
			}
			continue;
		}
		const files = walk(p.root, options.followSymlinks || false);
		for (const f of files) {
			const rel = f.replace(/\\/g, "/");
			if (p.regex.test(rel)) {
				if (!seen.has(f)) {
					seen.add(f);
					out.push(f);
				}
			}
		}
	}
	return out;
}
