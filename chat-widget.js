(() => {
 'use strict';
 const root=document.getElementById('bm-chat-widget');
 if(!root||!window.supabase?.createClient)return;
 const db=window.supabase.createClient('https://hpjiwmmslyvuqrkllmvb.supabase.co','sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx');
 const $=id=>document.getElementById(id);
 const SESSION_KEY='bm_chat_session_v1';
 const MAX_MEDIA_BYTES=25*1024*1024;
 let conversationId=null,phoneDigits='',pendingImage=null,polling=null,sessionExpiresAt=0,presenceChannel=null;
 const presenceKey='cliente-'+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
 const imageTypes=['image/jpeg','image/png','image/webp','image/heic','image/heif'];
 const digits=v=>(v||'').replace(/\D/g,'');
 function notice(text,error=false){const n=$('bm-chat-notice');n.textContent=text;n.classList.toggle('error',error);n.hidden=false;}
 function saveSession(){
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({conversationId,phoneDigits,sessionExpiresAt}));}catch(_){}
 }
 function stopPresence(){if(presenceChannel){db.removeChannel(presenceChannel);presenceChannel=null;}}
 function startPresence(){
  stopPresence();if(!conversationId)return;
  presenceChannel=db.channel('bm-chat-client-presence',{config:{presence:{key:presenceKey}}});
  presenceChannel.subscribe(status=>{
   if(status==='SUBSCRIBED'&&conversationId){
    presenceChannel.track({role:'cliente',conversation_id:conversationId,online:true});
   }
  });
 }
 function clearSession(){
  
  stopPresence();conversationId=null;phoneDigits='';sessionExpiresAt=0;
  try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}
  stopPolling();
 }
 function sessionIsOpen(){return !!conversationId&&!!phoneDigits&&sessionExpiresAt>Date.now();}
 function toggle(open){
  
  if(open){
   if(sessionIsOpen())showScreen('chat');
   else if(conversationId){clearSession();showScreen('home');}
  }
  $('bm-chat-panel').hidden=!open;
  $('bm-chat-launcher').setAttribute('aria-expanded',String(open));
 }
 function showScreen(screen){
  $('bm-chat-home').hidden=screen!=='home';
  $('bm-chat-start').hidden=screen!=='start';
  $('bm-chat-continue').hidden=screen!=='continue';
  $('bm-chat-compose').hidden=screen!=='chat';
  $('bm-chat-thread').hidden=screen==='home'||screen==='start'||screen==='continue';
  $('bm-chat-attachment-preview').hidden=true;
  $('bm-chat-notice').hidden=true;
 }
 function stopPolling(){if(polling){clearInterval(polling);polling=null;}}
 function renderMessage(m){
  const b=document.createElement('div');b.className='bm-chat-bubble '+(m.remetente_tipo==='cliente'?'client':'staff');
  if(m.tipo==='texto'){const p=document.createElement('div');p.textContent=m.mensagem||'';b.appendChild(p);}
  else if(m.arquivo_path&&m.tipo==='imagem'){const media=document.createElement('img');db.storage.from('chat-midias').createSignedUrl(m.arquivo_path,1800).then(({data,error})=>{if(!error&&data?.signedUrl)media.src=data.signedUrl;});media.alt='Imagem enviada';media.loading='lazy';b.appendChild(media);}
  else if(m.tipo==='audio'){const p=document.createElement('div');p.textContent='Mensagem de áudio não disponível nesta versão.';b.appendChild(p);}
  const t=document.createElement('time');t.textContent=new Date(m.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});b.appendChild(t);$('bm-chat-thread').appendChild(b);
 }
 async function history(){
  if(!conversationId||!phoneDigits)return;
  const {data,error}=await db.rpc('chat_cliente_historico',{p_conversa_id:conversationId,p_telefone:phoneDigits});
  if(error)throw error;
  const thread=$('bm-chat-thread');thread.replaceChildren();(data||[]).forEach(renderMessage);thread.scrollTop=thread.scrollHeight;
 }
 async function refreshHistory(){
  if(!sessionIsOpen()){
   clearSession();showScreen('home');
   if(!$('bm-chat-panel').hidden)notice('Sua sessão ficou inativa. Você pode continuar o atendimento e recuperar o histórico.');
   return;
  }
  try{await history();}
  catch(err){clearSession();showScreen('home');notice('Não foi possível manter esta sessão. Use “Continuar atendimento” para recuperar a última conversa.',true);}
 }
 function startPolling(){stopPolling();polling=setInterval(refreshHistory,5000);}
 async function connect(row,phone){
  conversationId=row.conversa_id;phoneDigits=digits(phone);
  sessionExpiresAt=new Date(row.expira_em||new Date(Date.now()+15*60*1000)).getTime();
  if(!Number.isFinite(sessionExpiresAt)||sessionExpiresAt<=Date.now())sessionExpiresAt=Date.now()+15*60*1000;
  saveSession();
  startPresence();
  showScreen('chat');
  await history();
  startPolling();
  notice('Atendimento recuperado. Você pode continuar por aqui.');
 }
 async function start(e){
  e.preventDefault();
  const name=$('bm-chat-name').value.trim(),phone=$('bm-chat-phone').value.trim();
  const btn=$('bm-chat-start').querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Conectando...';
  try{
   const {data,error}=await db.rpc('chat_cliente_iniciar',{p_nome:name,p_telefone:phone});if(error)throw error;
   const row=Array.isArray(data)?data[0]:data;if(!row?.conversa_id)throw new Error('Não foi possível iniciar a conversa.');
   row.expira_em=row.criado_em?new Date(new Date(row.criado_em).getTime()+15*60*1000).toISOString():new Date(Date.now()+15*60*1000).toISOString();
   await connect(row,phone);notice('Conversa iniciada. Nossa equipe receberá sua mensagem.');
  }catch(err){notice(err.message||'Não foi possível iniciar o atendimento.',true);}
  finally{btn.disabled=false;btn.textContent='Iniciar atendimento';}
 }
 async function resume(e){
  e.preventDefault();
  const phone=$('bm-chat-resume-phone').value.trim();
  const btn=$('bm-chat-continue').querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Procurando...';
  try{
   const {data,error}=await db.rpc('chat_cliente_continuar',{p_telefone:phone});if(error)throw error;
   const row=Array.isArray(data)?data[0]:data;if(!row?.conversa_id)throw new Error('Não encontramos uma conversa disponível para esse telefone.');
   await connect(row,phone);
  }catch(err){notice(err.message||'Não foi possível recuperar o atendimento.',true);}
  finally{btn.disabled=false;btn.textContent='Continuar atendimento';}
 }
 async function send(e){
  e.preventDefault();const message=$('bm-chat-message').value.trim();if(!message&&!pendingImage)return;
  if(!sessionIsOpen()){clearSession();showScreen('home');notice('Sua sessão ficou inativa. Clique em “Continuar atendimento” para recuperar a conversa.');return;}
  const btn=$('bm-chat-compose').querySelector('button[type=submit]');btn.disabled=true;
  try{
   let result;
   if(pendingImage){
    const f=pendingImage;const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'}[f.type]||'img';
    const path=conversationId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:up}=await db.storage.from('chat-midias').upload(path,f,{contentType:f.type,upsert:false});if(up)throw up;
    const response=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message||null,p_tipo:'imagem',p_arquivo_path:path,p_mime_type:f.type,p_tamanho_bytes:f.size,p_duracao_segundos:null});
    if(response.error){await db.storage.from('chat-midias').remove([path]);throw response.error;}
    result=response.data;
    pendingImage=null;$('bm-chat-attachment-preview').hidden=true;$('bm-chat-attachment-preview').replaceChildren();
   }else{
    const response=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message,p_tipo:'texto',p_arquivo_path:null,p_mime_type:null,p_tamanho_bytes:null,p_duracao_segundos:null});
    if(response.error)throw response.error;
    result=response.data;
   }
   const sent=Array.isArray(result)?result[0]:result;
   if(sent?.expira_em){sessionExpiresAt=new Date(sent.expira_em).getTime();saveSession();}
   $('bm-chat-message').value='';await history();$('bm-chat-notice').hidden=true;
  }catch(err){notice(err.message||'Não foi possível enviar a mensagem.',true);}
  finally{btn.disabled=false;}
 }
 function chooseImage(e){
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  if(!imageTypes.includes(f.type)){notice('Formato não permitido. Use JPG, PNG, WebP ou HEIC.',true);return;}
  if(f.size>MAX_MEDIA_BYTES){notice('A imagem deve ter até 25 MB.',true);return;}
  pendingImage=f;const p=$('bm-chat-attachment-preview');p.replaceChildren();
  const label=document.createElement('span');label.textContent='Foto pronta: '+f.name;p.appendChild(label);
  const rm=document.createElement('button');rm.type='button';rm.textContent='Remover';rm.onclick=()=>{pendingImage=null;p.hidden=true;p.replaceChildren();};p.appendChild(rm);p.hidden=false;
 }

 function restoreSession(){
  try{
   const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
   if(!saved?.conversationId||!saved?.phoneDigits||!saved?.sessionExpiresAt||saved.sessionExpiresAt<=Date.now()){sessionStorage.removeItem(SESSION_KEY);return;}
   conversationId=saved.conversationId;phoneDigits=saved.phoneDigits;sessionExpiresAt=saved.sessionExpiresAt;
   startPresence();showScreen('chat');startPolling();history().catch(()=>{clearSession();showScreen('home');});
  }catch(_){clearSession();}
 }
 try{
  $('bm-chat-launcher').addEventListener('click',()=>toggle($('bm-chat-panel').hidden));
  $('bm-chat-close').addEventListener('click',()=>toggle(false));
  $('bm-chat-new').addEventListener('click',()=>showScreen('start'));
  $('bm-chat-resume').addEventListener('click',()=>showScreen('continue'));
  $('bm-chat-back-start').addEventListener('click',()=>showScreen('home'));
  $('bm-chat-back-continue').addEventListener('click',()=>showScreen('home'));
  $('bm-chat-start').addEventListener('submit',start);
  $('bm-chat-continue').addEventListener('submit',resume);
  $('bm-chat-compose').addEventListener('submit',send);
  $('bm-chat-image').addEventListener('change',chooseImage);
  restoreSession();
 }catch(err){console.warn('[BM chat] Widget desativado; catálogo preservado.',err);root.hidden=true;}
})();