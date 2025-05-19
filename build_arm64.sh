#!/bin/bash
set -e

echo "Setting up Docker Buildx for multi-architecture builds..."

# Create or use existing builder instance
docker buildx inspect tweb-builder >/dev/null 2>&1 || docker buildx create --name tweb-builder --platform linux/arm64
docker buildx use tweb-builder
docker buildx inspect --bootstrap

# Define image name and tag
IMAGE_NAME="tweb"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# Change directory to tWeb where the Dockerfile is located
# We store the original directory to return to it later
ORIGINAL_DIR=$(pwd)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Extract version from package.json
APP_VERSION=$(grep -o '"version": *"[^"]*"' package.json | sed 's/"version": *"\(.*\)"/\1/')
echo "App version from package.json: ${APP_VERSION}"

# Get git commit hash
BUILD_ID=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Build ID (git commit): ${BUILD_ID}"
echo "Full version: v${APP_VERSION}-${BUILD_ID}"

# Build the image for arm64 platform
echo "Building Docker image for ARM64..."
docker buildx build --platform linux/arm64 \
  --build-arg APP_VERSION="${APP_VERSION}" \
  --build-arg BUILD_ID="${BUILD_ID}" \
  --tag ${FULL_IMAGE_NAME} \
  --load \
  .

# Return to original directory
cd "$ORIGINAL_DIR"

echo "Build completed successfully!"
echo "Image: ${FULL_IMAGE_NAME}"
echo "Version: v${APP_VERSION}-${BUILD_ID}"
echo ""
echo "To push this image to ECR, use:"
echo "1. Tag the image:"
echo "   docker tag ${FULL_IMAGE_NAME} 246261010633.dkr.ecr.ap-southeast-2.amazonaws.com/tweb:${IMAGE_TAG}"
echo ""
echo "2. Push the image:"
echo "   docker push 246261010633.dkr.ecr.ap-southeast-2.amazonaws.com/tweb:${IMAGE_TAG}"
echo ""
echo "To run the container locally:"
echo "   docker run --rm -it -p 80:80 ${FULL_IMAGE_NAME}"
echo ""
echo "Or use docker-compose:"
echo "   docker-compose up -d" 