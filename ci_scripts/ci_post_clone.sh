#!/bin/sh
# Xcode Cloud expects this at ci_scripts/ci_post_clone.sh (not repo root).
# ios/App/Pods is gitignored — install JS deps (Capacitor pod paths), then CocoaPods.
set -eu

REPO="${CI_PRIMARY_REPOSITORY_PATH:-.}"
cd "$REPO"

echo "ci_post_clone: REPO=$REPO pwd=$(pwd)"

echo "ci_post_clone: npm (prefer ci for lockfile)"
if ! npm ci; then
  echo "ci_post_clone: npm ci failed, trying npm install"
  npm install
fi

echo "ci_post_clone: pod install"
cd ios/App
pod install

XCCONFIG="Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig"
if [ ! -f "$XCCONFIG" ]; then
  echo "ci_post_clone: ERROR missing $XCCONFIG after pod install"
  exit 1
fi
echo "ci_post_clone: OK $XCCONFIG"
