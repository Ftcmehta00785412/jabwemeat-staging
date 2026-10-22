import './payment.css';
import { connectCatalogue, calculateBag, formatMoney, catalogue } from '../storefront/catalogue.js';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let bag=[];
try {
  const stored=JSON.parse(sessionStorage.getItem('jwm-checkout-bag')||'[]');
  if(Array.isArray(stored))bag=stored.slice(0,50).filter(line=>line&&typeof line.id==='string'&&line.id.length<=100&&line.pack===0&&Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=10).map(({id,pack,quantity})=>({id,pack,quantity}));
} catch { /* Malformed or inaccessible session storage: start with an empty bag. */ }
connectCatalogue(()=>{
  const target=document.querySelector('#bag-lines'),subtotal=document.querySelector('#subtotal');
  if(!catalogue.live){target.innerHTML='<div class="empty">The catalogue is temporarily unavailable. No payment can be made. Please try again later.</div>';subtotal.textContent='—';return;}
  const priced=calculateBag(bag);
  if(!priced.count){target.innerHTML='<div class="empty">Your bag is waiting for something delicious.<br><a href="/">Explore the menu ↗</a></div>';subtotal.textContent=formatMoney(0);return;}
  target.innerHTML=priced.lines.map(line=>`<div class="line"><img src="/assets/original-theme/category-${line.product.image}.webp" alt="Illustrative ${escapeHTML(line.product.name)}"><div><strong>${escapeHTML(line.product.name)}</strong><small>${escapeHTML(line.product.packs[line.pack].label)} · Qty ${line.quantity}</small></div><b>${formatMoney(line.product.packs[line.pack].price*line.quantity)}</b></div>`).join('');
  subtotal.textContent=formatMoney(priced.subtotal);
});
