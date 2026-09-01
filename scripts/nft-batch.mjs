#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const manifestArg = args.find((arg) => !arg.startsWith('--'));
const apply = args.includes('--apply');
const withXdr = args.includes('--xdr');

if (!manifestArg) {
  console.error('Uso: node scripts/nft-batch.mjs <lote.json> [--xdr] [--apply]');
  process.exit(1);
}

const manifestPath = resolve(process.cwd(), manifestArg);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const batchDir = dirname(manifestPath);
const outputDir = resolve(ROOT, 'batch-preview', manifest.batch_id);
const issuer = manifest.issuer;
const receiver = manifest.receiver;
const items = manifest.items ?? [];
const errors = [];

const fail = (condition, message) => { if (!condition) errors.push(message); };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const tomlString = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const assetCodePattern = /^[A-Z0-9]{1,12}$/;
const idPattern = /^AA-\d{4}-\d{2}$/;
const slugPattern = /^aa-\d{4}-\d{2}$/;
const stellarAddressPattern = /^G[A-Z2-7]{55}$/;

fail(typeof manifest.batch_id === 'string' && /^[a-z0-9-]+$/.test(manifest.batch_id), 'batch_id inválido.');
fail(stellarAddressPattern.test(issuer ?? ''), 'Emisor Stellar inválido.');
fail(stellarAddressPattern.test(receiver ?? ''), 'Receptor Stellar inválido.');
fail(issuer !== receiver, 'Emisor y receptor deben ser cuentas distintas.');
fail(items.length >= 1 && items.length <= 20, 'El lote debe contener entre 1 y 20 piezas.');
fail(!apply || manifest.approved === true, 'Aplicación bloqueada: falta approved: true tras la revisión visual.');

const existingGallery = JSON.parse(readFileSync(join(ROOT, 'data/nfts.json'), 'utf8'));
const stellarToml = readFileSync(join(ROOT, '.well-known/stellar.toml'), 'utf8');
const seenCodes = new Set();
const seenSlugs = new Set();

for (const [index, item] of items.entries()) {
  const label = `Pieza ${index + 1}`;
  fail(idPattern.test(item.id ?? ''), `${label}: id debe seguir AA-AAAA-NN.`);
  fail(slugPattern.test(item.slug ?? ''), `${label}: slug debe seguir aa-aaaa-nn.`);
  fail(assetCodePattern.test(item.asset_code ?? ''), `${label}: asset_code debe tener 1–12 caracteres A-Z/0-9.`);
  fail(!seenCodes.has(item.asset_code), `${label}: asset_code repetido en el lote.`);
  fail(!seenSlugs.has(item.slug), `${label}: slug repetido en el lote.`);
  fail(!stellarToml.includes(`code = "${item.asset_code}"`), `${label}: asset_code ya publicado.`);
  fail(!existingGallery.some((entry) => entry.id === item.slug), `${label}: slug ya publicado.`);
  for (const field of ['title', 'country', 'denomination', 'story', 'description', 'front_alt', 'back_alt']) {
    fail(typeof item[field] === 'string' && item[field].trim(), `${label}: falta ${field}.`);
  }
  fail(Number.isInteger(item.year) && item.year >= 1 && item.year <= 2100, `${label}: año inválido.`);
  fail(Array.isArray(item.facts) && item.facts.length >= 3, `${label}: incluye al menos tres datos verificables.`);
  for (const side of ['front', 'back']) {
    const source = resolve(batchDir, item.images?.[side] ?? '');
    fail(Boolean(item.images?.[side]) && existsSync(source), `${label}: falta la imagen ${side}.`);
    fail(['.jpg', '.jpeg', '.png', '.webp'].includes(extname(source).toLowerCase()), `${label}: formato de imagen ${side} no permitido.`);
  }
  seenCodes.add(item.asset_code);
  seenSlugs.add(item.slug);
}

if (errors.length) {
  console.error('Lote bloqueado:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const renderPage = (item) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#111111">
  <meta name="description" content="${escapeHtml(item.meta_description ?? item.description)}">
  <title>${escapeHtml(item.title)} — Anima Argenta</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2rem 1rem; background: #111; color: #ddd; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    main { width: min(720px, 100%); margin: auto; }
    .back { display: inline-block; margin-bottom: 1.5rem; color: #bbb; text-decoration: none; }
    .back:hover { color: #fff; }
    h1 { margin: 0 0 .35rem; color: #fff; font-size: clamp(1.7rem, 5vw, 2.5rem); }
    .id { margin: 0 0 1.5rem; color: #888; }
    .faces { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .faces img { display: block; width: 100%; height: auto; border: 1px solid #444; border-radius: 10px; }
    .story { margin: 2rem 0; color: #eee; font: 1.1rem/1.7 Georgia, serif; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: .65rem 1rem; padding: 1.25rem; background: #191919; border: 1px solid #303030; border-radius: 10px; }
    dt { color: #888; } dd { margin: 0; color: #ddd; }
    .seal { margin-top: 1.5rem; color: #888; font-size: .9rem; }
    @media (max-width: 560px) { .faces { grid-template-columns: 1fr; } dl { grid-template-columns: 1fr; gap: .2rem; } dd { margin-bottom: .65rem; } }
  </style>
</head>
<body>
  <main>
    <a class="back" href="../../gallery/">← Volver a la galería</a>
    <h1>${escapeHtml(item.title)}</h1>
    <p class="id">${escapeHtml(item.id)} · edición 1/1</p>
    <div class="faces">
      <img src="front${extname(item.images.front).toLowerCase()}" alt="${escapeHtml(item.front_alt)}">
      <img src="back${extname(item.images.back).toLowerCase()}" alt="${escapeHtml(item.back_alt)}">
    </div>
    <p class="story">${escapeHtml(item.story)}</p>
    <dl>
      ${item.facts.map(({ label, value }) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('\n      ')}
      <dt>Estado digital</dt><dd>${apply ? 'Publicado; pendiente de verificación en cadena' : 'Vista previa; aún no publicado'}</dd>
    </dl>
    <p class="seal">Una moneda física = una pieza digital. Emisión: 1. Sin reemisión.</p>
  </main>
</body>
</html>
`;

const metadataFor = (item) => ({
  id: item.id,
  asset_code: item.asset_code,
  issuer,
  name: item.title,
  collection: 'Anima Argenta',
  denomination: item.denomination,
  country: item.country,
  year: item.year,
  description: item.description,
  image: `https://animaargenta.com/nfts/${item.slug}/front${extname(item.images.front).toLowerCase()}`,
  image_back: `https://animaargenta.com/nfts/${item.slug}/back${extname(item.images.back).toLowerCase()}`,
  edition: '1/1 (this physical object)',
  token_status: 'Prepared; pending on-chain verification',
  created_by: 'Drago',
  sealed_by: 'Anima Argenta',
  tags: item.tags ?? [],
});

mkdirSync(outputDir, { recursive: true });
const previewFiles = [];
for (const item of items) {
  const pageDir = join(outputDir, 'nfts', item.slug);
  mkdirSync(pageDir, { recursive: true });
  const frontExt = extname(item.images.front).toLowerCase();
  const backExt = extname(item.images.back).toLowerCase();
  copyFileSync(resolve(batchDir, item.images.front), join(pageDir, `front${frontExt}`));
  copyFileSync(resolve(batchDir, item.images.back), join(pageDir, `back${backExt}`));
  writeFileSync(join(pageDir, 'index.html'), renderPage(item));
  mkdirSync(join(outputDir, 'data'), { recursive: true });
  writeFileSync(join(outputDir, 'data', `${item.id}.json`), `${JSON.stringify(metadataFor(item), null, 2)}\n`);
  previewFiles.push(`nfts/${item.slug}/`, `data/${item.id}.json`);
}

const stellarPlan = {
  network: 'public', issuer, receiver,
  trustlines: items.map(({ asset_code }) => ({ operation: 'changeTrust', asset_code, issuer, limit: '1' })),
  mint: items.flatMap(({ asset_code }) => [
    { operation: 'setTrustLineFlags', asset_code, issuer, trustor: receiver, set_authorized: true },
    { operation: 'payment', asset_code, issuer, destination: receiver, amount: '1' },
  ]),
  warning: 'Unsigned plan. Review in Stellar Lab; never paste a secret key.',
};
writeFileSync(join(outputDir, 'stellar-plan.json'), `${JSON.stringify(stellarPlan, null, 2)}\n`);
writeFileSync(join(outputDir, 'changes.json'), `${JSON.stringify({ mode: apply ? 'apply' : 'preview', files: previewFiles }, null, 2)}\n`);

if (withXdr) {
  const { Account, Asset, BASE_FEE, Networks, Operation, TransactionBuilder } = await import('@stellar/stellar-sdk');
  const load = async (account) => {
    const response = await fetch(`https://horizon.stellar.org/accounts/${account}`);
    if (!response.ok) throw new Error(`No se pudo cargar ${account} desde Horizon.`);
    return response.json();
  };
  const [receiverAccount, issuerAccount] = await Promise.all([load(receiver), load(issuer)]);
  const trustBuilder = new TransactionBuilder(new Account(receiver, receiverAccount.sequence), { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC });
  for (const item of items) trustBuilder.addOperation(Operation.changeTrust({ asset: new Asset(item.asset_code, issuer), limit: '1' }));
  const trustTx = trustBuilder.setTimeout(86400).build();
  const mintBuilder = new TransactionBuilder(new Account(issuer, issuerAccount.sequence), { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC });
  for (const item of items) {
    const asset = new Asset(item.asset_code, issuer);
    mintBuilder.addOperation(Operation.setTrustLineFlags({ trustor: receiver, asset, flags: { authorized: true } }));
    mintBuilder.addOperation(Operation.payment({ destination: receiver, asset, amount: '1' }));
  }
  const mintTx = mintBuilder.setTimeout(86400).build();
  writeFileSync(join(outputDir, 'trustlines.xdr'), `${trustTx.toXDR()}\n`);
  writeFileSync(join(outputDir, 'mint.xdr'), `${mintTx.toXDR()}\n`);
}

if (apply) {
  for (const item of items) {
    const targetDir = join(ROOT, 'nfts', item.slug);
    mkdirSync(targetDir, { recursive: true });
    for (const file of ['index.html', `front${extname(item.images.front).toLowerCase()}`, `back${extname(item.images.back).toLowerCase()}`]) {
      copyFileSync(join(outputDir, 'nfts', item.slug, file), join(targetDir, file));
    }
    copyFileSync(join(outputDir, 'data', `${item.id}.json`), join(ROOT, 'data', `${item.id}.json`));
    existingGallery.push({
      id: item.slug,
      title: item.title,
      front: `../nfts/${item.slug}/front${extname(item.images.front).toLowerCase()}`,
      back: `../nfts/${item.slug}/back${extname(item.images.back).toLowerCase()}`,
    });
  }
  writeFileSync(join(ROOT, 'data/nfts.json'), `${JSON.stringify(existingGallery, null, 2)}\n`);
  const currencyBlocks = items.map((item) => `\n[[CURRENCIES]]\ncode = ${tomlString(item.asset_code)}\nissuer = ${tomlString(issuer)}\nname = ${tomlString(item.title)}\ndesc = ${tomlString(item.description)}\nconditions = "NFT único. Emisión fijada en 1 unidad. No se reemitirá."\nimage = ${tomlString(`https://animaargenta.com/nfts/${item.slug}/front${extname(item.images.front).toLowerCase()}`)}\nis_asset_anchored = false\ndisplay_decimals = 0\n`).join('');
  writeFileSync(join(ROOT, '.well-known/stellar.toml'), stellarToml.replace('\n[DOCUMENTATION]', `${currencyBlocks}\n[DOCUMENTATION]`));
  const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  const urls = items.map((item) => `  <url>\n    <loc>https://animaargenta.com/nfts/${item.slug}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`).join('');
  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap.replace('</urlset>', `${urls}</urlset>`));
}

console.log(`${apply ? 'Lote aplicado' : 'Vista previa creada'}: ${outputDir}`);
console.log(`Piezas: ${items.length}. Firma o envío automático: NO.`);
