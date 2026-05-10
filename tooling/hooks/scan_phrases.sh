#!/usr/bin/env bash
# / scan banned phrases
set -e

PHRASES_FILE="tooling/hooks/banned_phrases.txt"

if [ ! -f "$PHRASES_FILE" ]; then
  echo "ERROR: phrases file missing: $PHRASES_FILE"
  exit 2
fi

DIFF=$(cat)
VIOLATIONS=0

while IFS= read -r phrase; do
  [ -z "$phrase" ] && continue
  case "$phrase" in
    \#*) continue ;;
  esac
  if echo "$DIFF" | grep -i -F -q "$phrase"; then
    echo "BLOCKED: phrase detected: '$phrase'"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < "$PHRASES_FILE"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "Strip the offending phrases before committing."
  exit 1
fi

exit 0
