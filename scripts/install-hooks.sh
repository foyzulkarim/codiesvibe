#!/bin/bash
# Install git hooks for the team
# Run this once after cloning the repository

echo "Installing git hooks..."

# Copy pre-commit hook
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit.backup 2>/dev/null || true

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

# Pre-commit hook to run linting before allowing commits
# This will prevent commits with lint errors

echo "Running pre-commit lint checks..."

# Store the root directory
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

# Check if we're in the root of the monorepo
if [ -f "package.json" ] && [ -d "backend" ]; then
    echo "Running frontend linting..."
    if ! npm run lint --silent; then
        echo "❌ Frontend linting failed. Please fix lint errors before committing."
        echo "Run 'npm run lint' to see and fix the errors."
        exit 1
    fi

    echo "Running backend linting..."
    cd backend
    if ! npm run lint --silent; then
        echo "❌ Backend linting failed. Please fix lint errors before committing."
        echo "Run 'cd backend && npm run lint' to see and fix the errors."
        exit 1
    fi
    cd "$ROOT_DIR"

    echo "✅ All lint checks passed!"
else
    # Fallback for single project structure
    if [ -f "package.json" ]; then
        echo "Running linting..."
        if ! npm run lint --silent; then
            echo "❌ Linting failed. Please fix lint errors before committing."
            echo "Run 'npm run lint' to see and fix the errors."
            exit 1
        fi
        echo "✅ Lint checks passed!"
    else
        echo "⚠️  No package.json found, skipping lint checks"
    fi
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo "Pre-commit hook will now run linting before each commit."