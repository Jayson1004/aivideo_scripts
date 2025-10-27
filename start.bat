@echo off
IF NOT EXIST "node_modules" (
  echo "Node modules not found, installing dependencies..."
  npm install
)
npm run dev