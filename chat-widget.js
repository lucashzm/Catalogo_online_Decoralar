(() => {
 'use strict';
 // Isolated widget. Errors are contained so the product catalog keeps running.
 const root=document.getElementById('bm-chat-widget');
 if(!root||!window.supabase?.createClient)return;
 const db=window.supabase.createClient('https://hpjiwmmslyvuqrkllmvb.supabase.co','sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx');
 const $=id=>document.getElementById(id);
 let conversationId=null,channel=null,pendingImage=null;
 const imageTypes=['image/jpeg','image/png','image/webp','image/heic','image/heif'];
 function notice(text,error=false){const n=$('bm-chat-notice');n.textContent=text;n.classList.toggle('error',error);n.hidden=false;}
 function toggle(open){$('bm-chat-panel').hidden=!open;$('bm-chat-launcher').setAttribute('aria-expanded',String(open));if(open)$('bm-chat-name').focus();}
 function disconnect(){if(channel){db.removeChannel(channel);channel=null;}}
 function renderMessage(m){
  const b=document.createElement('div');b.className='bm-chat-bubble '+(m.remetente_tipo==='cliente'?'client':'staff');
  if(m.tipo==='texto'){const p=document.createElement('div');p.textContent=m.mensagem||'';b.appendChild(p);}
  else if(m.arquivo_path){const media=document.createElement(m.tipo==='imagem'?'img':'audio');db.storage.from('chat-midias').createSignedUrl(m.arquivo_path,1800).then(({data,error})=>{if(!error&&data?.signedUrl)media.src=data.signedUrl;});if(m.tipo==='imagem'){media.alt='Imagem enviada';media.loading='lazy';}else media.controls=true;b.appendChild(media);}
  const t=document.createElement('time');t.textContent=new Date(m.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});b.appendChild(t);$('bm-chat-thread').appendChild(b);
 }
 async function history(){
  if(!conversationId)return;
  const {data,error}=await db.from('chat_mensagens').select('id,remetente_tipo,tipo,mensagem,arquivo_path,criado_em').eq('conversa_id',conversationId).order('criado_em',{ascending:true}).limit(250);
  if(error)throw error;
  const thread=$('bm-chat-thread');thread.replaceChildren();(data||[]).forEach(renderMessage);thread.scrollTop=thread.scrollHeight;
 }
 function subscribe(){disconnect();channel=db.channel('bm-client-'+conversationId).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_mensagens',filter:'conversa_id=eq.'+conversationId},async p=>{if(p.new?.remetente_tipo==='atendente'){try{await history();}catch(e){console.warn('[BM chat] Atualização falhou.',e);}}}).subscribe();}
 async function start(e){
  e.preventDefault();const name=$('bm-chat-name').value.trim(),phone=$('bm-chat-phone').value.trim();const btn=$('bm-chat-start').querySelector('button');btn.disabled=true;btn.textContent='Conectando...';
  try{const {data,error}=await db.rpc('chat_cliente_iniciar',{p_nome:name,p_telefone:phone});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.conversa_id)throw new Error('Não foi possível iniciar a conversa.');conversationId=row.conversa_id;$('bm-chat-start').hidden=true;$('bm-chat-compose').hidden=false;$('bm-chat-thread').insertAdjacentHTML('beforeend','<div class="bm-chat-welcome"><strong>Conversa iniciada</strong><p>Digite sua mensagem abaixo. Nossa equipe receberá seu atendimento.</p></div>');subscribe();notice('Conectado. Pode enviar sua mensagem.');}
  catch(err){notice(err.message||'Não foi possível iniciar o atendimento.',true);}finally{btn.disabled=false;btn.textContent='Iniciar conversa';}
 }
 async function send(e){
  e.preventDefault();const message=$('bm-chat-message').value.trim();if(!message&&!pendingImage)return;const btn=$('bm-chat-compose').querySelector('button[type=submit]');btn.disabled=true;
  try{
   if(pendingImage){const f=pendingImage;const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'}[f.type]||'img';const path=conversationId+'/'+crypto.randomUUID()+'.'+ext;const {error:up}=await db.storage.from('chat-midias').upload(path,f,{contentType:f.type,upsert:false});if(up)throw up;const {error}=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message||null,p_tipo:'imagem',p_arquivo_path:path,p_mime_type:f.type,p_tamanho_bytes:f.size,p_duracao_segundos:null});if(error){await db.storage.from('chat-midias').remove([path]);throw error;}pendingImage=null;$('bm-chat-attachment-preview').hidden=true;$('bm-chat-attachment-preview').replaceChildren();}
   else{const {error}=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message,p_tipo:'texto',p_arquivo_path:null,p_mime_type:null,p_tamanho_bytes:null,p_duracao_segundos:null});if(error)throw error;}
   $('bm-chat-message').value='';await history();$('bm-chat-notice').hidden=true;
  }catch(err){notice(err.message||'Não foi possível enviar a mensagem.',true);}finally{btn.disabled=false;}
 }
 function chooseImage(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;if(!imageTypes.includes(f.type)){notice('Formato não permitido. Use JPG, PNG, WebP ou HEIC.',true);return;}if(f.size>15*1024*1024){notice('A imagem deve ter até 15 MB.',true);return;}pendingImage=f;const p=$('bm-chat-attachment-preview');p.replaceChildren();const label=document.createElement('span');label.textContent='Foto pronta: '+f.name;p.appendChild(label);const rm=document.createElement('button');rm.type='button';rm.textContent='Remover';rm.onclick=()=>{pendingImage=null;p.hidden=true;p.replaceChildren();};p.appendChild(rm);p.hidden=false;}
 try{$('bm-chat-launcher').addEventListener('click',()=>toggle($('bm-chat-panel').hidden));$('bm-chat-close').addEventListener('click',()=>toggle(false));$('bm-chat-start').addEventListener('submit',start);$('bm-chat-compose').addEventListener('submit',send);$('bm-chat-image').addEventListener('change',chooseImage);}
 catch(err){console.warn('[BM chat] Widget desativado; catálogo preservado.',err);root.hidden=true;}
})();