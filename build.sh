#!/bin/bash
echo "🔧 Starting build process..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies and build frontend
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install

echo "🏗️ Building React frontend..."
npm run build

echo "✅ Build complete!"
cd .. 