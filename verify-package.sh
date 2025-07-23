#!/bin/bash

# D1 ORM Package Verification Script
echo "🚀 Verifying D1 ORM Package..."

# Check package.json
echo "✅ Checking package.json..."
if [ -f "package.json" ]; then
    echo "   Package name: $(jq -r '.name' package.json)"
    echo "   Version: $(jq -r '.version' package.json)"
    echo "   Main entry: $(jq -r '.main' package.json)"
    echo "   Types entry: $(jq -r '.types' package.json)"
else
    echo "❌ package.json not found"
    exit 1
fi

# Check source structure
echo "✅ Checking source structure..."
[ -d "src" ] && echo "   ✓ src/ directory exists" || echo "   ❌ src/ directory missing"
[ -d "src/orm" ] && echo "   ✓ src/orm/ directory exists" || echo "   ❌ src/orm/ directory missing"
[ -d "src/classes" ] && echo "   ✓ src/classes/ directory exists" || echo "   ❌ src/classes/ directory missing"
[ -f "src/index.ts" ] && echo "   ✓ src/index.ts exists" || echo "   ❌ src/index.ts missing"

# Check build output
echo "✅ Checking build output..."
[ -d "dist" ] && echo "   ✓ dist/ directory exists" || echo "   ❌ dist/ directory missing"
[ -f "dist/index.js" ] && echo "   ✓ dist/index.js exists" || echo "   ❌ dist/index.js missing"
[ -f "dist/index.d.ts" ] && echo "   ✓ dist/index.d.ts exists" || echo "   ❌ dist/index.d.ts missing"

# Check examples
echo "✅ Checking examples..."
[ -d "examples" ] && echo "   ✓ examples/ directory exists" || echo "   ❌ examples/ directory missing"
[ -f "examples/simple-orm-example.ts" ] && echo "   ✓ simple example exists" || echo "   ❌ simple example missing"
[ -f "examples/advanced-models.ts" ] && echo "   ✓ advanced example exists" || echo "   ❌ advanced example missing"
[ -f "examples/relationships-example.ts" ] && echo "   ✓ relationships example exists" || echo "   ❌ relationships example missing"

# Check documentation
echo "✅ Checking documentation..."
[ -f "README.md" ] && echo "   ✓ README.md exists" || echo "   ❌ README.md missing"
[ -f "LICENSE" ] && echo "   ✓ LICENSE exists" || echo "   ❌ LICENSE missing"
[ -f "CONTRIBUTING.md" ] && echo "   ✓ CONTRIBUTING.md exists" || echo "   ❌ CONTRIBUTING.md missing"

# Check configuration files
echo "✅ Checking configuration..."
[ -f "tsconfig.json" ] && echo "   ✓ tsconfig.json exists" || echo "   ❌ tsconfig.json missing"
[ -f ".gitignore" ] && echo "   ✓ .gitignore exists" || echo "   ❌ .gitignore missing"
[ -f ".npmignore" ] && echo "   ✓ .npmignore exists" || echo "   ❌ .npmignore missing"
[ -f ".env.example" ] && echo "   ✓ .env.example exists" || echo "   ❌ .env.example missing"

# Check CI/CD
echo "✅ Checking CI/CD..."
[ -f ".github/workflows/ci.yml" ] && echo "   ✓ GitHub Actions workflow exists" || echo "   ❌ GitHub Actions workflow missing"

echo ""
echo "🎉 D1 ORM package verification complete!"
echo ""
echo "📦 Package is ready for:"
echo "   • npm publish"
echo "   • GitHub repository"
echo "   • Public distribution"
echo ""
echo "🚀 Next steps:"
echo "   1. Test the package: npm run example:simple"
echo "   2. Create GitHub repository"
echo "   3. Push to GitHub"
echo "   4. Publish to npm: npm publish"
