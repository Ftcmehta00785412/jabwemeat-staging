import './payment.css';
import { connectCatalogue, calculateBag, formatMoney, catalogue } from '../storefront/catalogue.js';
import { supabase } from '../supabase';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const $=selector=>document.querySelector(selector);
let bag=[],priced={count:0,subtotal:0,lines:[]},configured=false,busy=false,session=null,attempt=null,complete=false,sdkPromise;
const status=message=>{$('#payment-status').textContent=message;};
try {
  const stored=JSON.parse(sessionStorage.getItem('jwm-checkout-bag')||'[]');
  if(Array.isArray(stored))bag=stored.slice(0,50).filter(line=>line&&typeof line.id==='string'&&line.id.length<=100&&line.pack===0&&Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=10).map(({id,pack,quantity})=>({id,pack,quantity}));
  const saved=JSON.parse(sessionStorage.getItem('jwm-test-attempt')||'null');
  if(saved && /^order_[A-Za-z0-9]+$/.test(saved.order_id))attempt=saved;
} catch { /* Malformed or unavailable storage: start without a stored test. */ }
function saveAttempt(){try{sessionStorage.setItem('jwm-test-attempt',JSON.stringify(attempt));}catch{}}
function controls(){
  const pending=!!attempt?.result;
  $('#pay-button').disabled=busy||!configured||!session||!catalogue.live||!priced.count||pending||complete;
  $('#pay-button').textContent=complete?'Test payment verified':busy?'Please wait…':!configured?'Test payments not configured':pending?'Payment awaiting verification':!session?'Sign in to admin to test':!priced.count?'Add products to test':`Pay ${formatMoney(priced.subtotal)} · TEST MODE`;
  $('#verify-button').hidden=!pending||complete;
  $('#verify-button').disabled=busy||!session||!configured;
}
function loadRazorpay(){
  if(window.Razorpay)return Promise.resolve();
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
    const timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(Error('Razorpay took too long to load. Please check your connection.'));},15000);
    script.onload=()=>{clearTimeout(timer);if(window.Razorpay)resolve();else{sdkPromise=null;reject(Error('Razorpay could not load.'));}};
    script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(Error('Could not load Razorpay. Check your connection and try again.'));};
    document.head.append(script);
  });return sdkPromise;
}
async function api(path,body){
  const {data}=await supabase.auth.getSession();
  if(!data.session)throw Error('Sign in to admin, then return to checkout.');
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  let result;try{result=await response.json();}catch{throw Error('The payment service returned an invalid response. Check Razorpay before retrying.');}
  if(!response.ok)throw Error(result.error||'Could not complete the payment request.');
  return result;
}
async function verifyPayment(){
  if(!attempt?.result)return;
  busy=true;controls();status('Checking the signature and captured payment with the server…');
  try{
    const result=await api('/api/verify-payment',attempt.result);
    if(!result.success){status(result.message||'Payment is still pending. Do not pay again; recheck its status.');return;}
    complete=true;attempt.complete=true;saveAttempt();
    const target=$('#test-result');target.hidden=false;
    target.innerHTML=`<strong>Test payment verified ✓</strong>Payment: ${escapeHTML(result.payment_id)}<br>Razorpay order: ${escapeHTML(result.order_id)}<br>Test amount: ${escapeHTML(formatMoney(result.amount))}<br><br>No real money was collected. No store order or delivery booking was created.`;
    status('Signature verified and test payment captured. This is not a customer order.');
  }catch(error){status(`${error.message} Do not pay again while verification is unresolved. Use “Recheck payment status”.`);}
  finally{busy=false;controls();}
}
$('#verify-button').addEventListener('click',verifyPayment);
$('#pay-button').addEventListener('click',async()=>{
  if(busy||!configured||!priced.count||attempt?.result||complete)return;
  busy=true;controls();status('Checking your bag and preparing a test payment…');
  try{
    // Load first: failure must not create an unnecessary provider order.
    await loadRazorpay();
    const order=await api('/api/create-order',{items:bag,currency:'INR',...(attempt?.order_id?{existing_order_id:attempt.order_id}:{})});
    if(order.mode!=='test'||!/^rzp_test_/.test(order.key_id)||!Number.isInteger(order.amount)||order.amount<100)throw Error('The server did not return a valid test-mode order.');
    attempt={order_id:order.order_id};saveAttempt();
    $('#test-amount').textContent=formatMoney(order.amount);
    let verifying=false,failed=false;
    const checkout=new window.Razorpay({
      key:order.key_id,amount:order.amount,currency:order.currency,order_id:order.order_id,
      name:'JabWeMeat',description:'Administrator test payment — no delivery order',theme:{color:'#203f35'},
      handler:async result=>{
        verifying=true;
        // Save before verification so a dropped connection can be recovered without another payment.
        attempt.result={razorpay_payment_id:result.razorpay_payment_id,razorpay_order_id:result.razorpay_order_id,razorpay_signature:result.razorpay_signature};saveAttempt();
        await verifyPayment();
      },
      modal:{ondismiss:()=>{if(verifying)return;busy=false;status(failed?'The test attempt failed. No payment is confirmed. You can retry this same test order.':'Checkout cancelled. No payment is confirmed. You can reopen this test order.');controls();}}
    });
    checkout.on('payment.failed',()=>{failed=true;status('The test payment failed. Retry in Razorpay or close the modal. No payment is confirmed.');});
    status('Complete the test payment in Razorpay. Never enter real payment details for this test.');checkout.open();
  }catch(error){busy=false;status(error.message||'Could not start payment. Check Razorpay before trying again.');controls();}
});
connectCatalogue(()=>{
  const target=$('#bag-lines'),subtotal=$('#subtotal');
  if(!catalogue.live){target.innerHTML='<div class="empty">The catalogue is temporarily unavailable. No new payment can be made. Please try again later.</div>';subtotal.textContent='—';controls();return;}
  priced=calculateBag(bag);
  if(!priced.count){target.innerHTML='<div class="empty">Your bag is waiting for something delicious.<br><a href="/">Explore the menu ↗</a></div>';subtotal.textContent=formatMoney(0);$('#test-amount').textContent='—';controls();return;}
  target.innerHTML=priced.lines.map(line=>`<div class="line"><img src="/assets/original-theme/category-${line.product.image}.webp" alt="Illustrative ${escapeHTML(line.product.name)}"><div><strong>${escapeHTML(line.product.name)}</strong><small>${escapeHTML(line.product.packs[line.pack].label)} · Qty ${line.quantity}</small></div><b>${formatMoney(line.product.packs[line.pack].price*line.quantity)}</b></div>`).join('');
  subtotal.textContent=formatMoney(priced.subtotal);$('#test-amount').textContent=formatMoney(priced.subtotal);controls();
});
supabase.auth.getSession().then(({data})=>{session=data.session;controls();});
supabase.auth.onAuthStateChange((_event,next)=>{session=next;controls();});
fetch('/api/payment-config',{cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error('Payment setup unavailable');
  const config=await response.json();configured=config.enabled===true&&config.mode==='test';
  $('#gateway-status').textContent=configured?'Test mode ready':'Setup pending';
  $('#setup-note').textContent=configured?'The server is configured for administrator-only test payments. Live keys are blocked. No delivery order is created and inventory is not reserved.':'The backend is installed, but server-side test credentials and the test-enable setting are still required. No payment can start until they are configured.';
  if(attempt?.result)status('A previous payment needs verification. Recheck it rather than paying again.');
}).catch(()=>{$('#gateway-status').textContent='Setup unavailable';status('Could not check the payment setup. Please try again later.');}).finally(controls);
