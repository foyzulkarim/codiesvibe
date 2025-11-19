#!/bin/bash

# ============================================================================
# Search API - Database Migration Script
# ============================================================================
# This script runs database migrations for the Search API
#
# Usage:
#   ./scripts/migrate-database.sh [command]
#
# Commands:
#   up          - Run all pending migrations
#   down        - Rollback last migration
#   status      - Show migration status
#   create      - Create a new migration file
#
# Prerequisites:
#   - MongoDB connection configured in environment variables
#   - Node.js and npm installed
#
# Example:
#   ./scripts/migrate-database.sh up
#   ./scripts/migrate-database.sh status
# ============================================================================

set -e # Exit on error

# ============================================================================
# Configuration
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Command
COMMAND="${1:-status}"

# Migrations directory
MIGRATIONS_DIR="migrations"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check if MongoDB URI is set
    if [ -z "${MONGODB_URI:-}" ]; then
        log_error "MONGODB_URI environment variable not set"
        echo "Please set MONGODB_URI in your .env file or environment"
        exit 1
    fi

    # Create migrations directory if not exists
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        mkdir -p "$MIGRATIONS_DIR"
        log_info "Created migrations directory: $MIGRATIONS_DIR"
    fi

    log_success "Prerequisites check passed"
}

# ============================================================================
# Migration Functions
# ============================================================================

run_migrations_up() {
    log_info "Running migrations..."

    # Check if there are any migration files
    if [ ! "$(ls -A $MIGRATIONS_DIR/*.js 2>/dev/null)" ]; then
        log_info "No migration files found in $MIGRATIONS_DIR"
        return 0
    fi

    # Run each migration file
    for migration_file in $MIGRATIONS_DIR/*.js; do
        if [ -f "$migration_file" ]; then
            local migration_name=$(basename "$migration_file")
            log_info "Running migration: $migration_name"

            if node "$migration_file" up; then
                log_success "Migration completed: $migration_name"
            else
                log_error "Migration failed: $migration_name"
                exit 1
            fi
        fi
    done

    log_success "All migrations completed successfully"
}

run_migrations_down() {
    log_info "Rolling back last migration..."

    # Get the last migration file
    local last_migration=$(ls -t $MIGRATIONS_DIR/*.js 2>/dev/null | head -n 1)

    if [ -z "$last_migration" ]; then
        log_warning "No migrations to rollback"
        return 0
    fi

    local migration_name=$(basename "$last_migration")
    log_info "Rolling back migration: $migration_name"

    if node "$last_migration" down; then
        log_success "Rollback completed: $migration_name"
    else
        log_error "Rollback failed: $migration_name"
        exit 1
    fi
}

show_migration_status() {
    log_info "Migration Status"
    echo ""

    # Check if migrations directory exists and has files
    if [ ! -d "$MIGRATIONS_DIR" ] || [ ! "$(ls -A $MIGRATIONS_DIR/*.js 2>/dev/null)" ]; then
        log_info "No migrations found"
        return 0
    fi

    # List all migration files
    echo "Available migrations:"
    echo ""
    for migration_file in $MIGRATIONS_DIR/*.js; do
        if [ -f "$migration_file" ]; then
            local migration_name=$(basename "$migration_file")
            echo "  • $migration_name"
        fi
    done

    echo ""
    log_info "Total migrations: $(ls -1 $MIGRATIONS_DIR/*.js 2>/dev/null | wc -l)"
}

create_migration() {
    log_info "Creating new migration..."

    # Get migration name from user
    echo ""
    read -p "Enter migration name (e.g., add_indexes_to_tools): " -r MIGRATION_NAME
    echo ""

    if [ -z "$MIGRATION_NAME" ]; then
        log_error "Migration name cannot be empty"
        exit 1
    fi

    # Create timestamp
    TIMESTAMP=$(date +%Y%m%d%H%M%S)

    # Create migration file
    MIGRATION_FILE="$MIGRATIONS_DIR/${TIMESTAMP}_${MIGRATION_NAME}.js"

    cat > "$MIGRATION_FILE" << 'EOF'
/**
 * Migration: MIGRATION_NAME_PLACEHOLDER
 * Created: TIMESTAMP_PLACEHOLDER
 */

const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'toolsearch';

/**
 * Run migration (up)
 */
async function up() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // ========================================================================
    // Add your migration logic here
    // ========================================================================

    // Example: Create indexes
    // await db.collection('tools').createIndex({ name: 1 });

    // Example: Update documents
    // await db.collection('tools').updateMany(
    //   { oldField: { $exists: true } },
    //   { $rename: { oldField: 'newField' } }
    // );

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Rollback migration (down)
 */
async function down() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // ========================================================================
    // Add your rollback logic here
    // ========================================================================

    // Example: Drop indexes
    // await db.collection('tools').dropIndex('name_1');

    // Example: Revert document updates
    // await db.collection('tools').updateMany(
    //   { newField: { $exists: true } },
    //   { $rename: { newField: 'oldField' } }
    // );

    console.log('Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration based on command
const command = process.argv[2] || 'up';

if (command === 'up') {
  up().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
} else if (command === 'down') {
  down().catch((error) => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
} else {
  console.error('Invalid command. Use "up" or "down"');
  process.exit(1);
}
EOF

    # Replace placeholders
    sed -i "s/MIGRATION_NAME_PLACEHOLDER/${MIGRATION_NAME}/g" "$MIGRATION_FILE" 2>/dev/null || \
        sed -i '' "s/MIGRATION_NAME_PLACEHOLDER/${MIGRATION_NAME}/g" "$MIGRATION_FILE" 2>/dev/null
    sed -i "s/TIMESTAMP_PLACEHOLDER/$(date)/g" "$MIGRATION_FILE" 2>/dev/null || \
        sed -i '' "s/TIMESTAMP_PLACEHOLDER/$(date)/g" "$MIGRATION_FILE" 2>/dev/null

    log_success "Migration file created: $MIGRATION_FILE"
    echo ""
    log_info "Next steps:"
    echo "  1. Edit the migration file to add your migration logic"
    echo "  2. Test the migration: node $MIGRATION_FILE up"
    echo "  3. Test the rollback: node $MIGRATION_FILE down"
    echo "  4. Run all migrations: ./scripts/migrate-database.sh up"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🗄️  SEARCH API - DATABASE MIGRATION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Command: $COMMAND"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_prerequisites

    case "$COMMAND" in
        up)
            run_migrations_up
            ;;
        down)
            run_migrations_down
            ;;
        status)
            show_migration_status
            ;;
        create)
            create_migration
            ;;
        *)
            log_error "Invalid command: $COMMAND"
            echo ""
            echo "Available commands:"
            echo "  up      - Run all pending migrations"
            echo "  down    - Rollback last migration"
            echo "  status  - Show migration status"
            echo "  create  - Create a new migration file"
            exit 1
            ;;
    esac

    echo ""
    log_success "Done"
    echo ""
}

# Run main function
main
