#!/usr/bin/env bash
# Run N module calls at once and report the engine container's peak memory.
#
#   ./parallel.sh v1.0.0-beta.24 8 void
#   ./parallel.sh v1.0.0-beta.24 8 container
#
# void      — each runtime awaits its container (what a v1 Void check must do)
# container — each runtime returns the container and exits; the engine syncs it
set -uo pipefail

release="${1:?usage: parallel.sh <engine-release> <n> <void|container> [bundled|standalone]}"
n="${2:?}"
style="${3:?}"
sdk="${4:-bundled}"
engine="dagger-engine-${release}"
stamp="$(date +%s)"

here="$(cd "$(dirname "$0")" && pwd)"
case "$sdk" in
bundled) cd "$here" && sel=(-m mem) && recv=() ;;
standalone) cd "$here/mem-std" && sel=() && recv=(mem-std) ;;
*)
  echo "unknown sdk $sdk" >&2
  exit 2
  ;;
esac

export DAGGER_LEAVE_OLD_ENGINE=1

samples="$(mktemp)"
(
  while :; do
    docker stats --no-stream --format '{{.MemUsage}}' "$engine" 2>/dev/null |
      awk '{print $1}'
    sleep 1
  done
) >"$samples" &
sampler=$!
trap 'kill $sampler 2>/dev/null' EXIT

sleep 2
echo "idle: $(tail -1 "$samples")"

pids=()
for i in $(seq 1 "$n"); do
  case "$style" in
  void) args=(api call "${recv[@]}" void-style --tag="${style}-${stamp}-${i}") ;;
  container) args=(api call "${recv[@]}" container-style --tag="${style}-${stamp}-${i}" sync) ;;
  *)
    echo "unknown style $style" >&2
    exit 2
    ;;
  esac
  dagger --x-release="$release" "${sel[@]}" "${args[@]}" >/dev/null 2>&1 &
  pids+=($!)
done
# Only the calls: a bare `wait` would also wait on the sampler loop.
wait "${pids[@]}"

kill "$sampler" 2>/dev/null
echo "peak: $(sort -h "$samples" | tail -1)  (${n} parallel, style=${style}, sdk=${sdk})"
rm -f "$samples"
