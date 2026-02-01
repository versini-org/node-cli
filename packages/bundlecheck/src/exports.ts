import fs from "node:fs";
import path from "node:path";

/**
 * Represents a named export from a package.
 */
export type NamedExport = {
	/**
	 * The export name (e.g., "Button", "useState").
	 */
	name: string;
	/**
	 * The type of export.
	 */
	kind:
		| "function"
		| "class"
		| "const"
		| "type"
		| "interface"
		| "enum"
		| "unknown";
};

/**
 * Result from parsing package exports.
 */
export type ParsedExports = {
	/**
	 * Array of all named exports found in the package (including types).
	 */
	exports: NamedExport[];
	/**
	 * Total count of all named exports (including types).
	 */
	count: number;
	/**
	 * Array of runtime exports only (excluding types and interfaces).
	 */
	runtimeExports: NamedExport[];
	/**
	 * Count of runtime exports only (functions, classes, const, enums).
	 */
	runtimeCount: number;
};

/**
 * Resolve a relative import path to an absolute file path.
 */
function resolveImportPath(
	basePath: string,
	importPath: string,
): string | null {
	// Remove quotes and trim.
	let cleanPath = importPath.replace(/['"]/g, "").trim();

	// Only handle relative imports.
	if (!cleanPath.startsWith(".")) {
		return null;
	}

	/**
	 * Strip .js/.mjs extension if present (TypeScript uses .js in imports but
	 * .d.ts for types).
	 */
	cleanPath = cleanPath.replace(/\.(m?js)$/, "");

	const baseDir = path.dirname(basePath);
	const resolved = path.resolve(baseDir, cleanPath);

	// Try different extensions for the resolved path.
	const extensions = [".d.ts", ".d.mts", ".ts", ""];
	for (const ext of extensions) {
		const tryPath = resolved + ext;
		if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
			return tryPath;
		}
	}

	// Try index files in directory.
	for (const ext of [".d.ts", ".d.mts", ".ts"]) {
		const indexPath = path.join(resolved, `index${ext}`);
		if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
			return indexPath;
		}
	}

	return null;
}

/**
 * Parse a TypeScript declaration file (.d.ts) to extract named exports.
 * Recursively follows re-exports up to a maximum depth.
 */
function parseDeclarationFile(
	filePath: string,
	content: string,
	visited: Set<string> = new Set(),
	depth = 0,
): NamedExport[] {
	const MAX_DEPTH = 10;
	const MAX_FILES = 500;

	if (depth > MAX_DEPTH || visited.size > MAX_FILES) {
		return [];
	}

	// Avoid circular imports.
	const normalizedPath = path.resolve(filePath);
	if (visited.has(normalizedPath)) {
		return [];
	}
	visited.add(normalizedPath);

	const exports: NamedExport[] = [];
	const seenNames = new Set<string>();

	const addExport = (name: string, kind: NamedExport["kind"]) => {
		// Skip internal/private exports and TypeScript utility types.
		if (name.startsWith("_") || name === "default" || seenNames.has(name)) {
			return;
		}
		seenNames.add(name);
		exports.push({ name, kind });
	};

	// Pattern for: export * from './path'.
	const reExportAllPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;

	// Pattern for: export type { Name, Name2 } from './path' (type-only exports).
	const reExportTypePattern =
		/export\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

	/**
	 * Pattern for: export { Name, Name2 } from './path' (value exports - NOT
	 * type).
	 */
	const reExportValuePattern =
		/export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

	// Pattern for: export declare function Name.
	const functionPattern = /export\s+declare\s+function\s+(\w+)/g;
	// Pattern for: export declare class Name.
	const classPattern = /export\s+declare\s+class\s+(\w+)/g;
	// Pattern for: export declare const Name.
	const constPattern = /export\s+declare\s+const\s+(\w+)/g;
	// Pattern for: export declare type Name.
	const typePattern = /export\s+declare\s+type\s+(\w+)/g;
	// Pattern for: export type Name = ... (without declare).
	const typePattern2 = /export\s+type\s+(\w+)\s*[=<]/g;
	// Pattern for: export type { Name } (local re-export without from).
	const typeExportPattern = /export\s+type\s+\{([^}]+)\}\s*;/g;
	// Pattern for: export interface Name.
	const interfacePattern = /export\s+(?:declare\s+)?interface\s+(\w+)/g;
	// Pattern for: export declare enum Name.
	const enumPattern = /export\s+declare\s+enum\s+(\w+)/g;
	// Pattern for: export { Name, Name2 } (without from - local exports).
	const namedExportPattern = /export\s+\{([^}]+)\}\s*;/g;
	// Pattern for: export declare const Name: ... (component style).
	const componentPattern = /export\s+declare\s+const\s+(\w+)\s*:/g;
	// Pattern for: export function Name (without declare).
	const functionPattern2 = /export\s+function\s+(\w+)/g;
	// Pattern for: export class Name (without declare).
	const classPattern2 = /export\s+class\s+(\w+)/g;
	// Pattern for: export const Name (without declare).
	const constPattern2 = /export\s+const\s+(\w+)/g;

	// Helper to extract all matches from a regex.
	const extractMatches = (pattern: RegExp, text: string): RegExpExecArray[] => {
		const matches: RegExpExecArray[] = [];
		let result = pattern.exec(text);
		while (result !== null) {
			matches.push(result);
			result = pattern.exec(text);
		}
		return matches;
	};

	// Handle: export * from './path' - recursively parse.
	for (const match of extractMatches(reExportAllPattern, content)) {
		const importPath = match[1];
		const resolvedPath = resolveImportPath(filePath, importPath);
		if (resolvedPath) {
			try {
				const importedContent = fs.readFileSync(resolvedPath, "utf-8");
				const importedExports = parseDeclarationFile(
					resolvedPath,
					importedContent,
					visited,
					depth + 1,
				);
				for (const exp of importedExports) {
					addExport(exp.name, exp.kind);
				}
			} catch {
				// Ignore read errors.
			}
		}
	}

	// Handle: export type { Name } from './path' (type-only exports).
	for (const match of extractMatches(reExportTypePattern, content)) {
		const exportList = match[1];
		const names = exportList.split(",").map((s) => {
			const trimmed = s.trim();
			// Handle "Name as Alias".
			const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
			if (asMatch) {
				return asMatch[2];
			}
			return trimmed;
		});

		for (const name of names) {
			if (name && /^\w+$/.test(name)) {
				addExport(name, "type");
			}
		}
	}

	// Handle: export { Name } from './path' (value exports).
	for (const match of extractMatches(reExportValuePattern, content)) {
		// Skip if this is actually a type export (already handled above).
		const fullMatch = match[0];
		if (fullMatch.includes("export type")) {
			continue;
		}

		const exportList = match[1];
		const names = exportList.split(",").map((s) => {
			const trimmed = s.trim();
			// Handle "Name as Alias".
			const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
			if (asMatch) {
				return asMatch[2];
			}
			// Handle "type Name" syntax within the braces.
			const typeMatch = trimmed.match(/type\s+(\w+)/);
			if (typeMatch) {
				/**
				 * This is a type being re-exported, skip it (will be handled by type
				 * pattern).
				 */
				return null;
			}
			return trimmed;
		});

		for (const name of names) {
			if (name && /^\w+$/.test(name)) {
				addExport(name, "unknown");
			}
		}
	}

	// Extract functions.
	for (const match of extractMatches(functionPattern, content)) {
		addExport(match[1], "function");
	}
	for (const match of extractMatches(functionPattern2, content)) {
		addExport(match[1], "function");
	}

	// Extract classes.
	for (const match of extractMatches(classPattern, content)) {
		addExport(match[1], "class");
	}
	for (const match of extractMatches(classPattern2, content)) {
		addExport(match[1], "class");
	}

	// Extract const (includes React components).
	for (const match of extractMatches(constPattern, content)) {
		addExport(match[1], "const");
	}
	for (const match of extractMatches(constPattern2, content)) {
		addExport(match[1], "const");
	}

	// Also catch component-style declarations.
	for (const match of extractMatches(componentPattern, content)) {
		addExport(match[1], "const");
	}

	// Extract types (declare type).
	for (const match of extractMatches(typePattern, content)) {
		addExport(match[1], "type");
	}

	// Extract types (export type X =).
	for (const match of extractMatches(typePattern2, content)) {
		addExport(match[1], "type");
	}

	// Extract type exports (export type { X }).
	for (const match of extractMatches(typeExportPattern, content)) {
		const exportList = match[1];
		const names = exportList.split(",").map((s) => s.trim());
		for (const name of names) {
			if (name && /^\w+$/.test(name)) {
				addExport(name, "type");
			}
		}
	}

	// Extract interfaces.
	for (const match of extractMatches(interfacePattern, content)) {
		addExport(match[1], "interface");
	}

	// Extract enums.
	for (const match of extractMatches(enumPattern, content)) {
		addExport(match[1], "enum");
	}

	/**
	 * Extract named exports from export { ... } (without from - these are local
	 * exports).
	 */
	for (const match of extractMatches(namedExportPattern, content)) {
		const exportList = match[1];
		// Skip if this looks like a type export (already handled above).
		if (content.substring(match.index - 5, match.index).includes("type")) {
			continue;
		}
		const names = exportList.split(",").map((s) => {
			const trimmed = s.trim();
			const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
			if (asMatch) {
				return asMatch[2];
			}
			const typeMatch = trimmed.match(/type\s+(\w+)/);
			if (typeMatch) {
				return typeMatch[1];
			}
			return trimmed;
		});

		for (const name of names) {
			if (name && /^\w+$/.test(name)) {
				addExport(name, "unknown");
			}
		}
	}

	return exports;
}

/**
 * Get named exports from an installed package by parsing its type definitions.
 *
 * @param tmpDir - The temporary directory where the package is installed
 * @param packageName - The package name (e.g., "@mantine/core")
 * @returns ParsedExports containing the list of exports and count
 *
 */
export function getNamedExports(
	tmpDir: string,
	packageName: string,
): ParsedExports {
	const packageDir = path.join(tmpDir, "node_modules", packageName);

	const emptyResult: ParsedExports = {
		exports: [],
		count: 0,
		runtimeExports: [],
		runtimeCount: 0,
	};

	// Try to read package.json to find the types entry.
	const pkgJsonPath = path.join(packageDir, "package.json");
	if (!fs.existsSync(pkgJsonPath)) {
		return emptyResult;
	}

	let typesEntry: string | undefined;
	try {
		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

		// Look for types in order of preference.
		typesEntry =
			pkgJson.types ||
			pkgJson.typings ||
			pkgJson.exports?.["."]?.types ||
			(typeof pkgJson.exports?.["."] === "object" &&
				pkgJson.exports["."].types);

		// If no types field, try common patterns.
		if (!typesEntry) {
			const commonPaths = [
				"dist/index.d.ts",
				"lib/index.d.ts",
				"index.d.ts",
				"types/index.d.ts",
			];
			for (const tryPath of commonPaths) {
				if (fs.existsSync(path.join(packageDir, tryPath))) {
					typesEntry = tryPath;
					break;
				}
			}
		}
	} catch {
		return emptyResult;
	}

	if (!typesEntry) {
		return emptyResult;
	}

	// Read and parse the types file.
	const typesPath = path.join(packageDir, typesEntry);
	if (!fs.existsSync(typesPath)) {
		return emptyResult;
	}

	try {
		const content = fs.readFileSync(typesPath, "utf-8");
		const exports = parseDeclarationFile(typesPath, content);

		// Sort exports by name for consistent output.
		exports.sort((a, b) => a.name.localeCompare(b.name));

		// Filter to runtime-only exports (exclude types and interfaces).
		const runtimeExports = exports.filter(
			(e) => e.kind !== "type" && e.kind !== "interface",
		);

		return {
			exports,
			count: exports.length,
			runtimeExports,
			runtimeCount: runtimeExports.length,
		};
	} catch {
		return emptyResult;
	}
}
