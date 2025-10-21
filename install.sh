#!/bin/bash

echo "🎨 Installing Instagram Image Editor..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 To start the development server:"
    echo "   npm start"
    echo ""
    echo "🏗️  To build for production:"
    echo "   npm run build"
    echo ""
    echo "📱 Open http://localhost:3000 in your browser"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

