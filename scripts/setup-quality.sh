#!/bin/bash

# Setup script for code quality tools
echo "🚀 Setting up Code Quality Tools..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup Husky
echo "🐶 Setting up Husky git hooks..."
npm run prepare

# Run initial format
echo "✨ Formatting codebase..."
npm run format

# Run lint check
echo "🔍 Running lint check..."
npm run lint

# Type check
echo "📝 Type checking..."
npm run type-check

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Available commands:"
echo "  npm run lint          - Check for linting issues"
echo "  npm run lint:fix      - Fix linting issues"
echo "  npm run format        - Format all files"
echo "  npm run format:check  - Check formatting"
echo "  npm run type-check    - Type check all workspaces"
echo ""
echo "🎯 Git hooks configured:"
echo "  pre-commit  - Lint and format staged files"
echo "  pre-push    - Type check before push"
echo ""
