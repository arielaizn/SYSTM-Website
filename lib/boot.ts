// Inline script that runs in <head> before first paint. It decides the motion mode so the blur-reveal initial
// state (hidden + blurred) is only applied when JavaScript is running AND the visitor has not opted out.
// A 5s watchdog turns motion off if the app bundle never takes over, so content can never stay hidden.
export const BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var off=false;try{off=localStorage.getItem('systm-motion')==='off'}catch(e){}
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
d.classList.add('js');
if(off||rm||!('IntersectionObserver' in window)){d.classList.add('motion-off')}
else{d.classList.add('motion-enabled');window.__revealWatchdog=setTimeout(function(){d.classList.remove('motion-enabled');d.classList.add('motion-off')},5000)}
}catch(e){}})();`;
