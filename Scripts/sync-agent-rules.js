#!/usr/bin/env node
/**
 * Generates each service's .agents/rules/*.md files from the canonical
 * root Rules/ hierarchy, per the mapping declared in
 * Rules/_sync/service-manifest.json.
 *
 * Root Rules/ is read-only to this script. It never writes there.
 * It never touches application code, Dockerfiles, or package.json files.
 * It only overwrites the exact target filenames declared in the config.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'Rules', '_sync', 'service-manifest.json');

// Filenames each service is approved to receive. Config targets outside
// this set are rejected as a CONFIG ERROR, independent of what the config
// file itself says — this is the enforcement of "preserve exact filenames"
// at the tooling level, not just by convention.
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

  const errors = validateConfig(config, REPO_ROOT);
  if (errors.length) {
    console.error('CONFIG ERROR:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  let written = 0;
  for (const m of config.mappings) {
    const svc = config.services[m.service];
    const outPath = path.join(REPO_ROOT, svc.path, m.target);
    const content = generateContent(m, REPO_ROOT);
    fs.writeFileSync(outPath, content, 'utf8');
    console.log(`GENERATED: ${path.relative(REPO_ROOT, outPath)}`);
    written++;
  }

  console.log(`\n${written} file(s) generated from ${path.relative(REPO_ROOT, CONFIG_PATH)}.`);
  process.exit(0);
}

main();
