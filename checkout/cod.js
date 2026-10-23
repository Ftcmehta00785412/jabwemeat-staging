import './payment.css';
import './cod.css';
import {supabase} from '../supabase';
import {checkoutContact} from './contact.js';
import {connectCatalogue,calculateBag,catalogue,formatMoney} from '../storefront/catalogue.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let bag=[],priced={count:0,subtotal:0,lines:[]},busy=false,done=false,invalid=false;
try{const data=JSON.parse(sessionStorage.getItem('jwm-checkout-bag')||'[]');if(Array.isArray(data))bag=data.filter(x=>x&&typeof x.id==='string'&&x.pack===0&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10).slice(0,20);}catch{}
const istDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
$('#delivery-date').min=istDate();$('#delivery-date').value=istDate();
const maxDate=new Date(Date.now()+6*86400000);$('#delivery-date').max=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(maxDate);
function notice(message){$('#order-status').textContent=message;}
function controls(){
 const available=catalogue.live&&catalogue.orderingEnabled&&priced.count&&priced.subtotal>=29900&&!invalid;
 $('#place-order').disabled=busy||done||!available;
 $('#place-order').textContent=done?'Order received ✓':busy?'Saving your order…':!catalogue.live?'Connecting to catalogue…':!catalogue.orderingEnabled?'Ordering temporarily unavailable':invalid?'Review unavailable items':priced.subtotal<29900?'Minimum order ₹299 before GST':`Place COD order · ${formatMoney(priced.subtotal+Math.round(priced.subtotal*.18))}`;
}
connectCatalogue(()=>{
 if(done)return;
 priced=calculateBag(bag);invalid=priced.lines.length!==bag.length;
 $('#bag-lines').innerHTML=priced.count?priced.lines.map(l=>`<div class="line"><img src="/assets/original-theme/category-${l.product.image}.webp" alt="${esc(l.product.name)}"><div><strong>${esc(l.product.name)}</strong><small>${esc(l.product.packs[0].label)} · Qty ${l.quantity}</small></div><b>${formatMoney(l.product.packs[0].price*l.quantity)}</b></div>`).join(''):'<div class="empty">Your bag is empty or its items are unavailable. <a href="/">Return to the menu ↗</a></div>';
 const gst=Math.round(priced.subtotal*.18);
 $('#subtotal').textContent=formatMoney(priced.subtotal);$('#gst').textContent=formatMoney(gst);$('#grand-total').textContent=formatMoney(priced.subtotal+gst);
 const pin=$('#pincode').value;
 $('#pincode').innerHTML='<option value="">Choose delivery PIN</option>'+catalogue.pins.map(p=>`<option value="${p}">${p} · Ranchi</option>`).join('');$('#pincode').value=pin;
 renderSlots();
 if(invalid)notice('An item is unavailable or its stock changed. Return to your bag and review it before ordering.');
 else if(!catalogue.orderingEnabled)notice('Ordering is temporarily unavailable. Please contact us on WhatsApp for help.');
 controls();
});
function renderSlots(){
 const previous=$('#slot').value;
 const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
 const slots=catalogue.slots.filter(s=>$('#delivery-date').value!==istDate()||String(s.start_time)>now);
 $('#slot').innerHTML='<option value="">'+(slots.length?'Choose a delivery window':'No windows left — choose another date')+'</option>'+slots.map(s=>`<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
 $('#slot').value=slots.some(s=>s.id===previous)?previous:'';
}
$('#delivery-date').addEventListener('change',renderSlots);
const contactFields={name:$('#customer-name'),email:$('#email'),mobile:$('#mobile')};
for(const field of Object.values(contactFields))field.addEventListener('input',()=>field.setCustomValidity(''));
$('#checkout-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||done||$('#place-order').disabled)return;
 const {contact,errors}=checkoutContact(Object.fromEntries(Object.entries(contactFields).map(([key,field])=>[key,field.value])));
 for(const [key,field] of Object.entries(contactFields))field.setCustomValidity(errors[key]||'');
 const form=event.target;if(!form.reportValidity())return;
 if($('#website').value)return;
 const payload={p_session_key:'',p_customer_name:contact.name,p_email:contact.email,p_mobile:contact.mobile,p_address:{line1:$('#address').value.trim(),line2:$('#address2').value.trim(),city:'Ranchi',state:'Jharkhand'},p_pincode:$('#pincode').value,p_delivery_date:$('#delivery-date').value,p_slot_id:$('#slot').value,p_items:bag.map(x=>({product_id:x.id,quantity:x.quantity})),p_notes:null,p_expected_total:(priced.subtotal+Math.round(priced.subtotal*.18))/100};
 busy=true;controls();notice('Checking availability and saving your COD order. Please do not close this page.');
 try{
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  let attempt;try{attempt=JSON.parse(sessionStorage.getItem('jwm-cod-attempt')||'null');}catch{}
  if(!attempt||attempt.fingerprint!==fingerprint){attempt={fingerprint,key:crypto.randomUUID()};sessionStorage.setItem('jwm-cod-attempt',JSON.stringify(attempt));}
  payload.p_session_key=attempt.key;payload.p_idempotency_key=attempt.key;
  const {data,error}=await supabase.rpc('place_cod_order',payload).abortSignal(AbortSignal.timeout(30000));
  if(error)throw error;
  if(!data?.order_number||!Number.isFinite(Number(data.total)))throw Error('Order confirmation could not be read. Retry with the same details to retrieve your order.');
  confirmOrder(data);
 }catch(error){if(!await recoverOrder().catch(()=>false))notice(error.message||'We could not confirm the order. Check your connection and retry with the same details; an already saved order will not be duplicated.');}
 finally{busy=false;controls();}
});

function confirmOrder(data){
  let invoiceKey='';try{invoiceKey=JSON.parse(sessionStorage.getItem('jwm-cod-attempt')||'null')?.key||'';}catch{}
  done=true;sessionStorage.removeItem('jwm-checkout-bag');
  $('#checkout-form').hidden=true;$('#success').hidden=false;
  $('#success').innerHTML=`<span class="success-icon" aria-hidden="true">✓</span><p class="eyebrow">THANK YOU FOR YOUR ORDER</p><h2>${esc(data.order_number)}</h2><p>Your order has been received. Our team will confirm availability and delivery details.</p><dl><div><dt>Payment method</dt><dd>Cash on Delivery</dd></div><div><dt>GST (18%)</dt><dd>${formatMoney(Math.round(Number(data.gst_amount)*100))}</dd></div><div><dt>Delivery</dt><dd>FREE · inaugural offer</dd></div><div><dt>Amount to pay on delivery</dt><dd>${formatMoney(Math.round(Number(data.total)*100))}</dd></div></dl><p>Please save your order number. For help, contact Grievance Officer on <a href="mailto:support@jabwemeat.com">support@jabwemeat.com</a>.</p><div id="invoice-download"><button type="button" class="continue" id="download-invoice">Download invoice PDF ↓</button><p id="invoice-download-status" role="status"></p></div><a class="continue" href="/">Back to the menu ↗</a>`;
  $('#grand-total').textContent=formatMoney(Math.round(Number(data.total)*100));notice(`Order ${data.order_number} received. Pay ${formatMoney(Math.round(Number(data.total)*100))} on delivery. No online payment was taken.`);$('#success').focus();window.scrollTo({top:0,behavior:'smooth'});
  const invoiceButton=$('#download-invoice');
  if(invoiceButton){
    invoiceButton.hidden=!invoiceKey;
    invoiceButton.addEventListener('click',async()=>{
      invoiceButton.disabled=true;$('#invoice-download-status').textContent='Preparing your invoice…';
      try{
        const {data:invoice,error}=await supabase.rpc('get_order_invoice',{p_idempotency_key:invoiceKey}).abortSignal(AbortSignal.timeout(15000));
        if(error)throw error;
        if(!invoice?.snapshot)throw Error('Your invoice is not available yet. Please contact support with your order number.');
        const {downloadInvoice}=await import('../documents/invoice-pdf.js');downloadInvoice(invoice);
        $('#invoice-download-status').textContent='Invoice PDF downloaded. Please save it for your records.';
      }catch(err){$('#invoice-download-status').textContent=err.message||'Could not download your invoice. Please try again.';}
      finally{invoiceButton.disabled=false;}
    });
  }
  sessionStorage.removeItem('jwm-cod-attempt');
  controls();
}
async function recoverOrder(){
 let saved;try{saved=JSON.parse(sessionStorage.getItem('jwm-cod-attempt')||'null');}catch{}
 if(!saved?.key)return false;
 const {data,error}=await supabase.rpc('get_cod_order_receipt',{p_idempotency_key:saved.key}).abortSignal(AbortSignal.timeout(15000));
 if(!error&&data?.order_number){confirmOrder(data);return true;}
 return false;
}
recoverOrder().catch(()=>{});
