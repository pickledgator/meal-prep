#!/usr/bin/env bash
# Deploy meal-prep to Fly.io (config in fly.toml). Runnable from anywhere —
# it cd's to its own directory so fly.toml / .env resolve.
#
#   ./deploy.sh            build + deploy the app (default)
#   ./deploy.sh secrets    push runtime secrets from .env to Fly
#   ./deploy.sh db         run drizzle-kit push against the Turso DB in .env
#   ./deploy.sh status     fly status
#   ./deploy.sh logs       tail fly logs
#   ./deploy.sh open       open the site in a browser
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' not on PATH" >&2; exit 1; }; }

deploy() {
  need fly
  echo "==> fly deploy"
  fly deploy --remote-only
  echo "==> done"
  fly status
}

secrets() {
  need fly
  [ -f .env ] || { echo "error: .env not found (copy .env.example)" >&2; exit 1; }
  echo "==> pushing runtime secrets from .env"
  grep -E '^(TURSO_DATABASE_URL|TURSO_AUTH_TOKEN|APP_PASSWORD)=..*' .env | fly secrets import
}

db() {
  echo "==> drizzle-kit push against the DB in .env"
  set -a; source .env; set +a
  (cd server && pnpm exec drizzle-kit push)
}

case "${1:-deploy}" in
  deploy)  deploy ;;
  secrets) secrets ;;
  db)      db ;;
  status)  need fly; fly status ;;
  logs)    need fly; fly logs ;;
  open)    need fly; fly open ;;
  *) echo "usage: $0 [deploy|secrets|db|status|logs|open]" >&2; exit 2 ;;
esac
