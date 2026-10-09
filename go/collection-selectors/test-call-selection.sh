#!/bin/sh
# Exercises selecting a collection item by dimension on `dagger call`:
#   dagger call --runner-project=./api --runner-suite=unit.test.ts file
#
# Needs a CLI that supports it; on a released CLI the selectors are unknown
# flags and every select-* case below fails. The regression cases at the end
# are the surfaces that must keep working either way.
#
# Inside the dev-engine playground the exec inherits a session to the outer
# engine; unsetting it makes the CLI use the dev engine (see engine-dev's
# withoutOuterSession).
unset DAGGER_SESSION_PORT DAGGER_SESSION_TOKEN
cd "$(dirname "$0")" || exit 2
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q

DAGGER=${DAGGER:-dagger}
esc=$(printf '\033')
out=''
rc=0
ok=0
bad=0

# Captures stdout+stderr: the pretty frontend writes the check report to stderr.
# Through a temp file, so $rc is the CLI's status and not the filter's.
raw=$(mktemp)
run() {
  printf '\n=== %s ===\n$ dagger %s\n' "$1" "$2"
  eval "$DAGGER $2" >"$raw" 2>&1
  rc=$?
  out=$(sed "s/$esc\[[0-9;]*m//g" "$raw" | grep -vE '^\[dagger|Setup tracing at')
  printf '%s\n' "$out" | sed 's/^/  | /'
}

pass() { ok=$((ok + 1)); printf '  ok   %s\n' "$1"; }
fail() { bad=$((bad + 1)); printf '  FAIL %s\n' "$1"; }

exits() { # exits ok|fail
  case "$1:$rc" in
    ok:0 | fail:0) [ "$1" = ok ] && pass "exit 0" || fail "expected nonzero exit, got 0" ;;
    *) [ "$1" = fail ] && pass "nonzero exit" || fail "expected exit 0, got $rc" ;;
  esac
}
has() { case "$out" in *"$1"*) pass "has: $1" ;; *) fail "missing: $1" ;; esac }
hasnt() { case "$out" in *"$1"*) fail "unexpected: $1" ;; *) pass "absent: $1" ;; esac }
counts() { # counts N pattern
  got=$(printf '%s\n' "$out" | grep -c "$2")
  [ "$got" -eq "$1" ] && pass "$1 line(s) matching $2" || fail "want $1 line(s) matching $2, got $got"
}

# A fully pinned item: both dimensions, then a function on the item.
run select-pinned "call --runner-project=./api --runner-suite=unit.test.ts file"
exits ok
has 'unit.test.ts'

run select-pinned-other-field "call --runner-project=./api --runner-suite=unit.test.ts project"
exits ok
has './api'

# A one-dimension collection needs only its own selector.
run select-env "call --runner-env=ci name"
exits ok
has 'ci'

# A void-returning check function is callable like any other.
run select-env-check "call --runner-env=ci ready"
exits ok

# Naming the item without a function prints the item itself.
run select-bare "call --runner-env=local"
exits ok
has 'RunnerEnv'

# Help after a selection describes the item, not the module root.
run select-help "call --runner-suite=unit.test.ts --runner-project=./web --help"
exits ok
has 'file'
has 'project'

# An outer selector pins the outer item; navigate on from it.
run select-outer "call --runner-project=./api suites keys"
exits ok
has 'e2e.test.ts'
has 'unit.test.ts'

# Selecting a whole collection leaves every item a candidate, which must name
# them instead of guessing.
run select-ambiguous "call --runner-projects path"
exits fail
has 'match 2 artifacts'
has './api'
has './web'

run select-no-match "call --runner-suite=nope file"
exits fail

# A typo stays a flag error rather than becoming a selector.
run select-typo "call --rnner-suite=unit.test.ts file"
exits fail
has 'unknown flag'

# Regressions: the surfaces that worked before must still work.
run walk-explicit "call projects get --key=./api suites get --key=unit.test.ts file"
exits ok
has 'unit.test.ts'

run walk-keys "call projects keys"
exits ok
has './api'
has './web'

run plain-help "call --help"
exits ok
has 'projects'
has 'envs'

printf '\n%d assertions passed, %d failed\n' "$ok" "$bad"
rm -f "$raw"
[ "$bad" -eq 0 ]
