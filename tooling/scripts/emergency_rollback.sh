#!/usr/bin/env bash
# / generate forward rollback migration
set -e

if [ -z "$1" ]; then
  echo "Usage: tooling/scripts/emergency_rollback.sh <bad_migration_number>"
  echo "Example: tooling/scripts/emergency_rollback.sh 0042"
  exit 1
fi

BAD=$1
NEXT=$(printf "%04d" $((10#$BAD + 1)))
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="supabase/migrations/${NEXT}_rollback_${BAD}_${TIMESTAMP}.sql"

cat > "$FILE" <<SQL
-- rollback of $BAD
-- TODO: invert changes from $BAD here
-- DROP COLUMN, DROP INDEX, etc. as needed
-- data restoration is a separate manual step
SQL

echo "Created $FILE"
echo "Fill the inversion SQL, then: npx supabase db push --linked"
