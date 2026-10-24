#!/usr/bin/env bash
# Repro for files outside the module directory (typescript-sdk#86).
#
# Run from this directory:
#   ./run.sh
#
# Override the CLI if beta.18 is your installed default:
#   DAGGER="dagger" ./run.sh
set -uo pipefail
cd "$(dirname "$0")"

DAGGER=${DAGGER:-"dagger --x-release=v1.0.0-beta.18"}
export DAGGER_LEAVE_OLD_ENGINE=1

VERSION=shared/version.txt
TSCONFIG=app/tsconfig.json
pass=0
fail=0

# The later scenarios edit shared/version.txt and app/tsconfig.json and write a
# .env, so put the fixture back whatever happens — a half-finished run must not
# leave it broken. Copies rather than `git checkout --`, so this also works on a
# tree that is not a git checkout.
saved=$(mktemp -d)
cp "$VERSION" "$saved/version.txt"
cp "$TSCONFIG" "$saved/tsconfig.json"
restore() {
  cp "$saved/version.txt" "$VERSION"
  cp "$saved/tsconfig.json" "$TSCONFIG"
  rm -rf .env secrets
}
trap 'restore; rm -rf "$saved"' EXIT

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# ok <description> <expected substring> <actual>
ok() {
  if [[ "$3" == *"$2"* ]]; then
    printf '  \033[32mPASS\033[0m %s\n' "$1"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m %s\n        want: %s\n        got:  %s\n' "$1" "$2" "${3//$'\n'/ | }"
    fail=$((fail + 1))
  fi
}

# absent <description> <line that must not be listed> <actual>
# For the listing scenarios: a substring match would hit `.env` inside
# `.gitignore` or `go` inside `golang`, so this matches a whole line.
absent() {
  if grep -qx -- "$2" <<<"$3"; then
    printf '  \033[31mFAIL\033[0m %s\n        %s is listed\n' "$1" "$2"
    fail=$((fail + 1))
  else
    printf '  \033[32mPASS\033[0m %s\n' "$1"
    pass=$((pass + 1))
  fi
}

call() { $DAGGER -m "$1" call "$2" 2>&1 | tail -40; }
generate() { $DAGGER generate --auto-apply 2>&1; }

# The imports are read at generation and written into the entrypoint, so a
# changed import needs a regenerate before the new path is in the context.
say "1. generate"
out=$(generate)
ok "generation succeeds" "1 passed" "$out"
ok "the entrypoint reads what the imports reached" \
  'include: ["deeper", "shared"]' "$(cat app/entrypoint/main.dang)"

say "2. the module reaches what it imports"
# `deeper` is the transitive half: app imports ../../shared/greet.js, and that
# file imports ../deeper/punctuate.js. Nothing in app names it.
ok "a function imported from ../shared runs" "hello world from ../shared" "$(call app greet)"
ok "and the directory it imports in turn came too" '../shared!!' "$(call app greet)"
ok "a file beside an import is readable at call time" "v1" "$(call app version)"

say "3. how wide the context is"
# A module that derives nothing gets its own directory and nothing else, so the
# engine does narrow. A module that derives anything gets its whole context root
# instead: the `include` the generated member passes has no effect on beta.18,
# which is the open defect this scenario pins. See the README.
ok "the control sees only itself" "bare" "$(call bare siblings)"
ok "the control cannot read ../shared" "no such file or directory" "$(call bare version)"
siblings=$(call app siblings)
ok "a deriving module gets the directory it imports" "shared" "$siblings"
ok "and the one that directory imports in turn" "deeper" "$siblings"
ok "DEFECT: and everything else in the workspace with them" "dagger.toml" "$siblings"
# The repository above this workspace is still out: the context root is the
# nearest .git, and the module ran from /workspace/typescript/include-resources.
absent "the repository above the workspace stays out" "go" "$siblings"

say "3b. gitignored paths stay out"
# The half of the narrowing that does work, and the one that matters most:
# `gitignore: true` on the read keeps a secret out of the container even though
# it sits inside the module's context root.
printf 'ROOT_SECRET=leaked\n' >.env
mkdir -p secrets && printf 'token\n' >secrets/token.txt
siblings=$(call app siblings)
absent "a gitignored file does not reach the container" ".env" "$siblings"
absent "nor a gitignored directory" "secrets" "$siblings"
restore

say "4. a changed file gives a new cache key"
# Each `dagger call` is its own session, so a result cached from the first one
# would come back here — and did, before the engine keyed calls on these files.
printf 'v2-changed\n' >"$VERSION"
ok "the second session sees the new content" "v2-changed" "$(call app version)"
restore
ok "and back again when it is restored" "v1" "$(call app version)"

say "5. a path that leaves the workspace"
# Nothing above the workspace root can be read, so no derived path would make
# this module build: generation fails naming the config that asked. A tsconfig
# extends rather than an import, because an import is only derived once it
# resolves to a file that exists, and nothing above the root ever does — which
# makes the refusal unreachable from an import.
python3 - <<'PY'
import json
p = "app/tsconfig.json"
d = json.load(open(p))
d["extends"] = "../../../../../../outside.json"
json.dump(d, open(p, "w"), indent=2)
PY
ok "generation refuses it" "outside the workspace root" "$(generate)"
restore

say "result"
printf '  %d passed, %d failed\n\n' "$pass" "$fail"
[[ $fail -eq 0 ]]
