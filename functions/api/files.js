// Cloudflare Pages Function: lists only children under the configured root folder.
const ROOT = '1u0SJZZfxn0zDfbUHx6vaAqeQKTmHHHl1';
const reply = (body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
async function drive(apiKey,params){const url=new URL('https://www.googleapis.com/drive/v3/files');for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));url.searchParams.set('key',apiKey);return fetch(url,{headers:{Accept:'application/json'}})}
export async function onRequestGet({request,env}){
 if(!env.GOOGLE_DRIVE_API_KEY)return reply({error:'Integração pendente: configure GOOGLE_DRIVE_API_KEY como secret no Cloudflare Pages.'},503);
 const target=new URL(request.url).searchParams.get('folder')||ROOT;
 if(!/^[\w-]{10,160}$/.test(target))return reply({error:'ID de pasta inválido.'},400);
 try{
  // Fail closed: verify the target is ROOT or descendant of ROOT to avoid arbitrary-folder lookup via this endpoint.
  if(target!==ROOT){let curr=target,ok=false;const seen=new Set();for(let depth=0;depth<24;depth++){
    if(seen.has(curr))break;seen.add(curr);
    const url=new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(curr)}`);url.searchParams.set('fields','id,mimeType,parents');url.searchParams.set('key',env.GOOGLE_DRIVE_API_KEY);
    const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)return reply({error:'Pasta não acessível.'},403);const f=await r.json();if(f.mimeType!=='application/vnd.google-apps.folder')return reply({error:'Não é uma pasta.'},400);
    if((f.parents||[]).includes(ROOT)){ok=true;break}curr=(f.parents||[])[0];if(!curr)break;
  }if(!ok)return reply({error:'Acesso a pasta fora do repositório negado.'},403)}
  let pageToken,files=[];do{const params={q:`'${target}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)',pageSize:1000,orderBy:'folder,name_natural',supportsAllDrives:true,includeItemsFromAllDrives:true};if(pageToken)params.pageToken=pageToken;const r=await drive(env.GOOGLE_DRIVE_API_KEY,params);const data=await r.json();if(!r.ok)return reply({error:'O Google Drive recusou a consulta. Confira se a pasta está pública e a API habilitada.',details:data?.error?.message||''},502);files.push(...(data.files||[]));pageToken=data.nextPageToken}while(pageToken&&files.length<5000);
  return reply({files:files.slice(0,5000)});
 }catch{return reply({error:'Falha de comunicação com Google Drive.'},502)}
}
