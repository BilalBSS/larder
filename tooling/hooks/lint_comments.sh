#!/usr/bin/env bash
# / lint comment lengths
set -e

VIOLATIONS=0

for file in $(git diff --cached --name-only --diff-filter=AM | grep -E '\.(ts|tsx)$' || true); do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue

  while IFS= read -r line; do
    line_num=$(echo "$line" | sed -E 's|:.*$||')
    raw=$(echo "$line" | sed -E 's|^[0-9]+:||')
    text=$(echo "$raw" | sed -E 's|^[[:space:]]*//[[:space:]]*||; s|^[[:space:]]*/\*[[:space:]]*||; s|\*/[[:space:]]*$||; s|^[[:space:]]*\*[[:space:]]*||; s|^/[[:space:]]+||')
    if [ -z "$text" ] || echo "$text" | grep -qE '^@(param|returns?|throws?|example|deprecated|see|todo|fixme|ts-)'; then
      continue
    fi
    word_count=$(echo "$text" | wc -w | tr -d ' ')
    if [ "$word_count" -gt 4 ]; then
      echo "BLOCKED: $file:$line_num: comment exceeds 4 words: '$text'"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done < <(grep -nE '^[[:space:]]*(//|/\*|\*)' "$file" || true)
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "Trim comments to 4 words max."
  exit 1
fi

exit 0
