#!/usr/bin/env node
// Reconcile the fe-admin plugin manifests and stamp the shipped app version.
//
// There are two manifest files with distinct roles that MUST stay in lockstep:
//   - plugins/plugins.json      → the @plugins build-time registry AND the
//                                 dev-install seed source. This is the single
//                                 SOURCE OF TRUTH for the plugin set.
//   - vue/public/plugins.json   → bundled into dist; served at /admin/plugins.json
//                                 as the runtime fetch fallback. Pure DERIVED copy.
//
// Two failure modes this fixes:
//   1. Version drift — the `version` field (shown in the admin UI and exposed at
//      the public /admin/plugins.json) was hand-maintained and rotted to stale
//      "1.0.0" placeholders. Every entry is `"source":"local"` (an in-tree
//      package shipped with this app), so the app's CalVer (package.json version)
//      IS its real shipped version. We stamp it uniformly.
//   2. Set drift — the public copy was edited independently and fell behind the
//      registry (e.g. missing the regional-payment / token-payment / bot-telegram
//      admins). We regenerate it verbatim from the source so the two can never
//      diverge again.
//
// Wiring:
//   Runs as `prebuild` (see package.json) so `npm run build` always emits a
//   correctly-versioned, reconciled dist + seed source. The dev-install recipe
//   seeds var/plugins/fe-admin-plugins.json from plugins/plugins.json, so the
//   live file converges on the next deploy/install (existing var files are
//   version-refreshed separately by recipes/refresh-var-plugin-versions.mjs).
//
// Usage:
//   node bin/stamp-plugin-versions.mjs           # rewrite + reconcile in place
//   node bin/stamp-plugin-versions.mjs --check    # exit 1 if stale/out-of-sync (CI guard)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const SOURCE = 'plugins/plugins.json'; // single source of truth for the set
const DERIVED = 'vue/public/plugins.json'; // generated runtime fallback copy

const appVersion = JSON.parse(
  readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
).version;

if (!appVersion) {
  console.error('stamp-plugin-versions: package.json has no "version"');
  process.exit(2);
}

const sourceAbs = resolve(repoRoot, SOURCE);
const derivedAbs = resolve(repoRoot, DERIVED);

const source = JSON.parse(readFileSync(sourceAbs, 'utf8'));
const entries = source.plugins ?? {};

// 1. Stamp every in-tree plugin's version to the app version.
const stamped = [];
for (const [name, entry] of Object.entries(entries)) {
  if (!entry || entry.source !== 'local') continue; // leave externally-versioned plugins alone
  if (entry.version !== appVersion) {
    stamped.push(`${name} (${entry.version} -> ${appVersion})`);
    entry.version = appVersion;
  }
}

// 2. The derived copy is byte-for-byte the stamped source (same style: 2-space
//    indent + trailing newline). Comparing serialized text catches both version
//    drift and set drift in one shot.
const sourceText = `${JSON.stringify(source, null, 2)}\n`;

let derivedText = '';
try {
  derivedText = readFileSync(derivedAbs, 'utf8');
} catch {
  derivedText = '';
}
const derivedOutOfSync = derivedText !== sourceText;

if (checkOnly) {
  let failed = false;
  if (stamped.length > 0) {
    console.error(`stamp-plugin-versions: ${SOURCE} has stale versions:`);
    for (const line of stamped) console.error(`  - ${line}`);
    failed = true;
  }
  if (derivedOutOfSync) {
    console.error(`stamp-plugin-versions: ${DERIVED} is out of sync with ${SOURCE}.`);
    failed = true;
  }
  if (failed) {
    console.error('stamp-plugin-versions: run "npm run stamp-versions".');
    process.exit(1);
  }
  console.log(`stamp-plugin-versions: manifests reconciled at ${appVersion}.`);
} else {
  if (stamped.length > 0) {
    writeFileSync(sourceAbs, sourceText);
    console.log(`stamp-plugin-versions: ${SOURCE} stamped ${stamped.length} entr${stamped.length === 1 ? 'y' : 'ies'} to ${appVersion}`);
  } else {
    console.log(`stamp-plugin-versions: ${SOURCE} already at ${appVersion}`);
  }
  if (derivedOutOfSync) {
    writeFileSync(derivedAbs, sourceText);
    console.log(`stamp-plugin-versions: ${DERIVED} regenerated from ${SOURCE}`);
  } else {
    console.log(`stamp-plugin-versions: ${DERIVED} already in sync`);
  }
}
