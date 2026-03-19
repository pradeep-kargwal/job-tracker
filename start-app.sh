#!/bin/bash

# Job Application Tracker - Start Script
# Double-click this file or run: ./start-app.sh

echo "🚀 Starting Job Application Tracker..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   (the folder containing backend/ and frontend/)"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if .env exists for backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}📝 Creating backend .env file...${NC}"
    cp backend/.env.example backend/.env
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Generate Prisma client if needed
if [ ! -d "backend/node_modules/.prisma" ]; then
    echo -e "${YELLOW}🗄️ Setting up database...${NC}"
    cd backend && npx prisma generate && npx prisma db push && cd ..
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Starting servers..."
echo "   Backend: http://localhost:5001"
echo "   Frontend: http://localhost:3000"
echo ""

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &

echo ""
echo "✅ App is running!"
echo "   Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop the servers"

# Wait for user to press Ctrl+C
wait
