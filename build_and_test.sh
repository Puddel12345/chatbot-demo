#!/bin/bash
# Build and test Docker deployment

echo "=================================="
echo "Docker Build & Test Script"
echo "=================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "Please edit .env and add your ANTHROPIC_API_KEY"
    echo "Then run this script again."
    exit 1
fi

# Check if API key is set in .env
if ! grep -q "ANTHROPIC_API_KEY=sk-" .env; then
    echo "⚠️  ANTHROPIC_API_KEY not set in .env file!"
    echo "Please add your API key to the .env file."
    exit 1
fi

echo "✓ .env file found with API key"

# Stop any running containers
echo ""
echo "Stopping any existing containers..."
docker-compose down

# Build and start container
echo ""
echo "Building Docker image..."
docker-compose build

echo ""
echo "Starting container..."
docker-compose up -d

# Wait for container to be ready
echo ""
echo "Waiting for server to start..."
sleep 5

# Run tests
echo ""
echo "Running tests..."
python test_docker.py

# Show logs
echo ""
echo "Container logs:"
echo "=================================="
docker-compose logs --tail=20

echo ""
echo "=================================="
echo "Container is running in background."
echo ""
echo "Commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop server:  docker-compose down"
echo "  Restart:      docker-compose restart"
echo "=================================="