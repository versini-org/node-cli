/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: [
				"node_modules/",
				"dist/",
				"coverage/",
				"**/*.d.ts",
				"**/*.config.*",
				"src/__tests__/**",
				// Exclude CLI bootstrap / flag definition files (no logic worth testing)
				"src/bundlesize.ts",
				"src/parse.ts",
				"src/defaults.ts",
			],
			thresholds: {
				branches: 95,
				functions: 98,
				lines: 98,
				statements: 98,
			},
		},
		include: ["src/**/__tests__/**/*.test.ts"],
	},
});
