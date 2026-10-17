import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
if(!fs.existsSync(path.join(root,'index.html'))){console.error('Built app missing. Run npm ci then npm run build.');process.exit(1);}
const server=http.createServer((req,res)=>{
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
server.listen(4173,'127.0.0.1',()=>console.log('Crorepati Revision: http://localhost:4173\nKeep this window open. Ctrl+C stops the app.'));
