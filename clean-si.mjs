import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isSI,atomic} from './factory.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const backup=path.join(root,'backups','before-SI-removal-'+new Date().toISOString().replace(/[:.]/g,'-'));
let report=[];
function clean(x,file){if(Array.isArray(x)){return x.filter(v=>{if(v&&typeof v==='object'&&(v.question||v.question_en||v.question_hi)&&isSI(v)){report.push({file,id:v.id||null,question:v.question||v.question_en,reason:'SI / physical-unit question'});return false;}return true;}).map(v=>clean(v,file));}if(x&&typeof x==='object'){const y={};for(const [k,v] of Object.entries(x))y[k]=clean(v,file);return y;}return x;}
function walk(dir){if(!fs.existsSync(dir))return;for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory()){if(!['node_modules','backups','evidence'].includes(d.name))walk(f);}else if(d.name.endsWith('.json')){let x;try{x=JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));}catch{throw Error('Invalid JSON; stopped without overwriting: '+f);}const before=report.length;const y=clean(x,path.relative(root,f));if(report.length>before){const b=path.join(backup,path.relative(root,f));fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(f,b);atomic(f,y);}}}}
for(const p of ['public/data','dist/data','data/questions','user-data','deliverables/Ollama_40'])walk(path.join(root,p));
fs.mkdirSync(backup,{recursive:true});atomic(path.join(backup,'REMOVAL_REPORT.json'),{removedAcrossFileCopies:report.length,items:report});
console.log('Removed SI questions from bank files: '+report.length+' (includes mirrored file copies). Backup: '+backup);
