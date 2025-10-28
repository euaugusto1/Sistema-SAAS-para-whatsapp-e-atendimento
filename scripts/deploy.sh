#!/bin/bash

# SaaS Platform - Production Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: staging, production

set -e

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"

echo "🚀 Starting deployment to ${ENVIRONMENT}..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is valid
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    print_error "Invalid environment: ${ENVIRONMENT}"
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    print_message "Loading environment variables from .env.${ENVIRONMENT}"
    export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
else
    print_error "Environment file .env.${ENVIRONMENT} not found!"
    exit 1
fi

# Create backup directory
print_message "Creating backup directory..."
mkdir -p "${BACKUP_DIR}"

# Backup database
print_message "Backing up database..."
docker exec saas-postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > "${BACKUP_DIR}/database.sql"
print_message "Database backup saved to ${BACKUP_DIR}/database.sql"

# Backup environment files
print_message "Backing up environment files..."
cp .env.${ENVIRONMENT} "${BACKUP_DIR}/.env.${ENVIRONMENT}.backup"

# Pull latest changes
print_message "Pulling latest code from repository..."
git pull origin ${ENVIRONMENT}

# Install dependencies
print_message "Installing dependencies..."
npm ci

# Run database migrations
print_message "Running database migrations..."
cd apps/api
npx prisma migrate deploy
cd ../..

# Build Docker images
print_message "Building Docker images..."
docker-compose -f docker-compose.yml build --no-cache

# Stop old containers
print_message "Stopping old containers..."
docker-compose -f docker-compose.yml down

# Start new containers
print_message "Starting new containers..."
docker-compose -f docker-compose.yml up -d

# Wait for services to be healthy
print_message "Waiting for services to be healthy..."
sleep 10

# Health checks
print_message "Running health checks..."

# Check API health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_message "✅ API is healthy"
else
    print_error "❌ API health check failed"
    print_warning "Rolling back deployment..."
    docker-compose -f docker-compose.yml down
    # Restore from backup if needed
    exit 1
fi

# Check Web health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_message "✅ Web is healthy"
else
    print_error "❌ Web health check failed"
    print_warning "Rolling back deployment..."
    docker-compose -f docker-compose.yml down
    exit 1
fi

# Clean up old Docker images
print_message "Cleaning up old Docker images..."
docker image prune -f

# Clean up old backups (keep last 10)
print_message "Cleaning up old backups..."
ls -t backups | tail -n +11 | xargs -I {} rm -rf backups/{}

# Display running containers
print_message "Running containers:"
docker-compose -f docker-compose.yml ps

print_message "✅ Deployment completed successfully!"
print_message "Backup saved to: ${BACKUP_DIR}"
print_message ""
print_message "🎉 ${ENVIRONMENT} environment is now live!"
print_message ""
print_message "Useful commands:"
print_message "  - View logs: docker-compose logs -f"
print_message "  - Restart services: docker-compose restart"
print_message "  - Stop services: docker-compose down"
print_message ""
