#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Lint ==="
ruff check src/ tests/

echo "=== Format ==="
ruff format --check src/ tests/

echo "=== Type Check ==="
mypy src/

echo "=== Tests + Coverage ==="
pytest --cov=upp --cov-report=term-missing --cov-fail-under=100
