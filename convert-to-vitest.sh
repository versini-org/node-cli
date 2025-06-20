#!/bin/bash

# Function to convert a single package from Jest to Vitest
convert_package() {
  local package_dir="$1"
  local package_name=$(basename "$package_dir")

  echo "Converting package: $package_name"
  cd "$package_dir"

  # 1. Remove Jest config file
  if [ -f "jest.config.cjs" ]; then
    rm jest.config.cjs
    echo "  ✓ Removed jest.config.cjs"
  fi

  # 2. Create Vitest config
  cat >vitest.config.ts <<'EOF'
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
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
		include: ["src/**/__tests__/**/*.test.ts"],
	},
});
EOF
  echo "  ✓ Created vitest.config.ts"

  # 3. Update package.json scripts
  # Use Node.js to update the JSON properly
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Update test scripts
    if (pkg.scripts) {
        if (pkg.scripts.test) {
            pkg.scripts.test = 'vitest run --globals';
        }
        if (pkg.scripts['test:coverage']) {
            pkg.scripts['test:coverage'] = 'vitest run --coverage --globals';
        }
        if (pkg.scripts['test:watch']) {
            pkg.scripts['test:watch'] = 'vitest --globals';
        }
    }

    fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
    "
  echo "  ✓ Updated package.json scripts"

  # 4. Add Vitest dependencies
  pnpm add -D vitest @vitest/coverage-v8 >/dev/null 2>&1
  echo "  ✓ Added Vitest dependencies"

  echo "  ✓ Conversion complete for $package_name"
  echo ""
}

# Convert all packages
packages=(
  "/Users/aversin/projects/perso/node-cli/packages/logger"
  "/Users/aversin/projects/perso/node-cli/packages/npmrc"
  "/Users/aversin/projects/perso/node-cli/packages/parser"
  "/Users/aversin/projects/perso/node-cli/packages/perf"
  "/Users/aversin/projects/perso/node-cli/packages/run"
  "/Users/aversin/projects/perso/node-cli/packages/search"
  "/Users/aversin/projects/perso/node-cli/packages/secret"
  "/Users/aversin/projects/perso/node-cli/packages/static-server"
  "/Users/aversin/projects/perso/node-cli/packages/timer"
  "/Users/aversin/projects/perso/node-cli/packages/utilities"
)

echo "Starting Jest to Vitest conversion for all packages..."
echo "=================================================="
echo ""

for package_dir in "${packages[@]}"; do
  convert_package "$package_dir"
done

echo "All packages converted successfully! 🎉"
echo ""
echo "Summary:"
echo "- Converted 10 packages from Jest to Vitest"
echo "- Added vitest.config.ts to each package"
echo "- Updated package.json scripts"
echo "- Added Vitest dependencies"
echo ""
echo "You can now run tests in any package with:"
echo "  pnpm test"
echo "  pnpm test:coverage"
echo "  pnpm test:watch"
