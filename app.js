const $=id=>document.getElementById(id);
let lastPosition=null, recognition=null, listening=false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function speak(text){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang='fa-IR'; u.rate=.92;
  speechSynthesis.speak(u);
}
function setVoice(msg, cls=''){ $('voiceStatus').textContent=msg; $('voiceStatus').className='status '+cls; }

function getLocation(speakResult=false){
  if(!navigator.geolocation){ $('location').innerHTML='<span class="err">مکان‌یابی در این مرورگر پشتیبانی نمی‌شود.</span>'; return; }
  $('location').textContent='در حال دریافت موقعیت…';
  navigator.geolocation.getCurrentPosition(p=>{
    lastPosition=p;
    const {latitude,longitude,accuracy}=p.coords;
    $('location').innerHTML=`عرض: ${latitude.toFixed(6)}<br>طول: ${longitude.toFixed(6)}<br>دقت تقریبی: ${Math.round(accuracy)} متر`;
    if(speakResult) speak(`موقعیت شما دریافت شد. دقت تقریبی ${Math.round(accuracy)} متر است.`);
  },e=>{
    const m={1:'اجازه مکان‌یابی داده نشد.',2:'موقعیت در دسترس نیست.',3:'دریافت موقعیت بیش از حد طول کشید.'}[e.code]||'خطای مکان‌یابی';
    $('location').innerHTML='<span class="err">'+m+'</span>'; if(speakResult)speak(m);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
$('locBtn').onclick=()=>getLocation(false);

$('shareBtn').onclick=async()=>{
 if(!lastPosition){ getLocation(false); return; }
 const {latitude,longitude}=lastPosition.coords;
 const url=`https://maps.google.com/?q=${latitude},${longitude}`;
 const data={title:'موقعیت سعید',text:'موقعیت فعلی من',url};
 try{ if(navigator.share) await navigator.share(data); else {await navigator.clipboard.writeText(url); alert('لینک موقعیت کپی شد.');} }catch(e){}
};

function tasks(){try{return JSON.parse(localStorage.getItem('saedTasks')||'[]')}catch(e){return[]}}
function saveTasks(x){localStorage.setItem('saedTasks',JSON.stringify(x));renderTasks()}
function renderTasks(){const t=tasks(); $('tasks').innerHTML=t.length?t.map((x,i)=>`${i+1}. ${x}`).join('<br>'):'هنوز کاری ثبت نشده است.'}
$('addBtn').onclick=()=>{const v=$('taskInput').value.trim(); if(!v)return; const t=tasks();t.push(v);saveTasks(t);$('taskInput').value='';speak('کار اضافه شد');}
$('readBtn').onclick=()=>readTasks();
function readTasks(){const t=tasks(); speak(t.length?`کارهای امروز: ${t.join('، ')}`:'برای امروز کاری ثبت نشده است.');}

function handleCommand(raw){
 const text=raw.trim().replace(/ي/g,'ی').replace(/ك/g,'ک');
 $('heard').textContent='شنیدم: «'+text+'»';
 if(text.includes('موقعیت')||text.includes('کجام')||text.includes('کجا هستم')) getLocation(true);
 else if(text.includes('کارهای امروز')||text.includes('کار امروز')||text.includes('وظایف')) readTasks();
 else if(text.includes('ساعت')||text.includes('زمان')) speak(`ساعت ${new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})} است`);
 else speak(`فرمان ${text} دریافت شد، اما هنوز برای آن عملی تعریف نشده است.`);
}

function startRecognition(){
 if(!SpeechRecognition){
   setVoice('تشخیص گفتار این مرورگر پشتیبانی نمی‌شود. برنامه را با Google Chrome باز کنید.','err');
   return;
 }
 try{
  recognition=new SpeechRecognition();
  recognition.lang='fa-IR'; recognition.continuous=false; recognition.interimResults=true; recognition.maxAlternatives=3;
  recognition.onstart=()=>{listening=true;setVoice('🎙️ در حال گوش دادن… صحبت کنید.','ok');$('voiceBtn').hidden=true;$('stopBtn').hidden=false;}
  recognition.onresult=e=>{
    let finalText='', interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){let s=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=s;else interim+=s}
    $('heard').textContent= finalText ? 'شنیدم: «'+finalText+'»' : 'در حال تشخیص: '+interim;
    if(finalText) handleCommand(finalText);
  };
  recognition.onerror=e=>{
    const m={not_allowed:'مجوز میکروفون داده نشده است.',service_not_allowed:'سرویس تشخیص گفتار در دسترس نیست.',no_speech:'صدایی تشخیص داده نشد؛ دوباره امتحان کنید.',audio_capture:'میکروفون در دسترس نیست.',network:'خطای شبکه در سرویس تشخیص گفتار.'}[e.error]||('خطای تشخیص گفتار: '+e.error);
    setVoice(m,'err');
  };
  recognition.onend=()=>{listening=false;$('voiceBtn').hidden=false;$('stopBtn').hidden=true;if(!$('voiceStatus').classList.contains('err'))setVoice('آماده دریافت فرمان فارسی');}
  recognition.start();
 }catch(e){setVoice('شروع میکروفون ممکن نشد: '+e.message,'err')}
}
$('voiceBtn').onclick=async()=>{
 // Trigger microphone permission explicitly before Web Speech where supported.
 try{
   if(navigator.mediaDevices?.getUserMedia){
     const s=await navigator.mediaDevices.getUserMedia({audio:true});
     s.getTracks().forEach(t=>t.stop());
   }
 }catch(e){setVoice('اجازه میکروفون داده نشده است. از تنظیمات سایت، Microphone را روی Allow بگذارید.','err');return}
 startRecognition();
};
$('stopBtn').onclick=()=>{try{recognition?.stop()}catch(e){}};
renderTasks();

if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
