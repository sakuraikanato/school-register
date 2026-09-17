#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: restore-mysql.sh BACKUP_FILE --yes [--skip-safety-backup]

Restore a compressed school-register MySQL dump.  The --yes flag is required
for non-interactive use because this replaces the current database contents.

Options:
  --yes                   Confirm the destructive restore operation
  --skip-safety-backup   Do not create a fresh backup before restoring
  --help                 Show this help

Optional variables:
  ENV_FILE               Environment file (default: apps/api/.env)
  RESTORE_SAFETY_DIR     Directory for the pre-restore backup
  RUN_MIGRATIONS=1       Run Drizzle migrations after the import
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "$#" -eq 0 ]]; then
  usage
  [[ "$#" -eq 0 ]] && exit 1
  exit 0
fi

BACKUP_FILE=""
CONFIRMED=0
SKIP_SAFETY_BACKUP=0
for argument in "$@"; do
  case "$argument" in
    --yes) CONFIRMED=1 ;;
    --skip-safety-backup) SKIP_SAFETY_BACKUP=1 ;;
    --help|-h) usage; exit 0 ;;
    --*) echo "restore-mysql.sh: unknown option: $argument" >&2; usage >&2; exit 1 ;;
    *) [[ -z "$BACKUP_FILE" ]] || { echo "restore-mysql.sh: only one backup file is allowed" >&2; exit 1; }; BACKUP_FILE="$argument" ;;
  esac
done
[[ -n "$BACKUP_FILE" ]] || { usage >&2; exit 1; }

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
RESTORE_SAFETY_DIR="${RESTORE_SAFETY_DIR:-$BACKUP_DIR/pre-restore}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"

die() {
  echo "restore-mysql.sh: $*" >&2
  exit 1
}

[[ -f "$BACKUP_FILE" ]] || die "backup file not found: $BACKUP_FILE"
for command_name in mysql gzip sha256sum mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || die "$command_name is required"
done
if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  command -v bun >/dev/null 2>&1 || die "bun is required when RUN_MIGRATIONS=1"
fi

gzip -t "$BACKUP_FILE" || die "compressed backup is corrupted: $BACKUP_FILE"
checksum_file="$BACKUP_FILE.sha256"
if [[ -f "$checksum_file" ]]; then
  sha256sum -c "$checksum_file" || die "checksum verification failed: $BACKUP_FILE"
else
  echo "Warning: checksum file not found; continuing after gzip integrity check" >&2
fi

if (( CONFIRMED == 0 )); then
  if [[ ! -t 0 ]]; then
    die "non-interactive restore requires --yes"
  fi
  printf '現在のデータベース %s を %s で置き換えます。続行しますか？ [yes/NO] ' "$DB_NAME" "$BACKUP_FILE" >&2
  read -r answer
  [[ "$answer" == "yes" ]] || die "restore cancelled"
fi

umask 077
defaults_file="$(mktemp)"
cleanup() {
  rm -f -- "$defaults_file"
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

if (( SKIP_SAFETY_BACKUP == 0 )); then
  mkdir -p "$RESTORE_SAFETY_DIR"
  echo "Creating a safety backup before restore"
  ENV_FILE="$ENV_FILE" BACKUP_DIR="$RESTORE_SAFETY_DIR" \
    "$SCRIPT_DIR/backup-mysql.sh"
fi

echo "Restoring ${BACKUP_FILE} into ${DB_NAME}"
gunzip -c "$BACKUP_FILE" | mysql --defaults-extra-file="$defaults_file"

table_count="$(mysql --defaults-extra-file="$defaults_file" --batch --skip-column-names \
  --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
[[ "$table_count" =~ ^[0-9]+$ ]] && (( table_count > 0 )) || die "restore verification found no tables"
echo "Restore complete: ${table_count} tables are present"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  echo "Running Drizzle migrations"
  (cd "$PROJECT_DIR/apps/api" && bunx drizzle-kit migrate --config drizzle.config.ts)
fi
