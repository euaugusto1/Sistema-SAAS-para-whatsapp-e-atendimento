#!/bin/bash

# SaaS Platform - Database Backup Script
# Schedule with cron: 0 2 * * * /path/to/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"
S3_BUCKET="your-backup-bucket"
RETENTION_DAYS=7

echo "🔄 Starting backup at $(date)"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup PostgreSQL
echo "📦 Backing up PostgreSQL..."
docker exec saas-postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-saas} | gzip > "${BACKUP_DIR}/database.sql.gz"

# Backup Redis
echo "📦 Backing up Redis..."
docker exec saas-redis redis-cli --rdb /data/dump.rdb
docker cp saas-redis:/data/dump.rdb "${BACKUP_DIR}/redis.rdb"

# Backup uploads
echo "📦 Backing up uploads..."
if [ -d "apps/api/uploads" ]; then
    tar -czf "${BACKUP_DIR}/uploads.tar.gz" apps/api/uploads/
fi

# Backup environment files
echo "📦 Backing up environment..."
cp .env.production "${BACKUP_DIR}/.env.production.backup" 2>/dev/null || true

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 sync "${BACKUP_DIR}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/"
fi

# Clean old backups
echo "🧹 Cleaning old backups..."
find backups -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +

# Calculate size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "✅ Backup completed! Size: ${BACKUP_SIZE}"
echo "📁 Location: ${BACKUP_DIR}"

# Send notification (optional)
if command -v curl &> /dev/null && [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Backup completed: ${BACKUP_SIZE} at ${TIMESTAMP}\"}" \
        "$SLACK_WEBHOOK"
fi
