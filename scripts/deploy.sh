#!/usr/bin/env bash
#
# Builds and restarts the three apps on the VPS from whatever is currently
# checked out. It deliberately does no git work of its own — /usr/local/bin/
# goldbd-deploy on the server fetches and resets first, then execs this, so a
# pull can never rewrite the script while bash is still reading it.
#
# Usage: scripts/deploy.sh [api|wallet|commerce|all]   (default: all)
#
# The builds run one after another on purpose: the box has 1 GB of RAM plus
# swap, and two Next builds at once will OOM.
set -euo pipefail

TARGET="${1:-all}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Next needs the headroom on a 1 GB box; the default heap is smaller than the
# build's peak.
export NODE_OPTIONS="--max-old-space-size=1536"

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }

deploy_api() {
  step "wallet API: deps, migrations, restart"
  cd "$REPO/gold_wallet/server"
  npm ci --omit=dev
  npm run migrate
  pm2 restart gold-api --update-env
}

deploy_wallet() {
  step "wallet client: deps, build, restart"
  cd "$REPO/gold_wallet/client"
  npm ci
  npm run build
  pm2 restart gold-wallet --update-env
}

deploy_commerce() {
  step "commerce: deps, build, restart"
  cd "$REPO/gold_commerce"
  npm ci
  npm run build
  pm2 restart gold-commerce --update-env
}

case "$TARGET" in
  api) deploy_api ;;
  wallet) deploy_wallet ;;
  commerce) deploy_commerce ;;
  all)
    deploy_api
    deploy_wallet
    deploy_commerce
    ;;
  *)
    echo "Unknown target: $TARGET (expected api, wallet, commerce or all)" >&2
    exit 2
    ;;
esac

# Keeps the saved process list (what pm2 resurrects on reboot) in step with
# what is actually running.
pm2 save
step "deployed: $(git -C "$REPO" log --oneline -1)"
