#!/bin/bash
# =============================================================================
# OCR Snipping & Summarization Application - Start Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "=============================================="
echo "  OCR Snipping & Summarization Application"
echo "=============================================="
echo -e "${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "  Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_status "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    print_status "Docker Compose is installed"
}

# Parse command line arguments
MODE="prod"
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --stop)
            STOP=true
            shift
            ;;
        --logs)
            LOGS=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev     Start in development mode with hot reloading"
            echo "  --build   Force rebuild of Docker images"
            echo "  --stop    Stop all running containers"
            echo "  --logs    Show container logs"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh              # Start production server"
            echo "  ./start.sh --dev        # Start development server"
            echo "  ./start.sh --build      # Rebuild and start"
            echo "  ./start.sh --stop       # Stop all containers"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check prerequisites
check_docker
check_docker_compose

# Handle stop command
if [ "$STOP" = true ]; then
    echo ""
    print_status "Stopping containers..."
    docker-compose down
    print_status "All containers stopped"
    exit 0
fi

# Handle logs command
if [ "$LOGS" = true ]; then
    echo ""
    print_status "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
    exit 0
fi

# Build and start
echo ""
if [ "$MODE" = "dev" ]; then
    print_status "Starting in DEVELOPMENT mode..."

    if [ "$BUILD" = true ]; then
        docker-compose --profile dev build frontend-dev
    fi

    docker-compose --profile dev up frontend-dev
else
    print_status "Starting in PRODUCTION mode..."

    if [ "$BUILD" = true ]; then
        print_status "Building Docker image..."
        docker-compose build frontend
    fi

    print_status "Starting containers..."
    docker-compose up -d frontend

    echo ""
    print_status "Application is starting..."
    echo ""

    # Wait for container to be healthy
    echo -n "  Waiting for application to be ready"
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo ""
            break
        fi
        echo -n "."
        sleep 1
    done

    echo ""
    echo -e "${GREEN}=============================================="
    echo "  Application is running!"
    echo "=============================================="
    echo -e "${NC}"
    echo "  URL:    http://localhost:3000"
    echo ""
    echo "  Commands:"
    echo "    ./start.sh --logs    View logs"
    echo "    ./start.sh --stop    Stop application"
    echo ""
fi
