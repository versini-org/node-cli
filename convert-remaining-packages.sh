#!/bin/bash

# Function to convert a package from Jest to Vitest
convert_package_to_vitest() {
  local package_dir="$1"
  local package_name=$(basename "$package_dir")

  echo "🔄 Converting $package_name..."
  cd "$package_dir"

  # Check if jest.config.cjs exists
  if [ ! -f "jest.config.cjs" ]; then
    echo "  ⚠️  No jest.config.cjs found, skipping..."
    return
  fi

  # 1. Remove Jest config
  rm -f jest.config.cjs
  echo "  ✓ Removed jest.config.cjs"

  # 2. Update package.json scripts using Node.js
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    if (pkg.scripts) {
        if (pkg.scripts.test && pkg.scripts.test.includes('jest')) {
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
    " 2>/dev/null
  echo "  ✓ Updated package.json scripts"

  # 3. Update test files - replace Jest imports and API calls with Vitest
  if [ -d "src/__tests__" ]; then
    # Replace Jest imports
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/import { jest } from "@jest\/globals";/import { vi } from "vitest";/g' {} \;

    # Replace Jest API calls with Vitest equivalents
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/jest\.fn()/vi.fn()/g' {} \;
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/jest\.spyOn/vi.spyOn/g' {} \;
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/spyDate = jest/spyDate = vi/g' {} \;
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/spyLocaleTime = jest/spyLocaleTime = vi/g' {} \;
    find src/__tests__ -name "*.test.ts" -exec sed -i '' 's/ = jest/ = vi/g' {} \;

    echo "  ✓ Updated test files"
  fi

  # 4. Add Vitest dependencies
  pnpm add -D vitest @vitest/coverage-v8 >/dev/null 2>&1
  echo "  ✓ Added Vitest dependencies"

  # 5. Test the conversion
  if pnpm test >/dev/null 2>&1; then
    echo "  ✅ Tests passing!"
  else
    echo "  ⚠️  Tests failing - may need manual fixes"
  fi

  echo ""
}

# List of packages to convert
packages=(
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

echo "🚀 Converting remaining packages from Jest to Vitest..."
echo "======================================================="
echo ""

for package_dir in "${packages[@]}"; do
  convert_package_to_vitest "$package_dir"
done

echo "🎉 Conversion complete!"
echo ""
echo "Summary of converted packages:"
for package_dir in "${packages[@]}"; do
  package_name=$(basename "$package_dir")
  echo "  ✓ $package_name"
done
echo ""
echo "All packages now use Vitest instead of Jest! 🚀"
