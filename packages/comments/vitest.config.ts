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
			],
			thresholds: {
				branches: 80,
				functions: 90,
				lines: 90,
				statements: 90,
			},
		},
		include: ["src/**/__tests__/**/*.test.ts"],
	},
});
