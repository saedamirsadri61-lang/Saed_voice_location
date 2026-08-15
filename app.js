const $=x=>document.getElementById(x);
let token=null, tokenClient=null, lastPosition=null, rec=null;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

function speak(t){if(!('speechSynthesis'in window))return;speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang='fa-IR';u.rate=.9;speechSynthesis.speak(u)}
function norm(t){return t.replace(/ي/g,'ی').replace(/ك/g,'ک').trim()}
function localTasks(){try{return JSON.parse(localStorage.getItem('saedTasks')||'[]')}catch{return[]}}
function renderTasks(){let t=localTasks();$('tasks').innerHTML=t.length?t.map((x,i)=>`${i+1}. ${x}`).join('<br>'):'کاری ثبت نشده است.'}
$('addBtn').onclick=()=>{let v=$('taskInput').value.trim();if(!v)return;let t=localTasks();t.push(v);localStorage.setItem('saedTasks',JSON.stringify(t));$('taskInput').value='';renderTasks();speak('کار اضافه شد')};renderTasks();

$('clientId').value=localStorage.getItem('googleClientId')||'';
$('saveClient').onclick=()=>{let v=$('clientId').value.trim();localStorage.setItem('googleClientId',v);$('calStatus').innerHTML='<span class="ok">Client ID ذخیره شد.</span>';tokenClient=null};

function initGoogle(){
 const cid=localStorage.getItem('googleClientId')||$('clientId').value.trim();
 if(!cid){$('calStatus').innerHTML='<span class="warn">ابتدا Google OAuth Client ID را وارد و ذخیره کنید.</span>';return false}
 if(!window.google?.accounts?.oauth2){$('calStatus').innerHTML='<span class="warn">سرویس ورود Google هنوز بارگذاری نشده؛ چند ثانیه بعد دوباره بزنید.</span>';return false}
 tokenClient=google.accounts.oauth2.initTokenClient({
   client_id:cid,
   scope:'https://www.googleapis.com/auth/calendar.readonly',
   callback:r=>{if(r.error){$('calStatus').innerHTML='<span class="err">اتصال Google ناموفق: '+r.error+'</span>';return}token=r.access_token;$('calStatus').innerHTML='<span class="ok">✓ Google Calendar متصل شد.</span>';readToday(true)}
 });
 return true
}
$('googleBtn').onclick=()=>{if(initGoogle())tokenClient.requestAccessToken({prompt:'consent'})};

function todayBounds(){
 const n=new Date(), a=new Date(n.getFullYear(),n.getMonth(),n.getDate(),0,0,0), b=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,0);
 return [a.toISOString(),b.toISOString()]
}
async function calendarEvents(){
 if(!token) throw new Error('NOT_CONNECTED');
 let [a,b]=todayBounds();
 let url='https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin='+encodeURIComponent(a)+'&timeMax='+encodeURIComponent(b)+'&maxResults=100';
 let r=await fetch(url,{headers:{Authorization:'Bearer '+token}});
 if(r.status===401){token=null;throw new Error('TOKEN_EXPIRED')}
 if(!r.ok)throw new Error('HTTP_'+r.status);
 return (await r.json()).items||[]
}
function fmtEvent(e){
 let s=e.start?.dateTime;
 if(!s)return e.summary||'رویداد بدون عنوان';
 let d=new Date(s), tm=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
 return `ساعت ${tm}، ${e.summary||'رویداد بدون عنوان'}`
}
async function readToday(say=true){
 $('calStatus').textContent='در حال دریافت کارهای امروز…';
 let loc=localTasks(), ev=[];
 try{ev=await calendarEvents()}
 catch(e){
   if(e.message==='NOT_CONNECTED'||e.message==='TOKEN_EXPIRED'){
     $('calStatus').innerHTML='<span class="warn">برای خواندن Google Calendar ابتدا «اتصال به Google Calendar» را بزنید.</span>';
     if(say && loc.length)speak('کارهای محلی امروز: '+loc.join('، '));
     return
   }
   $('calStatus').innerHTML='<span class="err">خطا در دریافت Calendar: '+e.message+'</span>';return
 }
 let names=ev.map(fmtEvent), all=[...names,...loc];
 $('todayList').innerHTML=all.length?all.map((x,i)=>`${i+1}. ${x}`).join('<br>'):'برای امروز موردی پیدا نشد.';
 $('calStatus').innerHTML='<span class="ok">✓ برنامه امروز دریافت شد.</span>';
 if(say)speak(all.length?'کارهای امروز شما: '+all.join('، '):'برای امروز کاری ثبت نشده است.')
}
$('todayBtn').onclick=()=>readToday(true);

async function testMic(){
 try{let s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(x=>x.stop());$('voiceStatus').innerHTML='<span class="ok">✓ میکروفون فعال است.</span>';return true}
 catch(e){$('voiceStatus').innerHTML='<span class="err">میکروفون باز نشد: '+e.name+'</span>';return false}
}
$('micTest').onclick=testMic;
$('voiceBtn').onclick=async()=>{
 if(!(await testMic()))return;
 if(!SR){$('voiceStatus').innerHTML='<span class="err">SpeechRecognition پشتیبانی نمی‌شود.</span>';return}
 rec=new SR();rec.lang='fa-IR';rec.interimResults=true;rec.continuous=false;
 rec.onstart=()=>{$('voiceStatus').innerHTML='<span class="ok">🎙️ در حال گوش دادن…</span>';$('voiceBtn').hidden=true;$('stopBtn').hidden=false};
 rec.onresult=e=>{let f='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)f+=e.results[i][0].transcript;if(f){$('heard').textContent='شنیدم: «'+f+'»';handle(norm(f))}};
 rec.onerror=e=>$('voiceStatus').innerHTML='<span class="err">خطای گفتار: '+e.error+'</span>';
 rec.onend=()=>{$('voiceBtn').hidden=false;$('stopBtn').hidden=true};
 rec.start()
};
$('stopBtn').onclick=()=>{try{rec?.stop()}catch{}};

function handle(t){
 if(t.includes('کارهای امروز')||t.includes('کار امروز')||t.includes('برنامه امروز')||t.includes('قرارهای امروز'))readToday(true);
 else if(t.includes('موقعیت')||t.includes('کجام'))getLocation(true);
 else if(t.includes('ساعت'))speak('ساعت '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+' است');
 else speak('فرمان دریافت شد: '+t)
}

function showPos(p){lastPosition=p;let c=p.coords;$('location').innerHTML=`<span class="ok">✓ موقعیت دریافت شد</span><br>عرض: ${c.latitude.toFixed(6)}<br>طول: ${c.longitude.toFixed(6)}<br>دقت: ${Math.round(c.accuracy)} متر`}
function getLocation(say=false){
 $('location').textContent='در حال دریافت موقعیت…';
 navigator.geolocation.getCurrentPosition(p=>{showPos(p);if(say)speak('موقعیت شما دریافت شد')},e=>$('location').innerHTML='<span class="err">خطای مکان‌یابی: '+e.code+' — '+e.message+'</span>',{enableHighAccuracy:true,timeout:60000,maximumAge:300000})
}
$('locBtn').onclick=()=>getLocation(false);
$('shareBtn').onclick=async()=>{if(!lastPosition){getLocation(false);return}let c=lastPosition.coords,u=`https://maps.google.com/?q=${c.latitude},${c.longitude}`;try{if(navigator.share)await navigator.share({title:'موقعیت سعید',text:'موقعیت فعلی من',url:u});else{await navigator.clipboard.writeText(u);speak('لینک موقعیت کپی شد')}}catch{}};

if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));