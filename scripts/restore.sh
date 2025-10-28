#!/bin/bash

# SaaS Platform - Database Restore Script
# Usage: ./restore.sh <backup_directory>

set -e

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: ./restore.sh <backup_directory>"
    echo "Example: ./restore.sh backups/20231028_140000"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "⚠️  WARNING: This will restore data from backup: $BACKUP_DIR"
echo "This will overwrite current data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "🔄 Starting restore..."

# Restore PostgreSQL
if [ -f "${BACKUP_DIR}/database.sql.gz" ]; then
    echo "📥 Restoring PostgreSQL..."
    gunzip -c "${BACKUP_DIR}/database.sql.gz" | docker exec -i saas-postgres psql -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-saas}
    echo "✅ PostgreSQL restored"
fi

# Restore Redis
if [ -f "${BACKUP_DIR}/redis.rdb" ]; then
    echo "📥 Restoring Redis..."
    docker cp "${BACKUP_DIR}/redis.rdb" saas-redis:/data/dump.rdb
    docker-compose restart redis
    echo "✅ Redis restored"
fi

# Restore uploads
if [ -f "${BACKUP_DIR}/uploads.tar.gz" ]; then
    echo "📥 Restoring uploads..."
    tar -xzf "${BACKUP_DIR}/uploads.tar.gz"
    echo "✅ Uploads restored"
fi

# Restore environment (with confirmation)
if [ -f "${BACKUP_DIR}/.env.production.backup" ]; then
    read -p "Restore environment file? (yes/no): " env_confirm
    if [ "$env_confirm" == "yes" ]; then
        cp "${BACKUP_DIR}/.env.production.backup" .env.production
        echo "✅ Environment restored"
    fi
fi

echo "✅ Restore completed!"
echo "Please verify the application is working correctly."
