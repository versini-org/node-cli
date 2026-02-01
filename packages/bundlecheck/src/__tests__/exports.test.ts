import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNamedExports } from "../exports.js";

// Mock the fs module
vi.mock("node:fs");

describe("getNamedExports", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return empty result when package.json does not exist", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result).toEqual({
			exports: [],
			count: 0,
			runtimeExports: [],
			runtimeCount: 0,
		});
	});

	it("should return empty result when types entry is not found", () => {
		vi.mocked(fs.existsSync).mockImplementation((p) => {
			const pathStr = String(p);
			return pathStr.endsWith("package.json");
		});
		vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result).toEqual({
			exports: [],
			count: 0,
			runtimeExports: [],
			runtimeCount: 0,
		});
	});

	it("should return empty result when types file does not exist", () => {
		vi.mocked(fs.existsSync).mockImplementation((p) => {
			const pathStr = String(p);
			// package.json exists, but types file doesn't
			return pathStr.endsWith("package.json");
		});
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify({
				types: "dist/index.d.ts",
			}),
		);

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result).toEqual({
			exports: [],
			count: 0,
			runtimeExports: [],
			runtimeCount: 0,
		});
	});

	it("should parse exported functions", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare function myFunction(): void;
export declare function anotherFunction(arg: string): number;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "anotherFunction",
			kind: "function",
		});
		expect(result.exports).toContainEqual({
			name: "myFunction",
			kind: "function",
		});
		expect(result.count).toBe(2);
		expect(result.runtimeCount).toBe(2);
	});

	it("should parse exported classes", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare class MyClass {}
export class AnotherClass {}
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "AnotherClass",
			kind: "class",
		});
		expect(result.exports).toContainEqual({ name: "MyClass", kind: "class" });
		expect(result.count).toBe(2);
	});

	it("should parse exported constants", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare const MY_CONST: string;
export const ANOTHER_CONST = 42;
export declare const Button: React.FC<ButtonProps>;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "ANOTHER_CONST",
			kind: "const",
		});
		expect(result.exports).toContainEqual({ name: "Button", kind: "const" });
		expect(result.exports).toContainEqual({ name: "MY_CONST", kind: "const" });
	});

	it("should parse exported types and interfaces", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare type MyType = string;
export type AnotherType = number;
export type GenericType<T> = T[];
export interface MyInterface {}
export declare interface AnotherInterface {}
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "AnotherInterface",
			kind: "interface",
		});
		expect(result.exports).toContainEqual({
			name: "AnotherType",
			kind: "type",
		});
		expect(result.exports).toContainEqual({
			name: "GenericType",
			kind: "type",
		});
		expect(result.exports).toContainEqual({
			name: "MyInterface",
			kind: "interface",
		});
		expect(result.exports).toContainEqual({ name: "MyType", kind: "type" });
		// Types and interfaces should NOT be in runtimeExports
		expect(result.runtimeExports).toEqual([]);
		expect(result.runtimeCount).toBe(0);
	});

	it("should parse exported enums", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare enum MyEnum { A, B, C }
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "MyEnum", kind: "enum" });
		expect(result.runtimeCount).toBe(1);
	});

	it("should parse named exports with local re-exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export { foo, bar };
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "bar", kind: "unknown" });
		expect(result.exports).toContainEqual({ name: "foo", kind: "unknown" });
	});

	it("should parse export type syntax", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export type { MyType, AnotherType };
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "AnotherType",
			kind: "type",
		});
		expect(result.exports).toContainEqual({ name: "MyType", kind: "type" });
	});

	it("should handle type re-exports from other modules", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export type { SomeType } from './types';
export { SomeValue } from './values';
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "SomeType", kind: "type" });
		expect(result.exports).toContainEqual({
			name: "SomeValue",
			kind: "unknown",
		});
	});

	it("should handle aliased exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export { original as aliased } from './module';
export type { OrigType as AliasType } from './types';
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "AliasType", kind: "type" });
		expect(result.exports).toContainEqual({ name: "aliased", kind: "unknown" });
	});

	it("should skip private/internal exports starting with underscore", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare function publicFn(): void;
export declare function _privateFn(): void;
export declare const _internalConst: string;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toHaveLength(1);
		expect(result.exports).toContainEqual({
			name: "publicFn",
			kind: "function",
		});
	});

	it("should skip default exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export { default } from './module';
export declare function namedExport(): void;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toHaveLength(1);
		expect(result.exports).toContainEqual({
			name: "namedExport",
			kind: "function",
		});
	});

	it("should handle typings field in package.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ typings: "types/index.d.ts" });
			}
			return `export declare function foo(): void;`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "foo", kind: "function" });
	});

	it("should handle exports field types in package.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({
					exports: {
						".": {
							types: "dist/index.d.ts",
						},
					},
				});
			}
			return `export declare function bar(): void;`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "bar", kind: "function" });
	});

	it("should try common type file paths when no types field exists", () => {
		vi.mocked(fs.existsSync).mockImplementation((p) => {
			const pathStr = String(p);
			return (
				pathStr.endsWith("package.json") || pathStr.endsWith("dist/index.d.ts")
			);
		});
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({});
			}
			return `export declare function fromCommonPath(): void;`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "fromCommonPath",
			kind: "function",
		});
	});

	it("should handle JSON parse errors gracefully", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return "invalid json {{{";
			}
			return "";
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result).toEqual({
			exports: [],
			count: 0,
			runtimeExports: [],
			runtimeCount: 0,
		});
	});

	it("should handle type file read errors gracefully", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			throw new Error("Read error");
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result).toEqual({
			exports: [],
			count: 0,
			runtimeExports: [],
			runtimeCount: 0,
		});
	});

	it("should follow re-exports from other files", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as fs.Stats);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			if (pathStr.endsWith("index.d.ts")) {
				return `export * from './utils';`;
			}
			if (pathStr.includes("utils")) {
				return `export declare function utilFn(): void;`;
			}
			return "";
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "utilFn", kind: "function" });
	});

	it("should not follow non-relative imports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export * from 'external-package';
export declare function localFn(): void;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		// Should only have the local export, not try to follow external package
		expect(result.exports).toHaveLength(1);
		expect(result.exports).toContainEqual({
			name: "localFn",
			kind: "function",
		});
	});

	it("should handle .js extension in imports (TypeScript convention)", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as fs.Stats);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			if (pathStr.endsWith("index.d.ts")) {
				return `export * from './helper.js';`;
			}
			if (pathStr.includes("helper")) {
				return `export declare function helperFn(): void;`;
			}
			return "";
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "helperFn",
			kind: "function",
		});
	});

	it("should avoid circular imports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as fs.Stats);

		let callCount = 0;
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			callCount++;
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			if (pathStr.endsWith("index.d.ts")) {
				return `
export * from './a';
export declare function indexFn(): void;
`;
			}
			if (pathStr.includes("/a")) {
				return `
export * from './b';
export declare function aFn(): void;
`;
			}
			if (pathStr.includes("/b")) {
				return `
export * from './a';
export declare function bFn(): void;
`;
			}
			return "";
		});

		const result = getNamedExports("/tmp/test", "test-package");

		// Should not infinitely loop
		expect(result.exports.length).toBeGreaterThan(0);
		expect(callCount).toBeLessThan(20); // Sanity check for no infinite loop
	});

	it("should handle local aliased exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export { internalName as publicName };
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({
			name: "publicName",
			kind: "unknown",
		});
		expect(result.exports).not.toContainEqual(
			expect.objectContaining({ name: "internalName" }),
		);
	});

	it("should handle type keyword in named exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export { type MyType, MyValue };
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports).toContainEqual({ name: "MyType", kind: "unknown" });
		expect(result.exports).toContainEqual({ name: "MyValue", kind: "unknown" });
	});

	it("should sort exports alphabetically", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare function zebra(): void;
export declare function apple(): void;
export declare function mango(): void;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		expect(result.exports.map((e) => e.name)).toEqual([
			"apple",
			"mango",
			"zebra",
		]);
	});

	it("should deduplicate exports", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.endsWith("package.json")) {
				return JSON.stringify({ types: "index.d.ts" });
			}
			return `
export declare function foo(): void;
export { foo };
export declare const foo: () => void;
`;
		});

		const result = getNamedExports("/tmp/test", "test-package");

		// Should only have one foo entry
		const fooExports = result.exports.filter((e) => e.name === "foo");
		expect(fooExports).toHaveLength(1);
	});
});
