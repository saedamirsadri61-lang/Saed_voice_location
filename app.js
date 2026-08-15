const $=x=>document.getElementById(x);
let lastPosition=null,rec=null,startTimer=null,watchId=null;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function speak(t){if(!speechSynthesis)return; speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang='fa-IR';u.rate=.92;speechSynthesis.speak(u)}
function diag(){let a=[];a.push('HTTPS: '+(isSecureContext?'بله':'خیر'));a.push('getUserMedia: '+(navigator.mediaDevices?.getUserMedia?'موجود':'ناموجود'));a.push('SpeechRecognition: '+(SR?'موجود':'ناموجود'));$('diag').innerHTML=a.join('<br>')}
diag();

async function testMic(){
 $('voiceStatus').textContent='در حال درخواست دسترسی میکروفون…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('getUserMedia در دسترس نیست');
  const s=await navigator.mediaDevices.getUserMedia({audio:true});
  const tr=s.getAudioTracks()[0],set=tr?.getSettings?.()||{};
  $('voiceStatus').innerHTML='<span class="ok">✓ میکروفون فعال است.</span>';
  $('diag').innerHTML=`HTTPS: ${isSecureContext?'بله':'خیر'}<br>SpeechRecognition: ${SR?'موجود':'ناموجود'}<br>Audio track: ${tr?.label||'فعال'}<br>Sample rate: ${set.sampleRate||'نامشخص'}`;
  s.getTracks().forEach(x=>x.stop()); return true;
 }catch(e){$('voiceStatus').innerHTML='<span class="err">✗ میکروفون باز نشد: '+e.name+' — '+e.message+'</span>';return false}
}
$('micTest').onclick=testMic;

function finishUI(){clearTimeout(startTimer);$('voiceBtn').hidden=false;$('stopBtn').hidden=true}
async function startVoice(){
 $('heard').textContent='در انتظار شروع موتور تشخیص گفتار…';
 if(!(await testMic()))return;
 if(!SR){$('voiceStatus').innerHTML='<span class="err">مرورگر SpeechRecognition ندارد.</span>';return}
 try{
  rec=new SR();rec.lang='fa-IR';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=3;
  rec.onstart=()=>{clearTimeout(startTimer);$('voiceStatus').innerHTML='<span class="ok">🎙️ در حال گوش دادن… صحبت کنید.</span>';$('voiceBtn').hidden=true;$('stopBtn').hidden=false};
  rec.onaudiostart=()=>{$('heard').textContent='میکروفون توسط موتور گفتار فعال شد…'};
  rec.onspeechstart=()=>{$('heard').textContent='صدای شما دریافت شد…'};
  rec.onresult=e=>{let f='',i='';for(let n=e.resultIndex;n<e.results.length;n++){let t=e.results[n][0].transcript;e.results[n].isFinal?f+=t:i+=t}$('heard').textContent=f?'شنیدم: «'+f+'»':'در حال تشخیص: '+i;if(f)handle(f)};
  rec.onerror=e=>{$('voiceStatus').innerHTML='<span class="err">خطای SpeechRecognition: '+e.error+'</span>';finishUI()};
  rec.onend=()=>{finishUI();if(!$('voiceStatus').querySelector('.err'))$('voiceStatus').textContent='شنیدن پایان یافت.'};
  rec.start();
  startTimer=setTimeout(()=>{try{rec.abort()}catch{};$('voiceStatus').innerHTML='<span class="err">میکروفون سالم است، اما موتور SpeechRecognition ظرف ۸ ثانیه شروع نشد. این محدودیت سرویس تشخیص گفتار مرورگر است.</span>';finishUI()},8000);
 }catch(e){$('voiceStatus').innerHTML='<span class="err">شروع SpeechRecognition ناموفق: '+e.name+' — '+e.message+'</span>';finishUI()}
}
$('voiceBtn').onclick=startVoice;$('stopBtn').onclick=()=>{try{rec?.stop()}catch{}};

function handle(raw){let t=raw.replace(/ي/g,'ی').replace(/ك/g,'ک').trim();if(t.includes('موقعیت')||t.includes('کجام'))getLocation(true);else if(t.includes('کارهای امروز')||t.includes('وظایف'))readTasks();else if(t.includes('ساعت'))speak('ساعت '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+' است');else speak('فرمان دریافت شد: '+t)}

function showPos(p,label='موقعیت'){lastPosition=p;let c=p.coords;$('location').innerHTML=`<span class="ok">${label}</span><br>عرض: ${c.latitude.toFixed(6)}<br>طول: ${c.longitude.toFixed(6)}<br>دقت تقریبی: ${Math.round(c.accuracy)} متر`}
function getLocation(say=false){
 if(!navigator.geolocation){$('location').innerHTML='<span class="err">Geolocation موجود نیست.</span>';return}
 $('location').textContent='در حال دریافت سریع موقعیت…';
 navigator.geolocation.getCurrentPosition(p=>{showPos(p,'موقعیت سریع');if(say)speak('موقعیت شما دریافت شد');refine()},e=>{ $('location').innerHTML='<span class="warn">موقعیت سریع دریافت نشد؛ در حال تلاش برای GPS دقیق‌تر…</span>';refine(say)}, {enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
function refine(say=false){
 if(watchId!==null)navigator.geolocation.clearWatch(watchId);
 let best=lastPosition,done=false;
 watchId=navigator.geolocation.watchPosition(p=>{if(!best||p.coords.accuracy<best.coords.accuracy){best=p;showPos(p,'موقعیت به‌روزشده')}if(p.coords.accuracy<=50){navigator.geolocation.clearWatch(watchId);watchId=null;if(say)speak('موقعیت دقیق‌تر دریافت شد')}},e=>{if(!best)$('location').innerHTML='<span class="err">موقعیت دریافت نشد: '+e.message+'</span>'},{enableHighAccuracy:true,timeout:60000,maximumAge:60000});
 setTimeout(()=>{if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;if(!best)$('location').innerHTML='<span class="err">پس از ۶۰ ثانیه موقعیتی دریافت نشد.</span>'}},65000)
}
$('locBtn').onclick=()=>getLocation(false);
$('shareBtn').onclick=async()=>{if(!lastPosition){getLocation(false);return}let c=lastPosition.coords,u=`https://maps.google.com/?q=${c.latitude},${c.longitude}`;try{navigator.share?await navigator.share({title:'موقعیت سعید',url:u}):await navigator.clipboard.writeText(u)}catch{}};

function tasks(){try{return JSON.parse(localStorage.getItem('saedTasks')||'[]')}catch{return[]}}
function render(){let t=tasks();$('tasks').innerHTML=t.length?t.map((x,i)=>`${i+1}. ${x}`).join('<br>'):'کاری ثبت نشده است.'}
$('addBtn').onclick=()=>{let v=$('taskInput').value.trim();if(!v)return;let t=tasks();t.push(v);localStorage.setItem('saedTasks',JSON.stringify(t));$('taskInput').value='';render();speak('کار اضافه شد')};
function readTasks(){let t=tasks();speak(t.length?'کارهای امروز: '+t.join('، '):'برای امروز کاری ثبت نشده است.')}
$('readBtn').onclick=readTasks;render();
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));