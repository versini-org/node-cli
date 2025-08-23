/* v8 ignore start */
import { basename, dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import fs from "fs-extra";
import micromatch from "micromatch";

const readFileAsync = promisify(fs.readFile);

/**
 * Represents a pattern from a .gitignore file.
 */
interface GitIgnorePattern {
	/**
	 * The actual pattern string.
	 */
	pattern: string;
	/**
	 * Whether this is a negated pattern (starts with !)
	 */
	isNegated: boolean;
	/**
	 * Whether this pattern is specific to directories (ends with /).
	 */
	isDirectory: boolean;
}

/**
 * Handles parsing and matching of .gitignore patterns.
 */
export class GitIgnoreHandler {
	/**
	 * Map to store ignore patterns by directory.
	 */
	private ignorePatterns: Map<string, GitIgnorePattern[]>;
	/**
	 * Cache to store already processed paths.
	 */
	private ignoredPathsCache: Map<string, boolean>;

	constructor() {
		this.ignorePatterns = new Map<string, GitIgnorePattern[]>();
		this.ignoredPathsCache = new Map<string, boolean>();
	}

	/**
	 * Parse a .gitignore file and return the patterns.
	 * @param filePath Path to the .gitignore file
	 * @returns Array of parsed patterns
	 */
	async parseGitIgnoreFile(filePath: string): Promise<GitIgnorePattern[]> {
		try {
			const content = await readFileAsync(filePath, "utf8");
			return content
				.split("\n")
				.filter((line) => {
					// Remove comments and empty lines.
					const trimmedLine = line.trim();
					return trimmedLine && !trimmedLine.startsWith("#");
				})
				.map((pattern) => {
					// Handle negated patterns (those starting with !)
					const isNegated = pattern.startsWith("!");
					// Remove leading ! for negated patterns.
					const cleanPattern = isNegated ? pattern.slice(1) : pattern;
					// Handle directory-specific patterns (those ending with /).
					const isDirectory = cleanPattern.endsWith("/");
					// Remove trailing / for directory patterns.
					const finalPattern = isDirectory
						? cleanPattern.slice(0, -1)
						: cleanPattern;

					return {
						pattern: finalPattern,
						isNegated,
						isDirectory,
					};
				});
		} catch (_error) {
			// If file doesn't exist or can't be read, return empty array.
			return [];
		}
	}

	/**
	 * Load .gitignore files from a directory and its parents.
	 * @param directory Directory to load .gitignore from
	 */
	async loadGitIgnorePatterns(directory: string): Promise<void> {
		// If we've already loaded patterns for this directory, return.
		if (this.ignorePatterns.has(directory)) {
			return;
		}

		// Load .gitignore from current directory.
		const gitIgnorePath = join(directory, ".gitignore");
		const patterns = await this.parseGitIgnoreFile(gitIgnorePath);
		this.ignorePatterns.set(directory, patterns);

		// Load patterns from parent directories (if not at root).
		const parentDir = dirname(directory);
		if (parentDir !== directory) {
			await this.loadGitIgnorePatterns(parentDir);
		}
	}

	/**
	 * Check if a path should be ignored based on .gitignore rules.
	 * @param path Path to check
	 * @param isDirectory Whether the path is a directory
	 * @returns True if the path should be ignored, false otherwise
	 */
	async isIgnored(
		path: string,
		isDirectory: boolean = false,
	): Promise<boolean> {
		// Check cache first.
		const cacheKey = `${path}:${isDirectory}`;
		if (this.ignoredPathsCache.has(cacheKey)) {
			return this.ignoredPathsCache.get(cacheKey)!;
		}

		// Get the directory containing the path.
		const directory = isDirectory ? path : dirname(path);

		// Load .gitignore patterns if not already loaded.
		await this.loadGitIgnorePatterns(directory);

		// Get the relative path from the containing directory.
		const filename = basename(path);

		// Start with not ignored.
		let ignored = false;

		// Check patterns from current directory up to root.
		let currentDir = directory;
		while (true) {
			const patterns = this.ignorePatterns.get(currentDir) || [];

			// Calculate relative path from this directory to the file.
			const relPath = relative(currentDir, path);

			for (const {
				pattern,
				isNegated,
				isDirectory: isPatternForDir,
			} of patterns) {
				// Skip directory-specific patterns if checking a file.
				if (isPatternForDir && !isDirectory) {
					continue;
				}

				// Check if pattern matches.
				const matches =
					micromatch.isMatch(relPath, pattern) ||
					micromatch.isMatch(filename, pattern);

				if (matches) {
					// Negated patterns override previous ignores.
					ignored = !isNegated;
				}
			}

			// Move to parent directory.
			const parentDir = dirname(currentDir);
			if (parentDir === currentDir) {
				break; // We've reached the root
			}
			currentDir = parentDir;
		}

		// Cache the result.
		this.ignoredPathsCache.set(cacheKey, ignored);
		return ignored;
	}

	/**
	 * Clear the cache of ignored paths.
	 */
	clearCache(): void {
		this.ignoredPathsCache.clear();
	}
}
/* v8 ignore stop */
