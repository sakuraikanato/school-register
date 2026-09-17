#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: backup-mysql.sh [--help]

Create a consistent, compressed MySQL backup for school-register.
Configuration is read from ENV_FILE (default: apps/api/.env) and can be
overridden with environment variables.

Important variables:
  BACKUP_DIR       Local or mounted school-server directory
                   (default: /var/backups/school-register/mysql)
  BACKUP_REMOTE    Optional rsync destination, e.g. backup@server:/srv/...
  RETENTION_DAYS   Number of days to keep local backup files (default: 90)
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/apps/api/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-school_register}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/school-register/mysql}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
BACKUP_TIMEZONE="${BACKUP_TIMEZONE:-Asia/Tokyo}"

die() {
  echo "backup-mysql.sh: $*" >&2
  exit 1
}

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || die "RETENTION_DAYS must be an integer"
(( RETENTION_DAYS >= 1 )) || die "RETENTION_DAYS must be at least 1"

for command_name in mysqldump gzip sha256sum awk find mv mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || die "$command_name is required"
done
if [[ -n "$BACKUP_REMOTE" ]]; then
  command -v rsync >/dev/null 2>&1 || die "rsync is required when BACKUP_REMOTE is set"
fi

umask 077
mkdir -p "$BACKUP_DIR"

timestamp="$(TZ="$BACKUP_TIMEZONE" date '+%Y%m%d-%H%M%S')"
backup_file="$BACKUP_DIR/school-register-${timestamp}.sql.gz"
checksum_file="$backup_file.sha256"
manifest_file="$backup_file.txt"
[[ ! -e "$backup_file" ]] || die "backup already exists: $backup_file"

defaults_file="$(mktemp "${BACKUP_DIR}/.mysql-client.XXXXXX")"
temporary_file="$(mktemp "${BACKUP_DIR}/.school-register-${timestamp}.XXXXXX")"
cleanup() {
  rm -f -- "$defaults_file"
  [[ -z "$temporary_file" ]] || rm -f -- "$temporary_file"
}
trap cleanup EXIT

{
  printf '[client]\n'
  printf 'host=%s\n' "$DB_HOST"
  printf 'port=%s\n' "$DB_PORT"
  printf 'user=%s\n' "$DB_USER"
  printf 'password=%s\n' "$DB_PASSWORD"
} >"$defaults_file"
chmod 600 "$defaults_file"

echo "Backing up ${DB_NAME} from ${DB_HOST}:${DB_PORT}"
mysqldump \
  --defaults-extra-file="$defaults_file" \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  --databases "$DB_NAME" \
  | gzip -c >"$temporary_file"

gzip -t "$temporary_file"
mv -- "$temporary_file" "$backup_file"
temporary_file=""
sha256sum "$backup_file" >"$checksum_file"

checksum="$(awk '{print $1}' "$checksum_file")"
{
  printf 'created_at=%s\n' "$(TZ="$BACKUP_TIMEZONE" date '+%Y-%m-%dT%H:%M:%S%z')"
  printf 'database_host=%s\n' "$DB_HOST"
  printf 'database_port=%s\n' "$DB_PORT"
  printf 'database_name=%s\n' "$DB_NAME"
  printf 'backup_file=%s\n' "$(basename "$backup_file")"
  printf 'sha256=%s\n' "$checksum"
} >"$manifest_file"

if [[ -n "$BACKUP_REMOTE" ]]; then
  echo "Copying backup to ${BACKUP_REMOTE}"
  rsync --archive --partial --chmod=F600 "$backup_file" "$checksum_file" "$manifest_file" "${BACKUP_REMOTE%/}/"
fi

find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'school-register-*.sql.gz' -o -name 'school-register-*.sql.gz.sha256' -o -name 'school-register-*.sql.gz.txt' \) \
  -mtime "+$RETENTION_DAYS" -print -delete

echo "Backup complete: $backup_file"
