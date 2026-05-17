#!/usr/bin/env node
/**
 * Guards Prisma runtime selection — run before deploy (`npm run verify:prisma`).
 * Prevents repeating the production outage where D1 was skipped on Workers.
 */
import { resolvePrismaRuntime } from '../src/lib/prisma-resolve-runtime.ts';

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL: ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
    process.exit(1);
  }
}

// Cloudflare production: empty DATABASE_URL + D1 binding
assertEqual(
  resolvePrismaRuntime({ databaseUrl: '', isNodeJs: false, hasD1Binding: true }),
  'd1',
  'production Worker with D1'
);

// Broken deploy we hit: empty URL, no D1 detected (would crash dashboard)
assertEqual(
  resolvePrismaRuntime({ databaseUrl: '', isNodeJs: false, hasD1Binding: false }),
  'misconfigured',
  'Worker without D1 must fail fast'
);

// Local Node dev
assertEqual(
  resolvePrismaRuntime({ databaseUrl: 'file:./prisma/dev.db', isNodeJs: true, hasD1Binding: false }),
  'node-file',
  'local file DATABASE_URL'
);

// D1 wins on Worker even if a stale file: URL is bundled (DATABASE_URL must be "" in wrangler)
assertEqual(
  resolvePrismaRuntime({ databaseUrl: '', isNodeJs: false, hasD1Binding: true }),
  'd1',
  'D1 preferred over empty URL on Worker'
);

console.log('OK: prisma runtime selection tests passed');
