#!/usr/bin/env node
/**
 * Verifies that each service's .agents/rules/*.md files exactly match what
 * Scripts/sync-agent-rules.js would currently generate from the canonical
 * root Rules/ hierarchy, per Rules/_sync/service-manifest.json.
 *
 * Stateless by design: nothing is stored between runs (no .sync-manifest.json,
 * no hashes). Every check recomputes expected content from the current root
 * Rules/ files and compares it to what's on disk right now.
 *
 * Exits non-zero on any of: CONFIG ERROR, MISSING, EXTRA, DRIFT, TAMPER.
 * Exits 0 only if every declared target, for every service, matches exactly.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'Rules', '_sync', 'service-manifest.json');

// Kept identical to Scripts/sync-agent-rules.js on purpose — the verifier
// must recompute exactly what the generator would produce, from the same rules.
const ALLOWED_TARGETS = {
  CloudRun: [
    'architecture.md',
    'operational_instructions.md',
    'metadata_sync_architecture.md',
    'deployment.md',
    'deployment_registry.md'
  ],
  MetadataSync: [
    'architecture.md',
    'operational_instructions.md',
    'metadata_sync_architecture.md',
    'deployment.md',
    'deployment_registry.md',
    '03_VALIDATION.md'
  ],
  SocialPublish: [
    'architecture.md',
    'operational_instructions.md',
    'deployment.md',
    'deployment_registry.md'
  ]
};

function validateConfig(config, repoRoot) {
  const errors = [];

  if (!config.services || typeof config.services !== 'object') {
    errors.push('config.services is missing or not an object');
  }
  if (!Array.isArray(config.mappings)) {
    errors.push('config.mappings is missing or not an array');
  }
  if (errors.length) return errors;

  for (const [name, svc] of Object.entries(config.services)) {
    if (!svc || typeof svc.path !== 'string') {
      errors.push(`service "${name}" is missing a "path" string`);
      continue;
    }
    if (!fs.existsSync(path.join(repoRoot, svc.path))) {
      errors.push(`service "${name}" path does not exist: ${svc.path}`);
    }
  }

  const seenTargets = {};
  config.mappings.forEach((m, i) => {
    if (!m.service || !config.services[m.service]) {
      errors.push(`mappings[${i}] references unknown service "${m.service}"`);
    }
    if (!m.target || typeof m.target !== 'string') {
      errors.push(`mappings[${i}] is missing a "target" string`);
    }
    if (!Array.isArray(m.sources) || m.sources.length === 0) {
      errors.push(`mappings[${i}] is missing a non-empty "sources" array`);
    } else {
      for (const s of m.sources) {
        if (!fs.existsSync(path.join(repoRoot, s))) {
          errors.push(`mappings[${i}] source does not exist: ${s}`);
        }
      }
    }
    if (m.service && m.target) {
      const allowed = ALLOWED_TARGETS[m.service];
      if (!allowed) {
        errors.push(`mappings[${i}] service "${m.service}" has no approved-target list defined in this script`);
      } else if (!allowed.includes(m.target)) {
        errors.push(`mappings[${i}] target "${m.target}" is not in the approved filename set for service "${m.service}"`);
      }
      seenTargets[m.service] = seenTargets[m.service] || new Set();
      if (seenTargets[m.service].has(m.target)) {
        errors.push(`duplicate target "${m.target}" declared twice for service "${m.service}"`);
      }
      seenTargets[m.service].add(m.target);
    }
  });

  return errors;
}

function buildBanner(mapping) {
  const lines = ['<!-- GENERATED FILE — DO NOT EDIT.'];
  if (mapping.sources.length === 1) {
    lines.push('     This file is a generated mirror. Canonical source (repo root):');
    lines.push(`       - ${mapping.sources[0]}`);
  } else {
    lines.push('     Generated mirror combining canonical sources (repo root), concatenated in this order:');
    mapping.sources.forEach((s, i) => lines.push(`       ${i + 1}. ${s}`));
  }
  lines.push('     Regenerate: node Scripts/sync-agent-rules.js');
  lines.push('     Verify:     node Scripts/verify-agent-rules-sync.js');
  lines.push('     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->');
  return lines.join('\n');
}

function buildBody(mapping, repoRoot) {
  const contents = mapping.sources.map((s) =>
    fs.readFileSync(path.join(repoRoot, s), 'utf8').replace(/\s+$/, '')
  );
  if (contents.length === 1) return contents[0];
  let out = contents[0];
  for (let i = 1; i < contents.length; i++) {
    out += `\n\n<!-- ===== End: ${mapping.sources[i - 1]} — Begin: ${mapping.sources[i]} ===== -->\n\n${contents[i]}`;
  }
  return out;
}

function generateContent(mapping, repoRoot) {
  const banner = buildBanner(mapping);
  const body = buildBody(mapping, repoRoot);
  const content = `${banner}\n\n${body}`;
  return content.replace(/\s+$/, '') + '\n';
}

function main() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error(`CONFIG ERROR: could not read/parse ${CONFIG_PATH}`);
    console.error(`  - ${e.message}`);
    process.exit(1);
  }

  const configErrors = validateConfig(config, REPO_ROOT);
  if (configErrors.length) {
    console.error('CONFIG ERROR:');
    configErrors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const failures = [];

  // MISSING / EXTRA — per service, compare declared targets to what's actually on disk.
  for (const [serviceName, svc] of Object.entries(config.services)) {
    const dirPath = path.join(REPO_ROOT, svc.path);
    const declaredTargets = config.mappings
      .filter((m) => m.service === serviceName)
      .map((m) => m.target);

    for (const target of declaredTargets) {
      if (!fs.existsSync(path.join(dirPath, target))) {
        failures.push({
          category: 'MISSING',
          service: serviceName,
          file: target,
          detail: 'declared in service-manifest.json but not present on disk'
        });
      }
    }

    const actualFiles = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
    for (const f of actualFiles) {
      if (!declaredTargets.includes(f)) {
        failures.push({
          category: 'EXTRA',
          service: serviceName,
          file: f,
          detail: 'present on disk but not declared in service-manifest.json'
        });
      }
    }
  }

  // DRIFT / TAMPER — only for files confirmed present above.
  for (const m of config.mappings) {
    const svc = config.services[m.service];
    const outPath = path.join(REPO_ROOT, svc.path, m.target);
    if (!fs.existsSync(outPath)) continue; // already reported as MISSING

    const actual = fs.readFileSync(outPath, 'utf8');
    const expectedBanner = buildBanner(m);
    const bannerIntact = actual.startsWith(expectedBanner);

    if (!bannerIntact) {
      failures.push({
        category: 'TAMPER',
        service: m.service,
        file: m.target,
        detail: 'GENERATED banner missing or altered — file does not match the generator\'s output structure, indicating a direct hand-edit rather than root drift'
      });
      continue;
    }

    const expected = generateContent(m, REPO_ROOT);
    if (actual !== expected) {
      failures.push({
        category: 'DRIFT',
        service: m.service,
        file: m.target,
        detail: 'banner intact, but content no longer matches current root Rules/ source(s) — root has changed since this mirror was last generated'
      });
    }
  }

  if (failures.length) {
    console.error(`VERIFICATION FAILED — ${failures.length} issue(s):\n`);
    for (const f of failures) {
      console.error(`[${f.category}] ${f.service}: ${f.file} — ${f.detail}`);
    }
    process.exit(1);
  }

  console.log('VERIFICATION PASSED — all generated mirrors match current root Rules/ authority.');
  process.exit(0);
}

main();
