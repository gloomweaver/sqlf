#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE_DIR="$ROOT_DIR/examples/basic"
SERVER_LOG="${TMPDIR:-/tmp}/sqlf-example-smoke.log"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi

  cd "$EXAMPLE_DIR"
  docker compose down -v >/dev/null 2>&1 || true
}

trap cleanup EXIT

cd "$ROOT_DIR"

PNPM=(corepack pnpm)

if [[ "${SQLF_SKIP_BUILD:-0}" != "1" ]]; then
  "${PNPM[@]}" exec vp run -r build
fi

"${PNPM[@]}" --dir "$EXAMPLE_DIR" run generate

cd "$EXAMPLE_DIR"
node --experimental-strip-types ./src/server.ts >"$SERVER_LOG" 2>&1 &
server_pid="$!"

for _ in {1..30}; do
  if curl -sf http://127.0.0.1:3000/users >/dev/null; then
    break
  fi
  sleep 1
done

curl -sf http://127.0.0.1:3000/users >/dev/null
curl -sf http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111 >/dev/null
curl -sf -X POST http://127.0.0.1:3000/users \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com"}' >/dev/null
