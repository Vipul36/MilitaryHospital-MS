#!/usr/bin/env bash
set -e

echo "========================================="
echo "  MHSHMS AUTOMATED DATABASE RESTORE TOOL "
echo "========================================="

npx ts-node -T -P apps/api/tsconfig.json scripts/db-backup-tool.ts restore "$@"
