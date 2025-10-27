#!/bin/bash
if [ ! -d "node_modules" ]; then
  echo "Node modules not found, installing dependencies..."
  npm install
fi
npm run dev