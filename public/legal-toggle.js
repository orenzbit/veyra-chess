(function(){
  function apply(lang){
    const isEnglish=lang==='en';
    document.querySelectorAll('.he').forEach(el=>{el.style.display=isEnglish?'none':'block'});
    document.querySelectorAll('.en').forEach(el=>{el.style.display=isEnglish?'block':'none'});
    document.documentElement.lang=isEnglish?'en':'he';
    document.documentElement.dir=isEnglish?'ltr':'rtl';
    const button=document.getElementById('lang-toggle');
    if(button) button.textContent=isEnglish?'עברית':'EN';
    try{localStorage.setItem('tabia_language',lang)}catch{}
  }
  window.addEventListener('DOMContentLoaded',function(){
    let lang='he';
    try{lang=localStorage.getItem('tabia_language')==='en'?'en':'he'}catch{}
    apply(lang);
    const button=document.getElementById('lang-toggle');
    if(button) button.addEventListener('click',function(){
      apply(document.documentElement.lang==='en'?'he':'en');
    });
  });
})();
