#!/bin/sh
# Proves how the CLI names collection selectors: the flag is named after the
# dimension (module + item type), the value placeholder is the author's +get
# argument name, and there is no hardcoded --path flag.
#
# Every case asserts on the output instead of only reporting it, so a drift in
# flag naming fails the run. Runs against whichever CLI $DAGGER names.
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

# The flag name comes from the dimension (module + item type); the placeholder
# comes from the author's +get argument name — path, file, name respectively.
run flag-names "check --help"
has '--runner-project PATH'
has '--runner-suite FILE'
has '--runner-env NAME'
hasnt '--path'
hasnt '--file '

# There is no hardcoded path selector to fall back on.
run no-path-flag "check --path=./api"
exits fail
has 'unknown flag: --path'

# The grid: one column per dimension, one row per check.
run grid "check -l --all"
exits ok
has 'RUNNER-PROJECT'
has 'RUNNER-SUITE'
has 'RUNNER-ENV'
counts 4 'run$'
counts 2 'ready$'

# -f cli prints the selector flags verbatim.
run cli-format "check -l --all -f cli"
exits ok
has '--runner --runner-project=./api --runner-suite=e2e.test.ts'
has '--runner --runner-env=ci'
hasnt '--path='

# -f link keys the URI by the dimension names too, never by the key argument:
# the suite dimension's placeholder is FILE, but the query key is suite=.
# Asserted as substrings because the surrounding shape changed after
# v1.0.0-beta.15 (dagger/dagger@438a37fd51 moved the schema path into check=
# and qualified the keys): beta.15 prints
#   dag+check://projects/suites/run?project=./api&suite=unit.test.ts
# and main prints
#   dag+check://?check=projects/suites/run&runner-project=./api&runner-suite=unit.test.ts
run link-format "check -l --all -f link"
exits ok
has 'project=./api'
has 'suite=unit.test.ts'
has 'env=ci'
hasnt 'path='
hasnt 'file='

# One dimension does not pin a single artifact: both suites stay selected.
run one-dimension "check -l --runner-project=./api"
exits ok
counts 1 'run$'
has 'e2e.test.ts, unit.test.ts'

# Combining the dimensions pins exactly one.
run two-dimensions "check -l --runner-project=./api --runner-suite=unit.test.ts"
exits ok
counts 1 'run$'
has 'unit.test.ts'
hasnt 'e2e.test.ts'

run run-one-check "check --runner-project=./api --runner-suite=unit.test.ts"
exits ok
has '1 passed'
has 'project=./api'
has 'suite=unit.test.ts'
hasnt 'path='

# A dimension of its own, keyed by name rather than path.
run env-dimension "check -l --runner-env=ci"
exits ok
counts 1 'ready$'
has 'ci'
hasnt 'local'

run list-scoped "list runner-suites -a --runner-project=./api"
exits ok
counts 2 'runner  \./api'

run unknown-key "check --runner-project=./nope"
exits fail

# The call surface is separate: the projection renames the author's get to
# get(key:), so a call chain selects an item with --key, never --path either.
# Needs dagger/dagger#14447 — without it both cases die while the CLI resolves
# the command tree: typedef "[RunnerProject]" not found in currentTypeDefs.
run call-surface "call projects get --key=./api suites get --key=unit.test.ts file"
exits ok
has 'unit.test.ts'

run call-help "call projects --help"
exits ok
has 'get'
has 'subset'
hasnt '--path'

rm -f "$raw"
printf '\n%d assertions passed, %d failed\n' "$ok" "$bad"
[ "$bad" -eq 0 ]
