#!/bin/bash
# CodiesVibe Infrastructure Management Script
# Provides easy commands to manage infrastructure services (MongoDB, Redis, Prometheus, Grafana, Loki)

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Infrastructure services configuration
COMPOSE_FILE="docker-compose.infra.yml"
NETWORK_NAME="codiesvibe-network"

# Function to check if docker-compose file exists
check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "$COMPOSE_FILE not found!"
        exit 1
    fi
}

# Function to start infrastructure services
start_infra() {
    print_status "🚀 Starting CodiesVibe infrastructure services..."
    check_compose_file

    docker-compose -f "$COMPOSE_FILE" up -d

    print_status "⏳ Waiting for services to initialize..."
    sleep 15

    print_status "🔍 Checking service health..."

    # Check if services are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_success "✅ Infrastructure services started successfully!"

        print_status "📊 Available services:"
        print_status "  🍃 MongoDB: localhost:27017 (admin/password123)"
        print_status "  🗃️  Mongo Express UI: http://localhost:8081"
        print_status "  📈 Prometheus: http://localhost:9090"
        print_status "  📊 Grafana: http://localhost:3001 (admin/admin123)"
        print_status "  📝 Loki: http://localhost:3100"
        print_status "  🔴 Redis: localhost:6379 (password: redis123)"
    else
        print_error "Some services failed to start. Check logs with: $0 logs"
        exit 1
    fi
}

# Function to stop infrastructure services
stop_infra() {
    print_status "🛑 Stopping CodiesVibe infrastructure services..."
    check_compose_file

    docker-compose -f "$COMPOSE_FILE" down
    print_success "✅ Infrastructure services stopped successfully!"
}

# Function to restart infrastructure services
restart_infra() {
    print_status "🔄 Restarting CodiesVibe infrastructure services..."
    stop_infra
    sleep 3
    start_infra
}

# Function to show infrastructure status
status_infra() {
    print_status "📋 CodiesVibe infrastructure status:"
    check_compose_file

    if docker network ls | grep -q "$NETWORK_NAME"; then
        print_success "Network '$NETWORK_NAME' exists"
    else
        print_warning "Network '$NETWORK_NAME' not found"
    fi

    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
}

# Function to show infrastructure logs
logs_infra() {
    print_status "📝 CodiesVibe infrastructure logs:"
    check_compose_file

    if [ "$2" != "" ]; then
        # Show logs for specific service
        docker-compose -f "$COMPOSE_FILE" logs -f "$2"
    else
        # Show logs for all services
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Function to show help
show_help() {
    echo "🏗️  CodiesVibe Infrastructure Management"
    echo ""
    echo "Usage: $0 <command> [service]"
    echo ""
    echo "Commands:"
    echo "  start    - Start all infrastructure services"
    echo "  stop     - Stop all infrastructure services"
    echo "  restart  - Restart all infrastructure services"
    echo "  status   - Show status of infrastructure services"
    echo "  logs     - Show logs for all services (or specific service)"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start all infrastructure"
    echo "  $0 logs mongodb          # Show MongoDB logs"
    echo "  $0 status                # Check service status"
    echo ""
    echo "Services: mongodb, redis, prometheus, grafana, loki"
}

# Main command handling
case "$1" in
    start)
        start_infra
        ;;
    stop)
        stop_infra
        ;;
    restart)
        restart_infra
        ;;
    status)
        status_infra
        ;;
    logs)
        logs_infra "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        print_error "No command specified. Use 'help' for usage information."
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac