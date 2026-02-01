#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# 1) Берём Node >=19 (у вас он есть в /nix/store)
NODE="$(
  ls -1 /nix/store/*nodejs*/bin/node 2>/dev/null \
  | grep -E 'nodejs-(19|20|21|22|23|24)' \
  | sort -V \
  | tail -n 1
)"

if [ -z "$NODE" ]; then
  echo "ERROR: Node >=19 not found in /nix/store"
  exit 1
fi

# 2) Делаем так, чтобы /usr/bin/env node находил нужный node
export PATH="$(dirname "$NODE"):$PWD/node_modules/.bin:$PATH"

echo "Using node: $(command -v node)"
node -v

# 3) Убиваем старые процессы (на всякий случай)
pkill -f "expo start" || true
pkill -f metro || true

# 4) Проверяем, что зависимости реально есть
if [ ! -f "node_modules/.bin/expo" ]; then
  echo "ERROR: node_modules/.bin/expo not found. Run install first."
  exit 1
fi

# 5) Освобождаем 5000 (без npx)
if [ -f "node_modules/.bin/kill-port" ]; then
  kill-port 5000 || true
fi

# 6) Запуск Expo Web строго на 5000
CI=0 EXPO_NO_DOCTOR=1 expo start -c --web --port 5000 --non-interactive