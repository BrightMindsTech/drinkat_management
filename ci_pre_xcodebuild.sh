#!/bin/sh
# Runs immediately before xcodebuild — safety net if Pods are still missing.
set -eu

REPO="${CI_PRIMARY_REPOSITORY_PATH:-.}"
cd "$REPO"

XCCONFIG="ios/App/Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig"
if [ -f "$XCCONFIG" ]; then
  echo "ci_pre_xcodebuild: Pods already present, skipping"
  exit 0
fi

echo "ci_pre_xcodebuild: Pods missing — npm + pod install"
if ! npm ci; then
  npm install
fi
cd ios/App
pod install

if [ ! -f "Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig" ]; then
  echo "ci_pre_xcodebuild: ERROR Pods xcconfig still missing"
  exit 1
fi
echo "ci_pre_xcodebuild: OK"
