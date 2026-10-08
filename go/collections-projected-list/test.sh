#!/bin/sh
# Drives every case through whichever CLI $DAGGER names (default: dagger on
# PATH) and never aborts, so one run shows every result. Each case states the
# exit status it expects; the summary at the end counts the ones that disagree.
#
# Inside the dev-engine playground the exec inherits a session to the outer
# engine; unsetting it makes the CLI use the dev engine (see engine-dev's
# withoutOuterSession).
unset DAGGER_SESSION_PORT DAGGER_SESSION_TOKEN
cd "$(dirname "$0")" || exit 2
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q

DAGGER=${DAGGER:-dagger}
err=$(mktemp)
esc=$(printf '\033')
pass=0 fail=0 unexpected=0

run() {
  want=$1 name=$2; shift 2
  printf '\n=== %s ===\n$ %s\n' "$name" "$*"
  out=$(eval "$DAGGER $*" 2>"$err"); rc=$?
  [ -n "$out" ] && printf '%s\n' "$out"
  if [ "$rc" -ne 0 ]; then
    msg=$(grep -v '^\[dagger' "$err" | grep -E '^(!|Error)')
    [ -n "$msg" ] || msg=$(grep -v '^\[dagger' "$err" | grep -v '^$' | tail -8)
    printf '%s\n' "$msg" | sed "s/$esc\[[0-9;]*m//g; s/^/  /"
  fi
  printf 'exit=%d (want %s)\n' "$rc" "$want"
  case "$want:$rc" in
    ok:0) pass=$((pass + 1)) ;;
    fail:0 | ok:*) unexpected=$((unexpected + 1)); printf 'UNEXPECTED\n' ;;
    fail:*) fail=$((fail + 1)) ;;
    any:*) ;;
  esac
}

run ok version "version"

# The bug: the item type is reachable only through get, so [CollectionsItem]
# only exists in the projected list field. Before the fix every call into the
# collection failed while the CLI resolved the command tree.
run ok items-keys-module "-m ./collections call items keys"
run ok items-keys-entrypoint "call items keys"
run ok items-list "call items list"
run ok items-get "call items get --key=a name"
run ok items-subset "call items subset --keys=a,c keys"
run ok items-help "call items --help"

# A collection nested under an item, reachable only through get as well.
run ok parts-keys "call items get --key=a parts keys"
run ok parts-list "call items get --key=a parts list"
run ok parts-get "call items get --key=a parts get --key=left name"

# Control: an author function already returns [CollectionsLetter].
run ok letters-keys "call letters keys"
run ok letters-list "call letters list"
run ok letters-get "call letters get --key=x value"

# Other consumers of the type closure.
run ok script-keys "-m ./collections -c 'items | keys'"
run ok script-list "-m ./collections -c 'items | list'"
run ok script-get "-m ./collections -c 'items | get a | name'"
run ok graphql-list "api query -m ./collections < queries/list.graphql"
run ok artifacts "list"
run ok artifacts-items "list collections-items -a"

# Edges: bad input should fail legibly.
run fail subset-unknown-key "call items subset --keys=zzz keys"
run fail get-missing-key "call items get name"

printf '\n%d passed, %d failed as expected, %d unexpected\n' "$pass" "$fail" "$unexpected"
rm -f "$err"
[ "$unexpected" -eq 0 ]
