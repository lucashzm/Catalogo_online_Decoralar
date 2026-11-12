(() => {
 'use strict';
 const root=document.getElementById('bm-chat-widget');
 if(!root||!window.supabase?.createClient)return;
 const db=window.supabase.createClient('https://hpjiwmmslyvuqrkllmvb.supabase.co','sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx');
 const $=id=>document.getElementById(id);
 const SESSION_KEY='bm_chat_session_v1';
 const MAX_MEDIA_BYTES=25*1024*1024,MAX_AUDIO_SECONDS=60;
 let conversationId=null,phoneDigits='',pendingImage=null,pendingAudio=null,polling=null,sessionExpiresAt=0,presenceChannel=null;
 let mediaRecorder=null,mediaStream=null,audioChunks=[],recordingStartedAt=0,recordingTimer=null,cancelRecording=false;
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
  if(mediaRecorder?.state==='recording')stopAudioRecording(true);
  stopPresence();conversationId=null;phoneDigits='';sessionExpiresAt=0;
  try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}
  stopPolling();
 }
 function sessionIsOpen(){return !!conversationId&&!!phoneDigits&&sessionExpiresAt>Date.now();}
 function toggle(open){
  if(!open&&mediaRecorder?.state==='recording')stopAudioRecording(true);
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
  else if(m.arquivo_path){const media=document.createElement(m.tipo==='imagem'?'img':'audio');db.storage.from('chat-midias').createSignedUrl(m.arquivo_path,1800).then(({data,error})=>{if(!error&&data?.signedUrl)media.src=data.signedUrl;});if(m.tipo==='imagem'){media.alt='Imagem enviada';media.loading='lazy';}else media.controls=true;b.appendChild(media);}
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
  e.preventDefault();const message=$('bm-chat-message').value.trim();if(!message&&!pendingImage&&!pendingAudio)return;
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
   }else if(pendingAudio){
    const audio=pendingAudio,f=audio.file;
    const ext=audio.mimeType==='audio/mp4'?'m4a':audio.mimeType==='audio/ogg'?'ogg':audio.mimeType==='audio/mpeg'?'mp3':audio.mimeType==='audio/aac'?'aac':'webm';
    const path=conversationId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:up}=await db.storage.from('chat-midias').upload(path,f,{contentType:audio.mimeType,upsert:false});if(up)throw up;
    const response=await db.rpc('chat_cliente_enviar',{p_conversa_id:conversationId,p_mensagem:message||null,p_tipo:'audio',p_arquivo_path:path,p_mime_type:audio.mimeType,p_tamanho_bytes:f.size,p_duracao_segundos:audio.durationSeconds});
    if(response.error){await db.storage.from('chat-midias').remove([path]);throw response.error;}
    result=response.data;if(pendingAudio?.previewUrl)URL.revokeObjectURL(pendingAudio.previewUrl);pendingAudio=null;$('bm-chat-attachment-preview').hidden=true;$('bm-chat-attachment-preview').replaceChildren();
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
  if(mediaRecorder?.state==='recording'){notice('Finalize ou cancele a gravação antes de anexar uma foto.',true);e.target.value='';return;}
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  if(!imageTypes.includes(f.type)){notice('Formato não permitido. Use JPG, PNG, WebP ou HEIC.',true);return;}
  if(f.size>MAX_MEDIA_BYTES){notice('A imagem deve ter até 25 MB.',true);return;}
  if(pendingAudio){notice('Remova o áudio antes de anexar uma foto.',true);return;}
  pendingImage=f;const p=$('bm-chat-attachment-preview');p.replaceChildren();
  const label=document.createElement('span');label.textContent='Foto pronta: '+f.name;p.appendChild(label);
  const rm=document.createElement('button');rm.type='button';rm.textContent='Remover';rm.onclick=()=>{pendingImage=null;p.hidden=true;p.replaceChildren();};p.appendChild(rm);p.hidden=false;
 }

 function formatAudioTime(seconds){
  const value=Math.max(0,Math.floor(seconds));
  return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
 }
 function resetAudioControls(){
  if(recordingTimer){clearInterval(recordingTimer);recordingTimer=null;}
  $('bm-chat-mic').hidden=false;$('bm-chat-stop-audio').hidden=true;$('bm-chat-cancel-audio').hidden=true;
  $('bm-chat-recording-status').hidden=true;
 }
 function stopAudioRecording(discard=false){
  if(!mediaRecorder||mediaRecorder.state==='inactive')return;
  cancelRecording=discard;
  if(recordingTimer){clearInterval(recordingTimer);recordingTimer=null;}
  $('bm-chat-recording-status').textContent=discard?'Cancelando gravação...':'Preparando áudio...';
  mediaRecorder.stop();
 }
 async function startAudioRecording(){
  if(pendingImage){notice('Envie ou remova a foto antes de gravar um áudio.',true);return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){notice('Este aparelho não oferece suporte à gravação de áudio neste navegador.',true);return;}
  try{
   mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   audioChunks=[];
   const candidates=['audio/webm;codecs=opus','audio/mp4','audio/aac','audio/webm','audio/ogg;codecs=opus'];
   const supported=candidates.find(type=>MediaRecorder.isTypeSupported?.(type));
   mediaRecorder=supported?new MediaRecorder(mediaStream,{mimeType:supported}):new MediaRecorder(mediaStream);
   const recorder=mediaRecorder;
   cancelRecording=false;recordingStartedAt=Date.now();
   recorder.ondataavailable=event=>{if(event.data?.size)audioChunks.push(event.data);};
   recorder.onerror=event=>notice('A gravação foi interrompida: '+(event.error?.message||'erro no microfone'),true);
   recorder.onstop=()=>{
    if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;}
    resetAudioControls();
    if(cancelRecording){audioChunks=[];$('bm-chat-recording-status').textContent='';mediaRecorder=null;return;}
    const rawType=recorder.mimeType||audioChunks[0]?.type||'audio/webm';
    const mimeType=rawType.split(';')[0].toLowerCase();
    const blob=new Blob(audioChunks,{type:mimeType});audioChunks=[];
    const durationSeconds=Math.min(MAX_AUDIO_SECONDS,Math.max(1,Math.ceil((Date.now()-recordingStartedAt)/1000)));
    mediaRecorder=null;
    if(!blob.size){notice('Não foi possível preparar o áudio. Tente novamente.',true);return;}
    if(blob.size>MAX_MEDIA_BYTES){notice('O áudio ultrapassou o limite de 25 MB.',true);return;}
    if(!['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac','audio/wav','audio/x-wav'].includes(mimeType)){
     notice('O formato de áudio deste aparelho não é compatível.',true);return;
    }
    const ext=mimeType==='audio/mp4'?'m4a':mimeType==='audio/ogg'?'ogg':mimeType==='audio/mpeg'?'mp3':mimeType==='audio/aac'?'aac':'webm';
    const file=new File([blob],'gravacao-'+Date.now()+'.'+ext,{type:mimeType});
    pendingAudio={file,mimeType,durationSeconds};
    const preview=$('bm-chat-attachment-preview');preview.replaceChildren();
    const label=document.createElement('span');label.textContent='Prévia do áudio · '+formatAudioTime(durationSeconds);preview.appendChild(label);
    const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=URL.createObjectURL(file);preview.appendChild(player);
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{pendingAudio=null;URL.revokeObjectURL(player.src);preview.hidden=true;preview.replaceChildren();};preview.appendChild(remove);
    pendingAudio.previewUrl=player.src;preview.hidden=false;
   };
   recorder.start(250);
   $('bm-chat-mic').hidden=true;$('bm-chat-stop-audio').hidden=false;$('bm-chat-cancel-audio').hidden=false;
   $('bm-chat-recording-status').hidden=false;
   $('bm-chat-recording-status').textContent='Gravando 00:00 / 01:00';
   recordingTimer=setInterval(()=>{
    const elapsed=(Date.now()-recordingStartedAt)/1000;
    $('bm-chat-recording-status').textContent='Gravando '+formatAudioTime(elapsed)+' / 01:00';
    if(elapsed>=MAX_AUDIO_SECONDS)stopAudioRecording(false);
   },250);
  }catch(error){
   if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;}
   mediaRecorder=null;resetAudioControls();
   notice('Não foi possível iniciar a gravação. Verifique a permissão do microfone: '+(error.message||'acesso negado'),true);
  }
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
  $('bm-chat-mic').addEventListener('click',startAudioRecording);
  $('bm-chat-stop-audio').addEventListener('click',()=>stopAudioRecording(false));
  $('bm-chat-cancel-audio').addEventListener('click',()=>stopAudioRecording(true));
  restoreSession();
 }catch(err){console.warn('[BM chat] Widget desativado; catálogo preservado.',err);root.hidden=true;}
})();