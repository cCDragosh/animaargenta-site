import { readFileSync, existsSync } from 'node:fs';
const root = 'https://animaargenta.com';
const sitemap = readFileSync('sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!urls.length || new Set(urls).size !== urls.length) throw Error('Sitemap empty or duplicate URLs');
const expected = ['/', '/gallery/', ...JSON.parse(readFileSync('data/nfts.json', 'utf8')).map(nft => '/nfts/' + nft.id + '/')];
for (const path of expected) {
  const url = root + path;
  const file = (path === '/' ? '' : path) + 'index.html';
  const localFile = file.startsWith('/') ? file.slice(1) : file;
  if (!existsSync(localFile)) throw Error('Missing page: ' + localFile);
  if (!urls.includes(url)) throw Error('Sitemap missing: ' + url);
  const html = readFileSync(localFile, 'utf8');
  const canonical = '<link rel="canonical" href="' + url + '">';
  if (!html.includes(canonical)) throw Error('Missing canonical: ' + localFile);
  if (!html.includes('property="og:image"')) throw Error('Missing sharing image: ' + localFile);
}
if (urls.length !== expected.length) throw Error('Sitemap includes unlisted redirect or stale page');
console.log('SEO contract verified: ' + expected.length + ' canonical pages');
