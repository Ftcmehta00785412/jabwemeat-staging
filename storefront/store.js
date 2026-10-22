import { categories, products, productById, formatMoney, calculateBag, catalogue, connectCatalogue } from './catalogue.js';
import { icon, hydrateIcons } from './icons.js';

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
// A separate, validated tab-session cart; never enable ordering or write customer data.
const state = { category: 'all', query: '', sort: 'featured', bag: [], pincode: '', modal: null, product: null, pack: 0 };
const cartStorageKey = 'jwm-preview-cart-v1';
const shopCategories = [
  { id:'all', label:'Shop', short:'All' },
  { id:'chicken', label:'Chicken', short:'Chicken', mark:'Ch', note:'Everyday dinner inspiration' },
  { id:'mutton', label:'Mutton', short:'Mutton', mark:'Mu', note:'Make room for a weekend favourite' },
  { id:'seafood', label:'Fish & Seafood', short:'Fish & Seafood', mark:'Fs', note:'Explore a little coastal inspiration' },
  { id:'ready', label:'Ready to Cook', short:'Ready to Cook', mark:'Rc', note:'A starting point for your next meal' },
  { id:'eggs', label:'Eggs', short:'Eggs', mark:'Eg', note:'Small beginnings, many possibilities' }
];
const categoryLabel = id => shopCategories.find(category => category.id === id)?.label || categories.find(category => category.id === id)?.label || 'Catalogue';
const categoryHref = id => `/?category=${encodeURIComponent(id)}#catalogue`;
const productPhoto = '/assets/product-placeholder.svg';
try {
  const saved = JSON.parse(sessionStorage.getItem(cartStorageKey) || '[]');
  if (Array.isArray(saved)) state.bag = saved.slice(0,100).filter(line => line && typeof line.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(line.id) && Number.isInteger(line.pack) && line.pack >= 0 && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 10).filter((line,index,all) => all.findIndex(other => other.id === line.id && other.pack === line.pack) === index).map(({id,pack,quantity}) => ({id,pack,quantity}));
} catch {}
function saveBag() { try { sessionStorage.setItem(cartStorageKey, JSON.stringify(state.bag)); } catch {} }
try { sessionStorage.removeItem('jwm-checkout-bag'); } catch {}
const dialog = $('#shop-dialog');
let toastTimeout;
let previousFocus;
let searchTimeout;

function toast(message) {
  clearTimeout(toastTimeout);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}
function restoreFocus(key) {
  if (key) document.querySelector(`[data-focus="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}
function qty(id, pack) { return state.bag.find(line => line.id === id && line.pack === pack)?.quantity || 0; }
function quantityControl(id, pack, amount, prefix = 'card') {
  const product = productById(id);
  const name = escapeHTML(product.name + ', ' + product.packs[pack].label);
  return `<div class="quantity-control" aria-label="Quantity for ${name}"><button data-action="decrease" data-id="${id}" data-pack="${pack}" data-focus="${prefix}-${id}-${pack}-minus" aria-label="Remove one ${name}">${icon('minus')}</button><strong aria-live="polite">${amount}</strong><button data-action="increase" data-id="${id}" data-pack="${pack}" data-focus="${prefix}-${id}-${pack}-plus" aria-label="Add one ${name}" ${amount >= Math.min(10, product.stock ?? 10) ? 'disabled' : ''}>${icon('plus')}</button></div>`;
}
function addControl(id, pack, prefix = 'card') {
  const product = productById(id);
  if (!product || product.stock === 0 || !catalogue.live) return `<button class="add-button" disabled>${catalogue.live ? 'Out of stock' : 'Unavailable'}</button>`;
  const amount = qty(id, pack);
  return amount ? quantityControl(id, pack, amount, prefix) : `<button class="add-button" data-action="increase" data-id="${id}" data-pack="${pack}" data-focus="${prefix}-${id}-${pack}-plus" aria-label="Add ${escapeHTML(product.name)}, ${escapeHTML(product.packs[pack].label)}, to preview cart">Add to Cart ${icon('plus')}</button>`;
}
function renderCategories() {
  $('#top-categories').innerHTML = shopCategories.map(category => `<a href="${categoryHref(category.id)}" class="nav-tab ${state.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" data-focus="nav-${category.id}" ${state.category === category.id ? 'aria-current="page"' : ''}>${escapeHTML(category.label)}</a>`).join('') + '<a class="nav-tab" href="/?view=track" data-action="info" data-topic="track">Track Order</a><a class="nav-tab" href="/?view=cart" data-action="cart">Cart</a>';
  $('#filter-chips').innerHTML = shopCategories.map(category => `<a href="${categoryHref(category.id)}" class="filter-chip ${state.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" data-focus="filter-${category.id}" ${state.category === category.id ? 'aria-current="page"' : ''}>${escapeHTML(category.short)}</a>`).join('');
  $('#catalogue-title').textContent = state.category === 'all' ? 'Explore the range' : categoryLabel(state.category);
}
function renderProducts() {
  if (!catalogue.live && !products.length) { $('#results-line').textContent = catalogue.loading ? 'Connecting to the staging catalogue…' : 'Catalogue temporarily unavailable'; $('#product-grid').innerHTML = `<div class="empty-results"><h3>${catalogue.loading ? 'Something delicious is loading.' : 'The menu is taking a moment.'}</h3><p>${catalogue.loading ? 'Connecting to the staging catalogue.' : 'Please try again shortly. No sample prices are being substituted.'}</p></div>`; return; }
  const normalizedQuery = state.query.trim().toLocaleLowerCase('en-IN');
  let filtered = products.filter(product => (state.category === 'all' || product.category === state.category) && `${product.name} ${product.detail} ${product.category}`.toLocaleLowerCase('en-IN').includes(normalizedQuery));
  if (state.sort === 'price-asc') filtered.sort((a,b) => a.packs[0].price - b.packs[0].price);
  if (state.sort === 'price-desc') filtered.sort((a,b) => b.packs[0].price - a.packs[0].price);
  if (state.sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
  $('#results-line').textContent = `${filtered.length} ${filtered.length === 1 ? 'product' : 'products'}${state.query ? ` for “${state.query}”` : ''} · Prices for the configured pack · ordering closed`;
  $('#product-grid').innerHTML = filtered.length ? filtered.map(product => `<article class="card product-card" data-product="${product.id}"><button class="product-image-button" data-action="product" data-id="${product.id}" aria-label="View ${escapeHTML(product.name)} details"><img src="${productPhoto}" width="900" height="675" loading="lazy" alt="Product photograph pending approval"><span class="product-image-label">Product photo pending approval</span></button><div class="product-content"><button class="product-name" data-action="product" data-id="${product.id}">${escapeHTML(product.name)}</button><p class="product-detail">${escapeHTML(product.detail)}</p><p class="availability ${product.stock === 0 ? 'sold-out' : ''}">${!catalogue.live ? 'Stock check unavailable' : product.stock > 0 ? 'In staging stock · ordering closed' : 'Out of stock in staging'}</p><div class="pack-preview"><span>${escapeHTML(product.packs[0].label)}</span><button class="pack-options-link" data-action="product" data-id="${product.id}">View pack details ↗</button></div><div class="product-bottom"><span class="price">${formatMoney(product.packs[0].price)}<small>Staging price</small></span>${addControl(product.id, 0)}</div></div></article>`).join('') : `<div class="empty-results">${icon('search')}<h3>No matches on this menu.</h3><p>Try “chicken”, “fish” or another category.</p><button class="btn btn-primary" data-action="reset">Show all products</button></div>`;
}
function renderBagCount() {
  const bag = calculateBag(state.bag);
  $('#bag-count').textContent = String(bag.count);
  $('.bag-button').setAttribute('aria-label', `Open shopping bag, ${bag.count} ${bag.count === 1 ? 'item' : 'items'}`);
  $('#mobile-bag').hidden = bag.count === 0;
  $('#mobile-bag-label').textContent = `${bag.count} ${bag.count === 1 ? 'item' : 'items'} · ${formatMoney(bag.subtotal)}`;
}
function changeBag(id, pack, delta) {
  const product = productById(id);
  if (!product || !Number.isInteger(pack) || !product.packs[pack] || (delta > 0 && !catalogue.live)) return;
  const oldQuantity = qty(id, pack);
  const quantity = Math.max(0, Math.min(10, product.stock ?? 10, oldQuantity + delta));
  if (quantity === oldQuantity) { toast('The configured stock limit or 10-pack preview limit has been reached.'); return; }
  const focus = document.activeElement?.dataset?.focus;
  const existing = state.bag.find(line => line.id === id && line.pack === pack);
  if (existing) existing.quantity = quantity;
  else if (quantity) state.bag.push({ id, pack, quantity });
  state.bag = state.bag.filter(line => line.quantity > 0);
  saveBag();
  renderProducts();
  renderBagCount();
  if (state.modal === 'cart') renderCart();
  if (state.modal === 'product') renderProductDetails();
  restoreFocus(focus);
  if (!oldQuantity && quantity) toast(`${product.name} added to your preview bag.`);
}
function selectCategory(id, clearQuery = true, updateURL = true) {
  if (!shopCategories.some(category => category.id === id)) return;
  state.category = id;
  if (clearQuery) { state.query = ''; $('#search').value = ''; }
  const focus = document.activeElement?.dataset?.focus;
  renderCategories(); renderProducts(); restoreFocus(focus);
  closeDialog();
  if (updateURL) {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.set('category', id);
    url.searchParams.delete('q');
    url.hash = 'catalogue';
    history.pushState(null, '', url);
    document.title = `${id === 'all' ? 'Shop' : categoryLabel(id)} — JabWeMeat`;
  }
  $('#catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function header(title, extra = '') { return `<div class="dialog-header"><h2 id="dialog-title">${title}</h2>${extra}<button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>`; }
function openDialog(type) {
  if (!dialog.open) previousFocus = document.activeElement;
  state.modal = type;
  dialog.classList.toggle('drawer', type === 'cart' || type === 'checkout');
  document.body.classList.add('modal-open');
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  requestAnimationFrame(() => dialog.querySelector('button, input, select, [tabindex="0"]')?.focus({ preventScroll: true }));
}
function closeDialog(preserveRoute = false) {
  if (!dialog.open) return;
  dialog.close();
  state.modal = null;
  if (!preserveRoute && new URLSearchParams(location.search).has('view')) {
    const url = new URL(location.href);
    url.searchParams.delete('view');
    history.replaceState(null, '', url);
    document.title = `${state.category === 'all' ? 'Shop' : categoryLabel(state.category)} — JabWeMeat`;
  }
}
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('close', () => { if (dialog.open) return; state.modal = null; document.body.classList.remove('modal-open'); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(); } });

function renderProductDetails() {
  const product = productById(state.product);
  const pack = product.packs[state.pack];
  $('#dialog-content').innerHTML = `${header('A closer look', '<span class="badge">Staging product</span>')}<div class="detail-layout"><div class="detail-photo"><img src="${productPhoto}" width="900" height="675" alt="Product photograph pending approval"><span>Neutral placeholder · real product photo pending approval</span></div><div class="detail-copy"><span class="detail-category">${escapeHTML(categoryLabel(product.category).toUpperCase())}</span><h3>${escapeHTML(product.name)}</h3><p class="detail-caption">${escapeHTML(product.detail)}</p><p>${escapeHTML(product.description)}</p><p class="availability ${product.stock === 0 ? 'sold-out' : ''}">${!catalogue.live ? 'Stock check unavailable' : product.stock > 0 ? 'In staging stock · ordering closed' : 'Out of stock in staging'}</p><div class="pack-title">Choose your configured pack</div><div class="pack-selector" role="group" aria-label="Pack size">${product.packs.map((option,index) => `<button class="${state.pack === index ? 'selected' : ''}" data-action="pack" data-pack="${index}" data-focus="pack-${index}" aria-pressed="${state.pack === index}"><span>${escapeHTML(option.label)}</span><strong>${formatMoney(option.price)}</strong></button>`).join('')}</div><div class="detail-add"><span class="price">${formatMoney(pack.price)}<small>Staging price · ${escapeHTML(pack.label)}</small></span>${addControl(product.id, state.pack, 'detail')}</div><div class="notice">${icon('info')}<span>Preview only. Catalogue values are not final approved retail specifications. No orders can be placed.</span></div><div class="detail-facts"><h4>Product condition &amp; cut</h4><p>Verified chilled/frozen status, cut specifications and preparation details are pending approval. Product names and staging descriptions are not a substitute for verified pack information.</p><h4>Ingredients &amp; allergens</h4><p>${escapeHTML(product.allergens)}</p><h4>Handling &amp; storage</h4><p>Product-specific storage temperature, shelf life, use-by information and cooking instructions are pending approval. Follow the verified pack label when available; this preview is not a product safety specification.</p><h4>Sourcing &amp; licensing</h4><p>Supplier information, sourcing claims and licence disclosures have not yet been verified for public launch.</p></div></div></div>`;
}
function openProduct(id) { if (!productById(id)) return; state.product = id; state.pack = 0; renderProductDetails(); openDialog('product'); }
function summaryHTML(bag) { return `<div class="bag-summary"><div class="summary-row"><span>Items subtotal</span><strong>${formatMoney(bag.subtotal)}</strong></div><div class="summary-row"><span>Delivery charges</span><span>Not confirmed</span></div><div class="summary-row"><span>Taxes / other fees</span><span>Not configured</span></div><div class="summary-row total"><span>Preview subtotal</span><span>${formatMoney(bag.subtotal)}</span></div></div>`; }
function renderCart() {
  const bag = calculateBag(state.bag);
  $('#dialog-content').innerHTML = header('Your preview cart', `<span class="badge">${bag.count} ${bag.count === 1 ? 'item' : 'items'}</span>`) + (bag.count ? `<div class="bag-lines">${bag.lines.map(line => `<div class="bag-line"><img src="${productPhoto}" width="75" height="83" alt="Product photo pending approval"><div><div class="bag-line-name"><span>${escapeHTML(line.product.name)}</span><button class="remove-button" data-action="remove" data-id="${line.id}" data-pack="${line.pack}" aria-label="Remove ${escapeHTML(line.product.name)}, ${escapeHTML(line.product.packs[line.pack].label)}">${icon('trash')}</button></div><p class="bag-line-meta">${escapeHTML(line.product.packs[line.pack].label)} · ${formatMoney(line.product.packs[line.pack].price)} per pack</p><div class="bag-line-bottom">${quantityControl(line.id, line.pack, line.quantity, 'bag')}<strong>${formatMoney(line.product.packs[line.pack].price * line.quantity)}</strong></div></div></div>`).join('')}</div>${summaryHTML(bag)}<div class="bag-bottom"><div class="notice">${icon('info')}<span>This is a preview cart, not an order. Delivery and taxes are not included in this subtotal.</span></div><button class="btn btn-primary" data-action="checkout">Review preview checkout ${icon('arrow')}</button><button class="btn btn-outline" data-action="close">Keep exploring</button><p>Your preview cart is kept in this tab’s session storage, including after reload when storage is available. No customer details are saved in the cart. Stock is rechecked against staging; this is not a reservation.</p></div>` : `<div class="bag-empty">${icon('bag')}<h3>A delicious beginning awaits.</h3><p>Your cart is empty. Explore the staging menu<br>and find something you love.</p><button class="btn btn-primary" data-action="browse">Explore the range ${icon('arrow')}</button></div>`);
}
function openCart() { renderCart(); openDialog('cart'); }
function openCheckout() {
  const bag = calculateBag(state.bag);
  if (!bag.count) return openCart();
  try {
    sessionStorage.setItem('jwm-checkout-bag', JSON.stringify(bag.lines.map(({id,pack,quantity})=>({id,pack,quantity}))));
    window.location.assign('/checkout/');
  } catch {
    toast('Your browser blocked the preview bag handoff. Allow tab storage and try again.');
  }
}
function openLocation() {
  $('#dialog-content').innerHTML = `${header('Your neighbourhood')}<div class="dialog-inner info-body"><p>Good food starts close to home. Try the delivery-location selector below.</p><div class="notice warning">${icon('info')}<span><strong>Staging check:</strong> ${catalogue.live ? 'This checks the PIN codes configured in the database. Public ordering is still closed.' : 'Live delivery settings are unavailable. A valid PIN code is not a serviceability confirmation.'}</span></div><form id="pincode-form" novalidate><label class="pin-label" for="pincode">Indian pincode</label><div class="pin-row"><input class="input input-field" id="pincode" name="pincode" value="${escapeHTML(state.pincode)}" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" autocomplete="off" placeholder="Enter 6-digit pincode" aria-describedby="pin-error"><button class="btn btn-primary" type="submit">Check pincode</button></div><p class="field-error" id="pin-error" role="alert"></p></form><p>Only the pincode is held in this tab while you explore. It is not sent to a delivery service or stored after reload.</p></div>`;
  openDialog('location');
  requestAnimationFrame(() => $('#pincode')?.focus({ preventScroll: true }));
}
const info = {
  story: { title: 'A match made in your kitchen.', body: '<p>JabWeMeat is a new, independent meat-and-seafood store concept, built for people who believe the best meals come with good company.</p><p>Our starting point is simple: a thoughtfully organised menu, clear product information and a shopping experience that feels as good as the meal you are planning.</p><h3>From everyday cravings to Sunday feasts</h3><p>The preview brings together chicken, mutton, fish, prawns, marinated options and eggs. The staging catalogue is connected; final product approval, sourcing commitments and launch delivery arrangements are still pending.</p><div class="notice">Original JabWeMeat branding and design, made for the moments around your table.</div>' },
  support: { title: 'Let’s stay in touch.', body: '<p>Verified customer-support contact details have not been configured yet. No phone number, email address or social profile is claimed by this preview.</p><p>Official support channels, the business address and complaint-resolution process will be displayed before orders open.</p>' },
  launch: { title: 'Something delicious is taking shape.', body: '<p>The original JabWeMeat design is connected to the staging catalogue. Product exploration, the preview shopping bag and existing-account email sign-in are available. Order submission and payments remain disabled.</p><h3>Before ordering opens</h3><ul><li>Confirm the operating business, licences and required food-product disclosures.</li><li>Approve real products, photographs, ingredients, weights and prices.</li><li>Set delivery areas, slots, charges and cold-chain fulfilment.</li><li>Connect secure payments, order storage and customer support.</li><li>Publish approved delivery, cancellation, refund, terms and privacy policies.</li></ul>' },
  privacy: { title: 'Privacy in this preview', body: '<p>The preview cart stores only product identifiers, pack choices and quantities in this browser tab’s session storage. It can survive reloads but is not a confirmed order. The optional pincode is held in memory and resets on reload. Clearing browser storage removes the preview cart.</p><p>Optional account sign-in is handled by the existing Supabase account panel, including Google sign-in where configured. Authentication providers may retain a browser session until sign-out. Do not sign in on a shared device. Checkout has its own existing preview flow; no order or payment is enabled by this storefront refresh.</p><p>No marketing trackers, third-party fonts or remote product photos are included in this storefront theme. Catalogue reads use Supabase. Hosting and identity providers may process technical logs and sign-in data under their own policies.</p><p>This is a preview notice, not a completed business privacy policy. The responsible legal entity, full data practices, retention rules, service providers and customer contact details must be approved before launch.</p>' },
  terms: { title: 'Terms & policies', body: '<p>This is a non-transactional design preview, not an offer to sell. Staging prices, product names, pack sizes, ingredients and images are not verified product specifications.</p><p>Delivery, cancellation, refund, consumer-grievance, terms-of-sale and privacy policies have not been approved. They must be finalised for the actual business before the website accepts any orders.</p><div class="notice warning">No orders, payments or reservations can be made through this preview.</div>' },
  images: { title: 'A note on the imagery', body: '<p>The storefront uses neutral product-photo placeholders, typographic category artwork and original editorial shapes. None is a photograph of inventory, a supplier product or a pack’s contents.</p><p>Inherited staging food imagery is not being represented as real product photography. Accurate photographs of the actual products and packs must be supplied and approved before ordering opens.</p>' },
  delivery: { title: 'Delivery information', body: '<p>The pincode checker reads configured staging coverage only. A match is not confirmation that delivery is available today: public ordering remains closed.</p><p>Delivery charges, minimum order, delivery windows, handling arrangements and service commitments are not confirmed. Configured staging slots, if any, are not a launch promise.</p><div class="info-links"><button class="btn btn-primary" data-action="location">Check staging pincode</button></div>' },
  faq: { title: 'Frequently asked questions', body: '<h3>Can I order?</h3><p>Not yet. Browse the staging range and test a preview cart. Ordering and payments remain closed.</p><h3>Are prices and stock final?</h3><p>No. Prices, weights, descriptions and stock are staging values and are subject to approval. Adding an item does not reserve stock.</p><h3>Where do you deliver?</h3><p>Check a pincode for configured staging coverage. Delivery times and fees are not confirmed.</p><h3>Is product information verified?</h3><p>Real photos, chilled/frozen status, ingredients, allergens, storage guidance and sourcing disclosures are pending approval.</p><h3>How can I get help?</h3><p>Verified customer-support channels are not configured yet. Contact and grievance details must be published before launch.</p>' },
  refund: { title: 'Refund & cancellation — pending approval', body: '<p>No customer orders or payments are accepted in this preview. There are no preview purchases to cancel or refund.</p><p>The actual business must approve and publish eligibility, time limits, cancellation steps, damaged or incorrect-item reporting, refund timing and a verified support contact before ordering opens. This page is not a completed refund policy.</p>' },
  storage: { title: 'Storage & handling — information pending', body: '<p>Verified chilled/frozen condition, storage temperature, shelf life, use-by dates, thawing and cooking instructions are not available in the current catalogue metadata.</p><p>Product-specific, approved pack instructions must be provided before launch. Do not infer handling or safety requirements from a product name, placeholder or staging description.</p>' },
  track: { title: 'Track Order', body: '<p>Order tracking is not active in this pre-launch preview. No customer orders are accepted, and a preview cart does not create an order or tracking reference.</p><p>Verified tracking and customer-support arrangements will need to be published before launch. Please do not enter personal details or an order number here.</p>' }
};
info.about = info.story;
info.contact = info.support;
function viewURL(view) {
  const url = new URL(location.href);
  if (url.searchParams.get('view') !== view) { url.searchParams.set('view',view); url.hash = ''; history.pushState(null, '', url); }
}
function openInfo(topic, updateURL = true) { if (!Object.hasOwn(info,topic)) return; const content = info[topic]; if (updateURL) viewURL(topic); document.title = `${content.title} — JabWeMeat`; $('#dialog-content').innerHTML = `${header(escapeHTML(content.title))}<div class="dialog-inner info-body">${content.body}</div>`; openDialog('info'); }

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  if (button.matches('a') && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
  if (button.matches('a')) event.preventDefault();
  const { action, id, pack, category, topic } = button.dataset;
  if (action === 'category') selectCategory(category);
  if (action === 'reset') { state.sort = 'featured'; $('#sort').value = 'featured'; selectCategory('all'); }
  if (action === 'increase') changeBag(id, Number(pack), 1);
  if (action === 'decrease') changeBag(id, Number(pack), -1);
  if (action === 'remove') { changeBag(id, Number(pack), -qty(id, Number(pack))); toast('Item removed from your preview bag.'); }
  if (action === 'product') openProduct(id);
  if (action === 'pack') { state.pack = Number(pack); renderProductDetails(); restoreFocus(`pack-${pack}`); }
  if (action === 'cart') { if (button.matches('a')) viewURL('cart'); openCart(); }
  if (action === 'checkout') openCheckout();
  if (action === 'location') openLocation();
  if (action === 'hero-location') { $('#hero-delivery').scrollIntoView({behavior:'smooth',block:'center'}); $('#hero-pincode').focus({preventScroll:true}); }
  if (action === 'close') closeDialog();
  if (action === 'browse') { closeDialog(); $('#catalogue').scrollIntoView({ behavior: 'smooth' }); }
  if (action === 'story') openInfo('story');
  if (action === 'account') { closeDialog(); window.dispatchEvent(new Event('jwm:account')); }
  if (action === 'info') openInfo(topic);
});
function checkPincode(input, result) {
  const pincode = input.value.trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    result.textContent = 'Enter a valid 6-digit Indian pincode (first digit 1–9).';
    result.classList.add('error'); input.setAttribute('aria-invalid','true'); input.focus(); return false;
  }
  input.removeAttribute('aria-invalid'); result.classList.remove('error'); state.pincode = pincode;
  const configured = catalogue.live && catalogue.pins.includes(pincode);
  $('#location-label').textContent = `${pincode} · ${catalogue.live ? configured ? 'Staging area' : 'Outside staging area' : 'Check unavailable'}`;
  result.textContent = catalogue.loading ? 'Delivery settings are still loading. Please check again shortly. No coverage is confirmed.' : !catalogue.live ? 'Delivery settings are unavailable. We cannot confirm coverage. Please try again later.' : configured ? `${pincode} is configured in staging. Ordering is not open. Delivery times and charges are not confirmed.` : `${pincode} is not in the configured staging coverage. Ordering is not open. Delivery times and charges are not confirmed.`;
  $('#hero-pincode').value = pincode;
  if (result.id !== 'hero-pin-result') $('#hero-pin-result').textContent = result.textContent;
  return true;
}
document.addEventListener('submit', event => {
  if (!['pincode-form','hero-pincode-form'].includes(event.target.id)) return;
  event.preventDefault();
  const inline = event.target.id === 'hero-pincode-form';
  checkPincode($(inline ? '#hero-pincode' : '#pincode'), $(inline ? '#hero-pin-result' : '#pin-error'));
});
$('#search').addEventListener('input', event => {
  state.query = event.target.value.slice(0, 150);
  state.category = 'all';
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { syncListingURL(); renderCategories(); renderProducts(); }, 140);
});
$('#search').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('#catalogue').scrollIntoView({ behavior: 'smooth' }); } });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; syncListingURL(); renderProducts(); });
$('#category-tiles').innerHTML = shopCategories.filter(category => category.id !== 'all').map(category => `<a class="category-tile" href="${categoryHref(category.id)}" data-action="category" data-category="${category.id}"><span class="category-tile-image" aria-hidden="true"><span class="category-monogram">${category.mark}</span></span><h3>${escapeHTML(category.label)}</h3><p>${escapeHTML(category.note)}</p></a>`).join('');
$('#year').textContent = String(new Date().getFullYear());
hydrateIcons(); renderCategories(); renderProducts(); renderBagCount();

function syncListingURL() {
  const url = new URL(location.href);
  url.searchParams.delete('view');
  url.searchParams.set('category',state.category);
  if (state.query) url.searchParams.set('q',state.query); else url.searchParams.delete('q');
  if (state.sort !== 'featured') url.searchParams.set('sort',state.sort); else url.searchParams.delete('sort');
  history.replaceState(null, '', url);
}
function readRoute() {
  closeDialog(true);
  const params = new URLSearchParams(location.search);
  const requested = ({'fish-seafood':'seafood','ready-to-cook':'ready'}[params.get('category')] || params.get('category'));
  state.category = shopCategories.some(category => category.id === requested) ? requested : 'all';
  state.query = (params.get('q') || '').slice(0,150);
  state.sort = ['price-asc','price-desc','name'].includes(params.get('sort')) ? params.get('sort') : 'featured';
  $('#search').value = state.query; $('#sort').value = state.sort;
  renderCategories(); renderProducts();
  document.title = `${state.category === 'all' ? 'Shop' : categoryLabel(state.category)} — JabWeMeat`;
  const view = params.get('view');
  if (view === 'cart') openCart(); else if (Object.hasOwn(info,view)) openInfo(view,false);
  else if (params.has('category')) requestAnimationFrame(() => $('#catalogue').scrollIntoView({block:'start',behavior:'instant'}));
}
window.addEventListener('popstate',readRoute);
readRoute();


// Existing Supabase integration; reads and subscriptions only, never public writes.
connectCatalogue(() => {
  if (catalogue.live) {
    state.bag = state.bag.filter(line => productById(line.id)?.packs[line.pack]).map(line => ({...line, quantity:Math.min(10,line.quantity,productById(line.id).stock ?? 0)})).filter(line => line.quantity > 0);
    saveBag();
  }
  $('#catalogue-status').textContent = catalogue.live ? 'Live staging catalogue · product photos pending approval.' : 'Catalogue unavailable · ordering closed.';
  $('#catalogue-badge').textContent = catalogue.live ? 'Live staging catalogue' : 'Catalogue unavailable';
  renderCategories(); renderProducts(); renderBagCount();
  if (state.pincode && $('#hero-pincode').value === state.pincode) checkPincode($('#hero-pincode'),$('#hero-pin-result'));
  if (state.modal === 'cart') renderCart();
  if (state.modal === 'product') { if(productById(state.product)) renderProductDetails(); else closeDialog(); }

});
