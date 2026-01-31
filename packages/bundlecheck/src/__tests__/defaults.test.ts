import { describe, expect, it } from "vitest";
import { isValidPlatform, normalizePlatform } from "../defaults.js";

describe("normalizePlatform", () => {
	describe("auto detection", () => {
		it("should return undefined for 'auto'", () => {
			expect(normalizePlatform("auto")).toBeUndefined();
		});

		it("should return undefined for 'AUTO' (case insensitive)", () => {
			expect(normalizePlatform("AUTO")).toBeUndefined();
		});

		it("should return undefined for undefined input", () => {
			expect(normalizePlatform(undefined)).toBeUndefined();
		});
	});

	describe("browser aliases", () => {
		it("should normalize 'browser' to 'browser'", () => {
			expect(normalizePlatform("browser")).toBe("browser");
		});

		it("should normalize 'web' to 'browser'", () => {
			expect(normalizePlatform("web")).toBe("browser");
		});

		it("should normalize 'desktop' to 'browser'", () => {
			expect(normalizePlatform("desktop")).toBe("browser");
		});

		it("should normalize 'client' to 'browser'", () => {
			expect(normalizePlatform("client")).toBe("browser");
		});

		it("should handle case insensitivity for browser aliases", () => {
			expect(normalizePlatform("BROWSER")).toBe("browser");
			expect(normalizePlatform("Web")).toBe("browser");
			expect(normalizePlatform("DESKTOP")).toBe("browser");
			expect(normalizePlatform("CLIENT")).toBe("browser");
		});

		it("should handle whitespace for browser aliases", () => {
			expect(normalizePlatform("  browser  ")).toBe("browser");
			expect(normalizePlatform(" web ")).toBe("browser");
		});
	});

	describe("node aliases", () => {
		it("should normalize 'node' to 'node'", () => {
			expect(normalizePlatform("node")).toBe("node");
		});

		it("should normalize 'server' to 'node'", () => {
			expect(normalizePlatform("server")).toBe("node");
		});

		it("should normalize 'nodejs' to 'node'", () => {
			expect(normalizePlatform("nodejs")).toBe("node");
		});

		it("should normalize 'backend' to 'node'", () => {
			expect(normalizePlatform("backend")).toBe("node");
		});

		it("should handle case insensitivity for node aliases", () => {
			expect(normalizePlatform("NODE")).toBe("node");
			expect(normalizePlatform("Server")).toBe("node");
			expect(normalizePlatform("NODEJS")).toBe("node");
			expect(normalizePlatform("Backend")).toBe("node");
		});

		it("should handle whitespace for node aliases", () => {
			expect(normalizePlatform("  node  ")).toBe("node");
			expect(normalizePlatform(" server ")).toBe("node");
		});
	});

	describe("invalid values", () => {
		it("should return the invalid value as-is (to be caught by validation)", () => {
			expect(normalizePlatform("invalid")).toBe("invalid");
			expect(normalizePlatform("unknown")).toBe("unknown");
		});
	});
});

describe("isValidPlatform", () => {
	describe("valid values", () => {
		it("should accept undefined", () => {
			expect(isValidPlatform(undefined)).toBe(true);
		});

		it("should accept 'auto'", () => {
			expect(isValidPlatform("auto")).toBe(true);
		});

		it("should accept browser aliases", () => {
			expect(isValidPlatform("browser")).toBe(true);
			expect(isValidPlatform("web")).toBe(true);
			expect(isValidPlatform("desktop")).toBe(true);
			expect(isValidPlatform("client")).toBe(true);
		});

		it("should accept node aliases", () => {
			expect(isValidPlatform("node")).toBe(true);
			expect(isValidPlatform("server")).toBe(true);
			expect(isValidPlatform("nodejs")).toBe(true);
			expect(isValidPlatform("backend")).toBe(true);
		});

		it("should be case insensitive", () => {
			expect(isValidPlatform("BROWSER")).toBe(true);
			expect(isValidPlatform("Node")).toBe(true);
			expect(isValidPlatform("AUTO")).toBe(true);
		});

		it("should handle whitespace", () => {
			expect(isValidPlatform("  browser  ")).toBe(true);
			expect(isValidPlatform(" node ")).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject invalid platform names", () => {
			expect(isValidPlatform("invalid")).toBe(false);
			expect(isValidPlatform("neutral")).toBe(false);
			expect(isValidPlatform("windows")).toBe(false);
			expect(isValidPlatform("linux")).toBe(false);
		});

		it("should reject empty string", () => {
			expect(isValidPlatform("")).toBe(false);
		});

		it("should reject misspellings", () => {
			expect(isValidPlatform("browsr")).toBe(false); // cSpell:ignore browsr
			expect(isValidPlatform("nod")).toBe(false);
		});
	});
});
