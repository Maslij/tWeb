#!/bin/bash
set -e

# Configuration
AWS_REGION="ap-southeast-2"
ECR_REGISTRY="246261010633.dkr.ecr.ap-southeast-2.amazonaws.com"
ECR_REPOSITORY="bbweb-jetson"
IMAGE_TAG=$(date +%Y%m%d-%H%M%S)

# Extract version from package.json
APP_VERSION=$(grep -o '"version": *"[^"]*"' package.json | sed 's/"version": *"\(.*\)"/\1/')
# Get git commit hash for build ID
BUILD_ID=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "Building and deploying tWeb ARM64 image to ECR..."
echo "Repository: ${ECR_REGISTRY}/${ECR_REPOSITORY}"
echo "Tag: ${IMAGE_TAG}"
echo "App Version: ${APP_VERSION}"
echo "Build ID: ${BUILD_ID}"
echo "Full Version: v${APP_VERSION}-${BUILD_ID}"

# Authenticate Docker to ECR
echo "Authenticating with AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Check if repository exists, create if not
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}

# Set up Docker Buildx for multi-architecture builds
echo "Setting up Docker Buildx..."
docker buildx inspect tweb-builder >/dev/null 2>&1 || docker buildx create --name tweb-builder --platform linux/arm64
docker buildx use tweb-builder
docker buildx inspect --bootstrap

# Build and push the image - passing the version information as build args
echo "Building and pushing Docker image for ARM64 (NVIDIA Jetson)..."
docker buildx build --platform linux/arm64 \
  --build-arg APP_VERSION="${APP_VERSION}" \
  --build-arg BUILD_ID="${BUILD_ID}" \
  --tag ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG} \
  --tag ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest \
  --push \
  .

echo "Deployment completed successfully!"
echo "Image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "Image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
echo ""
echo "App version baked into image: v${APP_VERSION}-${BUILD_ID}"
echo ""
echo "To pull this image on your Jetson device:"
echo "1. Authenticate with ECR:"
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
echo ""
echo "2. Pull the image:"
echo "   docker pull ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
echo ""
echo "3. Run the container:"
echo "   docker run --rm -it -p 80:80 ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest" 