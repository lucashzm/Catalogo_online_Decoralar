(() => {
 'use strict';
 const root=document.getElementById('bm-chat-widget');
 if(!root||!window.supabase?.createClient)return;
 const db=window.supabase.createClient('https://hpjiwmmslyvuqrkllmvb.supabase.co','sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx');
 const $=id=>document.getElementById(id);
 let conversationId=null,phoneDigits='',pendingImage=null,polling=null;
 const imageTypes=['image/jpeg','image/png','image/webp','image/heic','image/heif'];
 const digits=v=>(v||'').replace(/\D/g,'');
 function notice(text,error=false){const n=$('bm-chat-notice');n.textContent=text;n.classList.toggle('error',error);n.hidden=false;}
 function toggle(open){$('bm-chat-panel').hidden=!open;$('bm-chat-launcher').setAttribute('aria-expanded',String(open));}
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
  else if(m.arquivo_path){const media=document.createElement(m.tipo==='imagem'?'img':'audio');if(m.tipo==='imagem'){media.alt='Imagem enviada';media.loading='lazy';}else media.controls=true;b.appendChild(media);}
  const t=document.createElement('time');t.textContent=new Date(m.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});b.appendChild(t);$('bm-chat-thread').appendChild(b);
 }
 async function history(){
  if(!conversationId||!phoneDigits)return;
  const {data,error}=await db.rpc('chat_cliente_historico',{p_conversa_id:conversationId,p_telefone:phoneDigits});
  if(error)throw error;
  const thread=$('bm-chat-thread');thread.replaceChildren();(data||[]).forEach(renderMessage);thread.scrollTop=thread.scrollHeight;
 }
 async function refreshHistory(){
  try{await history();}
  catch(err){stopPolling();conversationId=null;showScreen('home');notice('O prazo de 15 minutos sem mensagem sua terminou. Inicie um novo atendimento para continuar.',true);}
 }
 function startPolling(){stopPolling();polling=setInterval(refreshHistory,5000);}
 async function connect(row,phone){
  conversationId=row.conversa_id;phoneDigits=digits(phone);
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
   const row=Array.isArray(data)?data[0]:data;if(!row?.conversa_id)throw new Error('Não encontramos um atendimento ativo para esse telefone.');
   await connect(row,phone);
  }catch(err){notice(err.message||'Não foi possível recuperar o atendimento.',true);}
  finally{btn.disabled=false;btn.textContent='Continuar atendimento';}
 }
 async function send(e){
  e.preventDefault();const message=$('bm-chat-message').value.trim();if(!message&&!pendingImage)return;
  const btn=$('bm-chat-compose').querySelector('button[type=submit]');btn.disabled=true;
  try{
   if(pendingImage){
    const f=pendingImage;const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'}[f.type]||'img';
    const path=conversationId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:up}=await db.storage.from('chat-midias').upload(path,f,{contentType:f.type,upsert:false});if(up)throw up;
    const {error}=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message||null,p_tipo:'imagem',p_arquivo_path:path,p_mime_type:f.type,p_tamanho_bytes:f.size,p_duracao_segundos:null});
    if(error){await db.storage.from('chat-midias').remove([path]);throw error;}
    pendingImage=null;$('bm-chat-attachment-preview').hidden=true;$('bm-chat-attachment-preview').replaceChildren();
   }else{
    const {error}=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message,p_tipo:'texto',p_arquivo_path:null,p_mime_type:null,p_tamanho_bytes:null,p_duracao_segundos:null});if(error)throw error;
   }
   $('bm-chat-message').value='';await history();$('bm-chat-notice').hidden=true;
  }catch(err){notice(err.message||'Não foi possível enviar a mensagem.',true);}
  finally{btn.disabled=false;}
 }
 function chooseImage(e){
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  if(!imageTypes.includes(f.type)){notice('Formato não permitido. Use JPG, PNG, WebP ou HEIC.',true);return;}
  if(f.size>15*1024*1024){notice('A imagem deve ter até 15 MB.',true);return;}
  pendingImage=f;const p=$('bm-chat-attachment-preview');p.replaceChildren();
  const label=document.createElement('span');label.textContent='Foto pronta: '+f.name;p.appendChild(label);
  const rm=document.createElement('button');rm.type='button';rm.textContent='Remover';rm.onclick=()=>{pendingImage=null;p.hidden=true;p.replaceChildren();};p.appendChild(rm);p.hidden=false;
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
 }catch(err){console.warn('[BM chat] Widget desativado; catálogo preservado.',err);root.hidden=true;}
})();