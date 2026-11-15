#!/usr/bin/env node
// AnimaArgenta: registro publico para asociar cada moneda fisica a una URL estable.
// Solo genera vistas previas locales: NO publica ni firma/emite tokens.
import {readFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(fileURLToPath(new URL('..', import.meta.url)));
const args=process.argv.slice(2);
function option(flag, fallback){let p=args.indexOf(flag);return p<0?fallback:args[p+1];}
const src=resolve(option('--manifest',join(ROOT,'registro/publico.json')));
const out=resolve(option('--output',join(ROOT,'registry-preview')));
const check=args.includes('--check');
const BASE='https://animaargenta.com';
const idPattern=/^AA-\d{6}$/;
const hashPattern=/^[a-f0-9]{64}$/;
const addrPattern=/^G[A-Z2-7]{55}$/;
const allowed=new Set(['id','title','country','denomination','year','metal','mint','measurements','edge','photos','evidence','token']);
const privateKeys=new Set(['purchase_price','purchase_cost','storage_location','custody_location','box','tray','acquisition_source','private_notes','owner_address','owner_email','owner_phone','seed','secret']);
const throwError=(message)=>{throw new Error(message);};
const text=(s)=>typeof s==='string' && s.trim().length>0 && s.length<=220;
const escape=(s)=>String(s??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=(p,obj)=>writeFileSync(p,JSON.stringify(obj,null,2)+'\n');

const data=JSON.parse(readFileSync(src,'utf8'));
if(!Array.isArray(data))throwError('El registro publico debe ser un array JSON');
const galleryPath=join(ROOT,'data/nfts.json');
const tomlPath=join(ROOT,'.well-known/stellar.toml');
const oldIDs=existsSync(galleryPath)?new Set(JSON.parse(readFileSync(galleryPath,'utf8')).map(v=>String(v.id).toUpperCase())):new Set();
const oldCodes=existsSync(tomlPath)?new Set([...readFileSync(tomlPath,'utf8').matchAll(/^code = "([A-Z0-9]+)"/gm)].map(m=>m[1])):new Set();
const ids=new Set(), codes=new Set();
const labels=[];

for(const [i, coin] of data.entries()){
  const where='Pieza '+(i+1);
  if(!coin||typeof coin!=='object'||Array.isArray(coin))throwError(where+': objeto invalido');
  for(const key of Object.keys(coin)){
    if(privateKeys.has(key))throwError(where+': no se publica '+key);
    if(!allowed.has(key))throwError(where+': propiedad desconocida '+key);
  }
  if(!idPattern.test(coin.id))throwError(where+': ID debe ser AA-000001 a AA-999999');
  const code=coin.id.replaceAll('-','');
  if(ids.has(coin.id)||oldIDs.has(coin.id.toUpperCase())||codes.has(code)||oldCodes.has(code))throwError(where+': identificador o codigo Stellar duplicado');
  ids.add(coin.id);codes.add(code);
  for(const key of ['title','country','denomination'])if(!text(coin[key]))throwError(where+': falta '+key);
  if(!(coin.year===null||(Number.isInteger(coin.year)&&coin.year>=1&&coin.year<=2100)))throwError(where+': year invalido');
  for(const key of ['metal','mint','edge'])if(coin[key]!==undefined&&!text(coin[key]))throwError(where+': '+key+' invalido');
  if(coin.measurements!==undefined){
    if(!coin.measurements||typeof coin.measurements!=='object'||Array.isArray(coin.measurements))throwError(where+': medidas invalidas');
    for(const [k,v] of Object.entries(coin.measurements)){
      if(!['weight_g','diameter_mm','thickness_mm'].includes(k)||typeof v!=='number'||!Number.isFinite(v)||v<=0||v>2000)throwError(where+': medida '+k+' invalida');
    }
  }
  if(coin.photos!==undefined){
    if(!coin.photos||typeof coin.photos!=='object'||Array.isArray(coin.photos))throwError(where+': fotos invalidas');
    for(const [side,p] of Object.entries(coin.photos)){
      if(!['front','back','edge'].includes(side)||!p||!text(p.url)||!p.url.startsWith(BASE+'/')||/[?#]/.test(p.url)||!hashPattern.test(p.sha256??'')||Object.keys(p).some(k=>!['url','sha256'].includes(k)))throwError(where+': foto/hash invalido en '+side);
    }
    if(Boolean(coin.photos.front)!==Boolean(coin.photos.back))throwError(where+': anverso y reverso deben ir juntos');
  }
  if(coin.evidence!==undefined&&(!coin.evidence||!hashPattern.test(coin.evidence.sha256??'')||Object.keys(coin.evidence).some(k=>k!=='sha256')))throwError(where+': huella de expediente invalida');
  const token=coin.token;
  if(!token||typeof token!=='object'||!['not_issued','reference_recorded'].includes(token.status))throwError(where+': estado de token invalido');
  if(token.status==='not_issued'&&Object.keys(token).some(k=>k!=='status'))throwError(where+': token sin emitir no puede contener referencias on-chain');
  if(token.status==='reference_recorded'){
    if(Object.keys(token).some(k=>!['status','asset_code','issuer','tx_hash'].includes(k)))throwError(where+': campo token desconocido');
    if(token.asset_code!==code||!addrPattern.test(token.issuer??'')||!hashPattern.test(token.tx_hash??'')||!coin.evidence?.sha256||!coin.photos?.front||!coin.photos?.back)throwError(where+': faltan datos para vincular Stellar');
  }
  labels.push({id:coin.id,url:BASE+'/aa/'+coin.id+'/',title:coin.title,subtitle:[coin.country,coin.denomination,coin.year??'s/f'].join(' / '),metal:coin.metal??null,measurements:coin.measurements??{}});
}
if(check){console.log('Registro verificado: '+data.length+' piezas; sin duplicados ni datos de custodia');process.exit(0);}

function page(coin){
  const url=BASE+'/aa/'+coin.id+'/';
  const values=[
    ['Pais',coin.country],['Valor facial',coin.denomination],['Ano',coin.year??'Pendiente'],
    ['Metal',coin.metal??'Pendiente'],['Ceca',coin.mint??'Pendiente'],
    ['Peso medido',coin.measurements?.weight_g?coin.measurements.weight_g+' g':'No registrado'],
    ['Diametro medido',coin.measurements?.diameter_mm?coin.measurements.diameter_mm+' mm':'No registrado'],
    ['Grosor medido',coin.measurements?.thickness_mm?coin.measurements.thickness_mm+' mm':'No registrado'],
    ['Canto',coin.edge??'No registrado'],
  ];
  const row=(k,v)=>'<dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd>';
  const fig=(side,label)=>coin.photos?.[side]?'<figure><img src="'+escape(coin.photos[side].url)+'" alt="'+escape(label)+'"><figcaption>'+escape(label)+'</figcaption></figure>':'';
  let status='<p>Moneda registrada; todavia no se ha emitido ningun token asociado.</p>';
  if(coin.token.status==='reference_recorded')status='<p>Referencia Stellar anotada; requiere verificacion independiente en blockchain.</p><dl>'+row('Activo',coin.token.asset_code)+row('Emisor',coin.token.issuer)+row('Transaccion',coin.token.tx_hash)+'</dl>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(coin.id)+' · '+escape(coin.title)+' | AnimaArgenta</title><link rel="canonical" href="'+url+'"><meta name="robots" content="noindex"><meta name="description" content="Registro de una moneda fisica en AnimaArgenta."><style>body{margin:0;background:#101216;color:#eee;font:16px/1.6 system-ui,sans-serif}main{max-width:800px;margin:auto;padding:34px 22px 90px}a{color:#c4d8e4}h1{font:normal clamp(30px,7vw,48px)/1.2 Georgia,serif}.id{letter-spacing:.2em;color:#d7b38a}.dim,dt,figcaption{color:#aab0b2}.panel{margin-top:24px;padding:20px;border:1px solid #414549;border-radius:12px;background:#181c20}dl{display:grid;grid-template-columns:160px 1fr;gap:7px 16px}dd{margin:0;overflow-wrap:anywhere}figure{margin:0}figcaption{font-size:13px}img{max-width:100%;border-radius:9px}.images{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:520px){dl{grid-template-columns:1fr}.images{grid-template-columns:1fr}}</style></head><body><main><a href="'+BASE+'/gallery/">AnimaArgenta</a><p class="id">IDENTIDAD FISICA · '+escape(coin.id)+'</p><h1>'+escape(coin.title)+'</h1><p class="dim">Registro de un ejemplar fisico, no certificado automatico de autenticidad.</p><div class="images">'+fig('front','Anverso')+fig('back','Reverso')+'</div><div>'+fig('edge','Canto')+'</div><section class="panel"><h2>Ficha numismatica</h2><dl>'+values.map(v=>row(v[0],v[1])).join('')+'</dl></section><section class="panel"><h2>Identidad permanente</h2><dl>'+row('ID',coin.id)+row('URL',url)+(coin.evidence?.sha256?row('Expediente SHA-256',coin.evidence.sha256):'')+'</dl></section><section class="panel"><h2>Estado digital</h2>'+status+'</section><p class="dim">Vista previa local; este sistema no emite tokens.</p></main></body></html>\n';
}
mkdirSync(out,{recursive:true});
for(const coin of data){const folder=join(out,'aa',coin.id);mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'index.html'),page(coin));}
save(join(out,'labels.json'),labels);
save(join(out,'manifest.json'),data);
console.log('Vista previa generada: '+data.length+' fichas. No se ha publicado ni emitido nada.');
