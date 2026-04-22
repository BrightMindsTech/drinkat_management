#!/bin/sh
# Xcode Cloud: repo has no ios/App/Pods (gitignored). Install JS deps, then CocoaPods.
set -e

REPO="${CI_PRIMARY_REPOSITORY_PATH:-.}"
cd "$REPO"

echo "ci_post_clone: npm ci"
npm ci

echo "ci_post_clone: pod install (ios/App)"
cd ios/App
pod install
