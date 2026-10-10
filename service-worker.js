// guide-build: europa-guide-1a2ccd2b6b63b9fb
'use strict';
let manifestPromise;
const manifest=()=>manifestPromise||(manifestPromise=(async()=>{let r;try{r=await fetch(new URL('offline-manifest.json',self.registration.scope),{cache:'no-store'});if(!r.ok)throw new Error('Manifest unavailable');}catch{r=await caches.match(new URL('offline-manifest.json',self.registration.scope).href);}if(!r)throw new Error('Manifest unavailable');return r.json();})());
const requestURL=file=>new URL(file,self.registration.scope).href;
// v26: photographs loaded from Wikimedia Commons can be kept for offline consultation.
const REMOTE_HOSTS=new Set(['commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org']);
// The same photograph is requested at different widths (srcset). Each saved copy is also
// kept under a key made from the file name, so that offline any width can be served by it.
function photoKey(url){
 try{
  const path=new URL(url).pathname;
  const m=path.match(/Special:FilePath\/([^/?]+)$/)||path.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//)||path.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/);
  if(!m)return null;
  let name=m[1];try{name=decodeURIComponent(name);}catch{}
  return requestURL('__photo/'+encodeURIComponent(name.replace(/ /g,'_')));
 }catch{return null;}
}
async function fetchRemote(url){
 // CORS keeps the stored copy small; servers without CORS headers still give an opaque copy.
 try{const r=await fetch(url,{mode:'cors',credentials:'omit'});if(r.ok)return r;}catch{}
 const r=await fetch(url,{mode:'no-cors',credentials:'omit'});
 if(!(r.ok||r.type==='opaque'))throw new Error('Remote photograph failed');
 return r;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{const m=await manifest(),cache=await caches.open(m.version);await cache.addAll(m.core.map(requestURL));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const m=await manifest();for(const key of await caches.keys())if(key.startsWith('europa-guide-')&&key!==m.version)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin){
  if(!REMOTE_HOSTS.has(url.hostname))return;
  event.respondWith((async()=>{
   const hit=await caches.match(event.request.url);if(hit)return hit;
   try{return await fetch(event.request);}
   catch(error){const key=photoKey(event.request.url),saved=key&&await caches.match(key);if(saved)return saved;throw error;}
  })());
  return;
 }
 event.respondWith((async()=>{
  if(event.request.mode==='navigate'){
   try{return await fetch(event.request);}catch{return await caches.match(requestURL('index.html'))||Response.error();}
  }
  const hit=await caches.match(event.request);if(hit)return hit;
  const response=await fetch(event.request);
  if(response.ok&&new URL(event.request.url).pathname.includes('/assets/')){const m=await manifest();await(await caches.open(m.version)).put(event.request,response.clone());}
  return response;
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_GUIDE')return;
 event.waitUntil((async()=>{
  const notify=data=>event.source?.postMessage(data);
  try{
   const m=await manifest(),cache=await caches.open(m.version);let next=0,done=0,failed=0;
   const run=async()=>{while(next<m.assets.length){const file=m.assets[next++],url=requestURL(file);try{if(!await cache.match(url)){const r=await fetch(url,{cache:'reload'});if(!r.ok)throw new Error('Resource failed');await cache.put(url,r);}}catch{failed++;}done++;notify({type:'CACHE_PROGRESS',done,total:m.assets.length});}};
   await Promise.all([run(),run(),run()]);
   const remote=m.remote||[];let remoteNext=0,remoteDone=0,remoteFailed=0;
   const runRemote=async()=>{while(remoteNext<remote.length){const url=remote[remoteNext++];try{if(!await cache.match(url)){const r=await fetchRemote(url),key=photoKey(url);if(key)await cache.put(key,r.clone());await cache.put(url,r);}}catch{remoteFailed++;}remoteDone++;notify({type:'CACHE_REMOTE_PROGRESS',done:remoteDone,total:remote.length});}};
   await Promise.all([runRemote(),runRemote(),runRemote()]);
   notify({type:'CACHE_COMPLETE',failed,total:m.assets.length,remoteFailed,remoteTotal:remote.length});
  }catch{notify({type:'CACHE_ERROR'});}
 })());
});
