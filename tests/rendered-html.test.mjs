import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
// Test the Worker wrapper without pretending Node implements Cloudflare bindings.
const source=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8').replace('import handler from "vinext/server/app-router-entry";', 'const handler={fetch:async()=>new Response("<main>Application</main>",{headers:{"Content-Type":"text/html"}})};');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('worker applies defensive headers and disables caching of private records',async()=>{
 for(const path of ['/','/api/state','/invoice/example']){
  const r=await worker.fetch(new Request('https://example.test'+path),{},{});
  assert.equal(r.status,200);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
  assert.match(r.headers.get('Content-Security-Policy'),/object-src 'none'/);
  if(path!=='/')assert.equal(r.headers.get('Cache-Control'),'private, no-store');
 }
});
test('unused image proxies are unavailable',async()=>{
 for(const path of ['/_vinext/image','/_next/image'])assert.equal((await worker.fetch(new Request('https://example.test'+path),{},{})).status,404);
});
