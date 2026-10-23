const carousel=document.querySelector('#home-banner-slider');
if(carousel){
 const slides=[...carousel.querySelectorAll('.banner-slide')];
 const dots=[...carousel.querySelectorAll('[data-slide-to]')];
 const pause=carousel.querySelector('.banner-autoplay');
 const status=carousel.querySelector('.banner-sr-status');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,paused=motion.matches,hover=false,focus=false,timer;
 const video=carousel.querySelector('video');
 function schedule(){clearTimeout(timer);if(!paused&&!hover&&!focus&&!document.hidden)timer=setTimeout(()=>show(index+1,false),8000)}
 function show(next,announce=true){
  index=(next+slides.length)%slides.length;
  slides.forEach((slide,i)=>{const active=i===index;slide.classList.toggle('is-active',active);slide.inert=!active;slide.setAttribute('aria-hidden',String(!active));});
  dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current')});
  if(video&&index===0)video.pause();
  if(announce)status.textContent=`Banner ${index+1} of ${slides.length}`;
  schedule();
 }
 carousel.querySelector('[data-slide-prev]').addEventListener('click',()=>show(index-1));
 carousel.querySelector('[data-slide-next]').addEventListener('click',()=>show(index+1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
 function updatePause(){pause.textContent=paused?'Play slides':'Pause slides';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Start automatic banner rotation':'Pause automatic banner rotation');schedule()}
 pause.addEventListener('click',()=>{paused=!paused;updatePause()});
 carousel.addEventListener('mouseenter',()=>{hover=true;schedule()});
 carousel.addEventListener('mouseleave',()=>{hover=false;schedule()});
 carousel.addEventListener('focusin',()=>{focus=true;schedule()});
 carousel.addEventListener('focusout',()=>{setTimeout(()=>{focus=carousel.contains(document.activeElement);schedule()},0)});
 carousel.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1))}});
 let x,y;
 carousel.addEventListener('touchstart',event=>{x=event.changedTouches[0].clientX;y=event.changedTouches[0].clientY},{passive:true});
 carousel.addEventListener('touchend',event=>{const dx=event.changedTouches[0].clientX-x,dy=event.changedTouches[0].clientY-y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1))},{passive:true});
 document.addEventListener('visibilitychange',schedule);
 motion.addEventListener('change',()=>{paused=motion.matches;updatePause()});
 updatePause();show(0,false);
}
