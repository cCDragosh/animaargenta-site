#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_PATHS = [
  '.well-known/stellar.toml',
  'data',
  'nfts',
  'scripts/nft-batch.mjs',
];
const TEXT_EXTENSIONS = new Set(['.html', '.json', '.mjs', '.toml']);
const INACCURATE_CLAIMS = [
  /emisi[oó]n bloqueada/iu,
  /emisi[oó]n cerrada/iu,
  /emisi[oó]n fijada/iu,
  /no reemitible/iu,
  /no se reemitir[aá]/iu,
  /sin reemisi[oó]n/iu,
];

const files = [];
const collect = (relativePath) => {
  const absolutePath = join(ROOT, relativePath);
  if (statSync(absolutePath).isDirectory()) {
    for (const entry of readdirSync(absolutePath)) collect(join(relativePath, entry));
    return;
  }
  if (TEXT_EXTENSIONS.has(extname(relativePath))) files.push(relativePath);
};

for (const relativePath of SCAN_PATHS) collect(relativePath);

const errors = [];
for (const relativePath of files) {
  const contents = readFileSync(join(ROOT, relativePath), 'utf8');
  const lines = contents.split('\n');
  for (const [index, line] of lines.entries()) {
    if (INACCURATE_CLAIMS.some((claim) => claim.test(line))) {
      errors.push(`${relativePath}:${index + 1}: afirmación de bloqueo o suministro inmutable no demostrada`);
    }
  }
}

const stellarToml = readFileSync(join(ROOT, '.well-known/stellar.toml'), 'utf8');
const currencyCount = (stellarToml.match(/^\[\[CURRENCIES\]\]$/gmu) ?? []).length;
const conditionCount = (stellarToml.match(/^conditions\s*=/gmu) ?? []).length;
if (currencyCount === 0) errors.push('.well-known/stellar.toml no contiene activos.');
if (conditionCount !== currencyCount) {
  errors.push(`.well-known/stellar.toml contiene ${currencyCount} activos y ${conditionCount} condiciones.`);
}

if (errors.length) {
  console.error('Política Stellar inválida:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Política Stellar verificada: ${currencyCount} activos sin afirmaciones de bloqueo no demostradas.`);
