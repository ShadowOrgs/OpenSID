#!/usr/bin/env bash
# ============================================================
# OpenSID - Build & Push Docker Image
# ============================================================
# Cara pakai:
#   1. chmod +x scripts/docker-build-push.sh
#   2. export DOCKERHUB_USERNAME="username-kamu"
#   3. export DOCKERHUB_TOKEN="dckr_pat_xxxxxxxxx"
#      (atau jalankan `docker login` dulu sebelum script ini)
#   4. ./scripts/docker-build-push.sh
#
# Override versi / platform:
#   IMAGE_TAG=2607.0.0 PLATFORMS=linux/amd64 ./scripts/docker-build-push.sh
# ============================================================

set -euo pipefail

# --- Konfigurasi (override via env) ----------------------------------
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-sikassep}"
IMAGE_NAME="${IMAGE_NAME:-opensid}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
PUSH="${PUSH:-true}"   # set PUSH=false kalau cuma mau build lokal

# Versi otomatis di-detect dari source code (override dengan IMAGE_TAG)
if [ "$IMAGE_TAG" = "latest" ] && [ -f "donjo-app/helpers/opensid_helper.php" ]; then
  DETECTED_VERSION=$(grep -oE "VERSION', '[0-9]+\.[0-9]+\.[0-9]+'" donjo-app/helpers/opensid_helper.php | head -1 | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" || echo "")
  if [ -n "$DETECTED_VERSION" ]; then
    IMAGE_TAG="$DETECTED_VERSION"
    echo ">> Versi terdeteksi dari source: $IMAGE_TAG"
  fi
fi

FULL_IMAGE="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
LATEST_IMAGE="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:latest"

# --- Pre-check --------------------------------------------------------
echo "============================================================"
echo " OpenSID Docker Build & Push"
echo "============================================================"
echo "  Image      : $FULL_IMAGE"
echo "  Latest tag : $LATEST_IMAGE"
echo "  Platforms  : $PLATFORMS"
echo "  Push       : $PUSH"
echo "============================================================"

if [ "$DOCKERHUB_USERNAME" = "YOUR_DOCKERHUB_USERNAME" ]; then
  echo ""
  echo "[ERROR] Set DOCKERHUB_USERNAME dulu!"
  echo "        export DOCKERHUB_USERNAME=\"username-kamu\""
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker belum terinstall."
  exit 1
fi

# --- Setup buildx (untuk multi-platform) ------------------------------
echo ""
echo ">> [1/5] Setup docker buildx..."
docker buildx inspect opensid-builder >/dev/null 2>&1 || \
  docker buildx create --name opensid-builder --driver docker-container --use
docker buildx use opensid-builder

# --- Login ke Docker Hub ---------------------------------------------
if [ "$PUSH" = "true" ]; then
  echo ""
  echo ">> [2/5] Login ke Docker Hub..."
  if [ -n "${DOCKERHUB_TOKEN:-}" ]; then
    echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
  elif [ -t 0 ]; then
    # Hanya login interaktif kalau stdin adalah TTY
    docker login -u "$DOCKERHUB_USERNAME"
  else
    # Non-TTY (CI/Docker Desktop) — pakai credential manager yang sudah ada
    echo "    (skip login, pakai credential manager Docker Desktop)"
  fi
else
  echo ""
  echo ">> [2/5] Skip login (PUSH=false)"
fi

# --- Build -----------------------------------------------------------
echo ""
echo ">> [3/5] Build image..."
BUILD_ARGS=(
  --platform "$PLATFORMS"
  --tag "$FULL_IMAGE"
  --tag "$LATEST_IMAGE"
  --label "org.opencontainers.image.title=OpenSID"
  --label "org.opencontainers.image.version=${IMAGE_TAG}"
  --label "org.opencontainers.image.source=https://github.com/OpenSID/OpenSID"
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
)

if [ "$PUSH" = "true" ]; then
  BUILD_ARGS+=(--push)
else
  BUILD_ARGS+=(--load)
  # --load hanya support single platform
  if [[ "$PLATFORMS" == *","* ]]; then
    echo "[WARN] PUSH=false tapi PLATFORMS multi-arch. Build hanya untuk $PLATFORMS pertama."
    BUILD_ARGS=(--platform "${PLATFORMS%%,*}" "${BUILD_ARGS[@]}")
  fi
fi

docker buildx build "${BUILD_ARGS[@]}" .

# --- Ringkasan -------------------------------------------------------
echo ""
echo "============================================================"
echo " Selesai!"
echo "============================================================"
echo "  Image : $FULL_IMAGE"
echo "  Latest: $LATEST_IMAGE"
echo ""
if [ "$PUSH" = "true" ]; then
  echo "Cara deploy di server:"
  echo "  docker pull $FULL_IMAGE"
  echo "  docker run -d --name opensid -p 80:80 \\"
  echo "    -e APP_URL=https://desa.commitflow.space \\"
  echo "    -e DATABASE_URL='mysql://user:pass@host:3306/db?charset=utf8mb4' \\"
  echo "    -e TRUSTED_HOSTS=desa.commitflow.space \\"
  echo "    -v opensid_desa:/var/www/html/desa \\"
  echo "    -v opensid_storage:/var/www/html/storage \\"
  echo "    $FULL_IMAGE"
fi
