#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Lint ==="
npx eslint src/ tests/

echo "=== Format ==="
npx prettier --check "src/**/*.ts" "tests/**/*.ts"

echo "=== Type Check ==="
npx tsc --noEmit

echo "=== Tests + Coverage ==="
npx vitest run --coverage
