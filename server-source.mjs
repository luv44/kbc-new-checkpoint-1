import {createFactory,isSI,norm} from './factory.mjs';
import {zipEntries} from './backend/zip.mjs';
import {createLive} from './backend/live.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const appRoot=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(appRoot,'dist');
const live=await createLive(appRoot,{noNetwork:process.env.CROREPATI_NO_NETWORK==='1'});
await live.pause(true);
const factory=await createFactory(appRoot);
const preserved=(()=>{const bank=JSON.parse(fs.readFileSync(path.join(root,'data/preserved-bank.json'),'utf8'));const sources=new Map((bank.sources||[]).map(s=>[s.id,s]));return bank.questions.filter(q=>!isSI(q)).map(q=>({...q,sourceUrl:q.sourceUrl||sources.get(q.sourceIds?.[0])?.url||''}));})();
const merge=items=>[...new Map(items.filter(q=>!isSI(q)).map(q=>[q.id||norm(q.question?.en),q])).values()];
const display=q=>({...q,evidenceQuote:q.evidenceQuote||q.factCard?.evidenceQuote||'',sourceUrl:q.sourceUrl||q.factCard?.sourceUrl||'',publisher:q.publisher||'Source / स्रोत'});
const combined=()=>merge([...preserved,...live.questions(),...factory.allQuestions()]).map(display);
const port=Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.ttf':'font/ttf'};
if(!fs.existsSync(path.join(root,'index.html'))){console.error('Built app missing. Run npm ci then npm run build.');process.exit(1);}
const server=http.createServer(async(req,res)=>{
 const validHosts=[`localhost:${port}`,`127.0.0.1:${port}`];
 if(!validHosts.includes(req.headers.host)){res.writeHead(403).end('Local access only');return;}
 if(req.url.startsWith('/api/')){
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   const u=new URL(req.url,'http://localhost');
   if(req.method==='GET'){
    if(u.pathname==='/api/status')return send(200,live.status());
    if(u.pathname==='/api/news')return send(200,{items:live.articles(),questions:live.questions().filter(q=>q.articleId),status:live.status()});
    if(u.pathname==='/api/questions')return send(200,{questions:merge([...live.questions(),...factory.allQuestions()]).filter(q=>!u.searchParams.get('topic')||q.topicId===u.searchParams.get('topic')).map(display)});
    if(u.pathname==='/api/factory/status')return send(200,factory.snapshot());
    if(u.pathname==='/api/factory/export'){res.setHeader('Content-Disposition','attachment; filename="Crorepati_Questions.json"');return send(200,{...factory.snapshot(),questions:combined()});}
    if(u.pathname==='/api/factory/export.zip'){const files=[['combined-bank.json',JSON.stringify({questions:combined()})],['progress.json',JSON.stringify(factory.snapshot())]];const base=path.join(appRoot,'deliverables/Ollama_40');const collect=dir=>{if(!fs.existsSync(dir))return;for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())collect(f);else if(d.name.endsWith('.json'))files.push(['chapters/'+path.relative(base,f).split(path.sep).join('/'),fs.readFileSync(f)]);}};collect(base);const zip=zipEntries(files);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Crorepati_Questions_Chapters.zip"','Content-Length':zip.length});return res.end(zip);}
    if(u.pathname==='/api/bank'){let rows=combined();const total=rows.length;const query=(u.searchParams.get('q')||'').toLowerCase(),status=u.searchParams.get('status')||'all';rows=rows.filter(q=>(status==='all'||q.lifecycle===status)&&(!query||JSON.stringify([q.id,q.question]).toLowerCase().includes(query)));const page=Math.max(0,Number(u.searchParams.get('page'))||0);return send(200,{total,matched:rows.length,questions:rows.slice(page*25,page*25+25)});}
    if(u.pathname==='/api/coverage')return send(200,live.coverage(u.searchParams.get('exam')||'all'));
    if(u.pathname==='/api/export')return send(200,live.exportData());
    return send(404,{error:'Unknown API route'});
   }
   if(req.method!=='POST'||req.headers['x-crorepati-client']!=='local-app'||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Use the app controls'});
   if(req.headers.origin&&!validHosts.map(h=>'http://'+h).includes(req.headers.origin))return send(403,{error:'Origin rejected'});
   let body='';for await(const part of req){body+=part;if(body.length>2000000)return send(413,{error:'Request too large'});}
   const data=JSON.parse(body||'{}');
   if(u.pathname==='/api/factory/start'){if(live.status().modelBusy)throw Error('Wait for the current news generation to finish');await live.pause(true);return send(200,await factory.start(data.model));}
   if(u.pathname==='/api/factory/pause')return send(200,factory.pause());
   if(u.pathname==='/api/factory/retry')return send(200,factory.retry());
   if(u.pathname==='/api/settings')return send(200,await live.configure(data));
   if(u.pathname==='/api/refresh'){live.refresh().catch(()=>{});return send(202,{started:true});}
   if(u.pathname==='/api/generate'&&(factory.snapshot().running||factory.snapshot().busy))throw Error('Pause the syllabus generator first');
   if(u.pathname==='/api/pause'&&data.paused!==true&&(factory.snapshot().running||factory.snapshot().busy))throw Error('Pause the syllabus generator first');
   if(u.pathname==='/api/generate')return send(200,await live.generate(data));
   if(u.pathname==='/api/queue'){await live.enqueue(data.exam);return send(200,live.status());}
   if(u.pathname==='/api/retry')return send(200,await live.retry());
   if(u.pathname==='/api/pause')return send(200,await live.pause(data.paused===true));
   if(u.pathname==='/api/source'){factory.invalidate(data.topicId);return send(200,await live.importSource(data));}
   if(u.pathname==='/api/import-news')return send(200,await live.importArticles(data));
   return send(404,{error:'Unknown API route'});
  }catch(e){return send(400,{error:e.message});}
 }

 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){
  if(path.extname(pathname)){res.writeHead(404).end('File not found');return;} file=path.join(root,'index.html');
 }
 const stat=fs.statSync(file);const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){let start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});fs.createReadStream(file,{start,end}).pipe(res);}
 else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port 4173 is already in use. Open http://localhost:4173 or close the previous server.':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log('Crorepati Revision: http://localhost:'+port+'/syllabus\nKeep this window open. Ctrl+C stops the app.');if(process.env.CROREPATI_NO_NETWORK!=='1'&&factory.shouldResume())factory.start().catch(e=>console.log('Ollama: '+e.message+' — use Exam Syllabus to start.'));});
