import { v4 as uuidv4 } from "uuid";
import { getFileExtension } from "./utilities.js";

export function minifyImports(content: string): string {
	return content.replace(
		/(import\s*\{)([^}]*?)(\}\s*from)/g,
		(_match, _importStart, importItems, _importEnd) => {
			// Process the items being imported.
			const cleanedItems = importItems
				.split(",")
				.map((item) => {
					// Handle 'type' keyword specifically.
					return item.trim().replace(/(\btype\b)\s+/, "$1");
				})
				.join(",");

			return `import {${cleanedItems}} from`;
		},
	);
}

export function minifyJs(content: string): string {
	// Store template literals and regular expressions to protect them from
	// minification.
	const tokenPrefix = `__PROTECTED_${uuidv4()}_`;
	const protectedSegments: string[] = [];

	// Function to create a unique token for each protected segment.
	const createToken = (index: number) => `${tokenPrefix}${index}__`;

	// Function to protect a segment of code with a custom handler.
	const protect = (pattern: RegExp, handler?: (match: string) => boolean) => {
		content = content.replace(pattern, (match) => {
			// If a handler is provided, use it to determine if we should protect this
			// match.
			if (handler && !handler(match)) {
				return ""; // Return empty string for JSDoc comments we don't want to keep
			}
			const index = protectedSegments.length;
			protectedSegments.push(match);
			return createToken(index);
		});
	};

	// Protect template literals.
	protect(/`[\s\S]*?`/g);

	/**
	 * Protect regular expressions This regex pattern matches JavaScript regular
	 * expressions while avoiding division operators.
	 */
	protect(
		/(?<![a-zA-Z0-9_$])\/(?![*+?\/])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/[gimyus]*/g,
	);

	// Protect important JSDoc comments.
	protect(/\/\*\*[\s\S]*?\*\//g, (match) => {
		return (
			match.includes("@param") ||
			match.includes("@returns") ||
			match.includes("@description")
		);
	});

	// Remove comments (both single-line and multi-line).
	content = content.replace(/\/\/.*$/gm, ""); // Remove single-line comments
	content = content.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

	// Compact import statements.
	content = minifyImports(content);

	// Remove extra whitespace.
	content = content.replace(/^\s+/gm, ""); // Remove leading whitespace
	content = content.replace(/\s+$/gm, ""); // Remove trailing whitespace
	content = content.replace(/\s{2,}/g, " "); // Replace multiple spaces with a single space

	// Compact newlines ( we protected template literals before).
	content = content.replace(/\n+/g, " ");

	// Replace semicolon + space with just semicolon.
	content = content.replace(/;\s+/g, ";");

	// Replace colon + space with just colon.
	content = content.replace(/,\s+/g, ",");

	// Remove spaces around operators (we protected regex operators before).
	content = content.replace(/\s+([+\-*/%=&|<>!?:;,])\s+/g, "$1");

	// Handle spaces around parentheses and brackets.
	content = content.replace(/\(\s+/g, "(");
	content = content.replace(/\s+\)/g, ")");
	content = content.replace(/\[\s+/g, "[");
	content = content.replace(/\s+\]/g, "]");

	// Handle spaces in all curly braces (for object literals, destructuring, etc.)
	content = content.replace(/\{\s+/g, "{");
	content = content.replace(/\s+\}/g, "}");

	/**
	 * Restore protected segments We need to handle nested tokens, so we'll iterate
	 * until all tokens are replaced.
	 */
	let previousContent = "";
	while (previousContent !== content) {
		previousContent = content;
		// Sort indices in descending order to handle nested tokens correctly.
		const indices = Array.from(
			{ length: protectedSegments.length },
			(_, i) => i,
		).sort((a, b) => b - a);
		for (const index of indices) {
			const token = createToken(index);
			const segment = protectedSegments[index];
			// Use global replacement to catch all instances.
			const tokenRegex = new RegExp(
				token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
				"g",
			);
			content = content.replace(tokenRegex, () => segment);
		}
	}
	return content;
}

export function minifyCss(content: string): string {
	// Remove CSS comments.
	content = content.replace(/\/\*[\s\S]*?\*\//g, "");

	// Remove extra whitespace.
	content = content.replace(/\s+/g, " ");
	content = content.replace(/\s*{\s*/g, "{");
	content = content.replace(/\s*}\s*/g, "}");
	content = content.replace(/\s*:\s*/g, ":");
	content = content.replace(/\s*;\s*/g, ";");
	content = content.replace(/\s*,\s*/g, ",");

	return content;
}

export async function minifyFileContent(
	filePath: string,
	content: string,
): Promise<string> {
	if (!content || content.length < 100) {
		return content;
	}

	const fileExtension = getFileExtension(filePath);

	if (
		content &&
		content.length > 0 &&
		(fileExtension.endsWith("js") ||
			fileExtension.endsWith("ts") ||
			/* v8 ignore next */
			fileExtension.endsWith("jsx") ||
			/* v8 ignore next */
			fileExtension.endsWith("tsx"))
	) {
		return minifyJs(content);
	}

	/* v8 ignore next */
	if (content && content.length > 0 && fileExtension.endsWith("css")) {
		return minifyCss(content);
	}

	return content;
}
