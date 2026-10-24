#!/bin/sh
# Path-free selection on top of dagger/dagger#14590: selectors before the
# first function root the pipeline at the item, selectors after it keep that
# PR's per-boundary lowering, and the two compose.
unset DAGGER_SESSION_PORT DAGGER_SESSION_TOKEN
cd "$(dirname "$0")" || exit 2
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q
DAGGER=${DAGGER:-dagger}
esc=$(printf '\033')
raw=$(mktemp)
out=''; rc=0; ok=0; bad=0
run() {
  printf '\n=== %s ===\n$ dagger %s\n' "$1" "$2"
  eval "$DAGGER $2" >"$raw" 2>&1
  rc=$?
  out=$(sed "s/$esc\[[0-9;]*m//g" "$raw" | grep -vE '^\[dagger|Setup tracing at|Setup tracing by')
  printf '%s\n' "$out" | sed 's/^/  | /'
}
pass() { ok=$((ok + 1)); printf '  ok   %s\n' "$1"; }
fail() { bad=$((bad + 1)); printf '  FAIL %s\n' "$1"; }
exits() { case "$1:$rc" in ok:0) pass "exit 0";; fail:0) fail "expected nonzero exit";; ok:*) fail "expected exit 0, got $rc";; *) pass "nonzero exit";; esac }
has() { case "$out" in *"$1"*) pass "has: $1";; *) fail "missing: $1";; esac }
hasnt() { case "$out" in *"$1"*) fail "unexpected: $1";; *) pass "absent: $1";; esac }

# Path-free: name the item, then call functions on it.
run path-free-pinned "call --runner-project=./api --runner-suite=unit.test.ts file"
exits ok
has 'unit.test.ts'

run path-free-outer "call --runner-project=./web suites keys"
exits ok
has 'e2e.test.ts'
has 'unit.test.ts'

run path-free-ambiguous "call --runner-projects path"
exits fail
has 'match 2 artifacts'

run path-free-typo "call --rnner-suite=unit.test.ts file"
exits fail
has 'unknown flag'

# #14590's own shape must keep working: selectors after the function.
run flattened-walk "call projects suites keys --runner-project=./api"
exits ok
has 'e2e.test.ts'

run flattened-nested "call projects suites run --runner-project=./api --runner-suite=unit.test.ts"
exits ok
has '1 passed'

run flattened-required "call projects path"
exits fail
has 'required collection selector'

# The two compose: root at the project, then let #14590 lower the nested one.
run composed "call --runner-project=./api suites run --runner-suite=unit.test.ts"
exits ok
has '1 passed'

# Pre-existing surfaces.
run escape-hatch "call projects get --key=./api suites get --key=unit.test.ts file"
exits ok
has 'unit.test.ts'

run plain "call projects keys"
exits ok
has './api'

printf '\n%d assertions passed, %d failed\n' "$ok" "$bad"
rm -f "$raw"
[ "$bad" -eq 0 ]
