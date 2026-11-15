#!/usr/bin/env node
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'aa-registry-'));
const path=join(dir,'data.json');
const output=join(dir,'out');
const script=new URL('./coin-registry.mjs',import.meta.url).pathname;
const coin=()=>({id:'AA-000123',title:'Moneda de prueba',country:'Italia',denomination:'5 lire',year:1874,metal:'Plata 900',measurements:{weight_g:24.84,diameter_mm:37.1},token:{status:'not_issued'}});
function run(arr,preview=false){
  writeFileSync(path,JSON.stringify(arr));
  return spawnSync(process.execPath,[script,preview?'--preview':'--check','--manifest',path,'--output',output],{encoding:'utf8'});
}
assert.equal(run([]).status,0);
assert.equal(run([coin()]).status,0);
assert.equal(run([coin()],true).status,0);
assert.ok(existsSync(join(output,'aa','AA-000123','index.html')));
assert.equal(JSON.parse(readFileSync(join(output,'labels.json'),'utf8'))[0].url,'https://animaargenta.com/aa/AA-000123/');
for(const arr of [[coin(),coin()],[{...coin(),storage_location:'caja1'}],[{...coin(),token:{status:'reference_recorded'}}],[{...coin(),id:'AA-1881-01'}]])assert.notEqual(run(arr).status,0);
console.log('Registro: 8 comprobaciones superadas.');
