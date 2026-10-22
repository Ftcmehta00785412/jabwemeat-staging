import { categories, products, productById, formatMoney, calculateBag, catalogue, connectCatalogue } from './catalogue.js';
import { icon, hydrateIcons } from './icons.js';

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
// Session-only by design: this preview stores no customer details and sends no orders.
const state = { category: 'all', query: '', sort: 'featured', bag: [], pincode: '', modal: null, product: null, pack: 0 };
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
  if (!product || product.stock === 0 || !catalogue.live) return `<button class="add-button" disabled>${catalogue.live ? 'Sold out' : 'Unavailable'}</button>`;
  const amount = qty(id, pack);
  return amount ? quantityControl(id, pack, amount, prefix) : `<button class="add-button" data-action="increase" data-id="${id}" data-pack="${pack}" data-focus="${prefix}-${id}-${pack}-plus" aria-label="Add ${escapeHTML(productById(id).name)} to bag">Add ${icon('plus')}</button>`;
}
function renderCategories() {
  $('#top-categories').innerHTML = categories.map(category => `<button class="nav-tab ${state.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" aria-pressed="${state.category === category.id}">${escapeHTML(category.label)}</button>`).join('');
  $('#filter-chips').innerHTML = categories.map(category => `<button class="filter-chip ${state.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" data-focus="filter-${category.id}" aria-pressed="${state.category === category.id}">${escapeHTML(category.short)}</button>`).join('');
}
function renderProducts() {
  if (!catalogue.live && !products.length) { $('#results-line').textContent = catalogue.loading ? 'Loading the product catalogue…' : 'Catalogue temporarily unavailable'; $('#product-grid').innerHTML = `<div class="empty-results"><h3>${catalogue.loading ? 'Something delicious is loading.' : 'The menu is taking a moment.'}</h3><p>${catalogue.loading ? 'Loading the product catalogue.' : 'Please try again shortly. No sample prices are being substituted.'}</p></div>`; return; }
  const normalizedQuery = state.query.trim().toLocaleLowerCase('en-IN');
  let filtered = products.filter(product => (state.category === 'all' || product.category === state.category) && `${product.name} ${product.detail} ${product.category}`.toLocaleLowerCase('en-IN').includes(normalizedQuery));
  if (state.sort === 'price-asc') filtered.sort((a,b) => a.packs[0].price - b.packs[0].price);
  if (state.sort === 'price-desc') filtered.sort((a,b) => b.packs[0].price - a.packs[0].price);
  if (state.sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
  $('#results-line').textContent = `${filtered.length} ${filtered.length === 1 ? 'product' : 'products'}${state.query ? ` for “${state.query}”` : ''} · Prices for the configured pack · ordering closed`;
  $('#product-grid').innerHTML = filtered.length ? filtered.map(product => `<article class="card product-card" data-product="${product.id}"><button class="product-image-button" data-action="product" data-id="${product.id}" aria-label="View ${escapeHTML(product.name)} details"><img src="/assets/original-theme/category-${product.image}.webp" width="512" height="512" loading="lazy" alt="Illustrative ${escapeHTML(product.name.toLowerCase())}"><span class="product-image-label">${escapeHTML(product.tag)}</span></button><div class="product-content"><button class="product-name" data-action="product" data-id="${product.id}">${escapeHTML(product.name)}</button><p class="product-detail">${escapeHTML(product.detail)}</p><div class="pack-preview"><span>${escapeHTML(product.packs[0].label)}</span><button class="pack-options-link" data-action="product" data-id="${product.id}">Choose pack ↗</button></div><div class="product-bottom"><span class="price">${formatMoney(product.packs[0].price)}<small>Price</small></span>${addControl(product.id, 0)}</div></div></article>`).join('') : `<div class="empty-results">${icon('search')}<h3>No matches on this menu.</h3><p>Try “chicken”, “fish” or another category.</p><button class="btn btn-primary" data-action="reset">Show all products</button></div>`;
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
  if (!product || !Number.isInteger(pack) || !product.packs[pack]) return;
  const oldQuantity = qty(id, pack);
  const quantity = Math.max(0, Math.min(10, product.stock ?? 10, oldQuantity + delta));
  if (quantity === oldQuantity) { toast('The configured stock limit or 10-pack limit has been reached.'); return; }
  const focus = document.activeElement?.dataset?.focus;
  const existing = state.bag.find(line => line.id === id && line.pack === pack);
  if (existing) existing.quantity = quantity;
  else if (quantity) state.bag.push({ id, pack, quantity });
  state.bag = state.bag.filter(line => line.quantity > 0);
  renderProducts();
  renderBagCount();
  if (state.modal === 'cart') renderCart();
  if (state.modal === 'product') renderProductDetails();
  restoreFocus(focus);
  if (!oldQuantity && quantity) toast(`${product.name} added to your shopping bag.`);
}
function selectCategory(id, clearQuery = true) {
  if (!categories.some(category => category.id === id)) return;
  state.category = id;
  if (clearQuery) { state.query = ''; $('#search').value = ''; }
  const focus = document.activeElement?.dataset?.focus;
  renderCategories(); renderProducts(); restoreFocus(focus);
  closeDialog();
  $('#catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function header(title, extra = '') { return `<div class="dialog-header"><h2 id="dialog-title">${title}</h2>${extra}<button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>`; }
function openDialog(type) {
  previousFocus = document.activeElement;
  state.modal = type;
  dialog.classList.toggle('drawer', type === 'cart' || type === 'checkout');
  document.body.classList.add('modal-open');
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  requestAnimationFrame(() => dialog.querySelector('button, input, select, [tabindex="0"]')?.focus({ preventScroll: true }));
}
function closeDialog() {
  if (!dialog.open) return;
  dialog.close();
}
dialog.addEventListener('close', () => { state.modal = null; document.body.classList.remove('modal-open'); previousFocus?.focus({ preventScroll: true }); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(); } });

function renderProductDetails() {
  const product = productById(state.product);
  const pack = product.packs[state.pack];
  $('#dialog-content').innerHTML = `${header('A closer look', '<span class="badge">Product details</span>')}<div class="detail-layout"><div class="detail-photo"><img src="/assets/original-theme/category-${product.image}.webp" width="512" height="512" alt="Illustrative ${escapeHTML(product.name)}"><span>Illustrative image · not a final product photograph</span></div><div class="detail-copy"><span class="detail-category">${escapeHTML(categories.find(category => category.id === product.category).label.toUpperCase())}</span><h3>${escapeHTML(product.name)}</h3><p class="detail-caption">${escapeHTML(product.detail)}</p><p>${escapeHTML(product.description)}</p><div class="pack-title">Choose your configured pack</div><div class="pack-selector" role="group" aria-label="Pack size">${product.packs.map((option,index) => `<button class="${state.pack === index ? 'selected' : ''}" data-action="pack" data-pack="${index}" data-focus="pack-${index}" aria-pressed="${state.pack === index}"><span>${escapeHTML(option.label)}</span><strong>${formatMoney(option.price)}</strong></button>`).join('')}</div><div class="detail-add"><span class="price">${formatMoney(pack.price)}<small>Price · ${escapeHTML(pack.label)}</small></span>${addControl(product.id, state.pack, 'detail')}</div><div class="notice">${icon('info')}<span>Check product details before choosing. Imagery is illustrative. No orders can be placed.</span></div><div class="detail-facts"><h4>Kitchen inspiration</h4><p>${escapeHTML(product.idea)}</p><h4>Ingredients &amp; allergens</h4><p>${escapeHTML(product.allergens)}</p><h4>Handling &amp; storage</h4><p>Raw products require appropriate refrigeration and thorough cooking. Follow the verified pack label at launch; this preview is not a product safety specification.</p></div></div></div>`;
}
function openProduct(id) { if (!productById(id)) return; state.product = id; state.pack = 0; renderProductDetails(); openDialog('product'); }
function summaryHTML(bag) { return `<div class="bag-summary"><div class="summary-row"><span>Items subtotal</span><strong>${formatMoney(bag.subtotal)}</strong></div><div class="summary-row"><span>Delivery charges</span><span>Not available</span></div><div class="summary-row"><span>Taxes / other fees</span><span>Not configured</span></div><div class="summary-row total"><span>Items subtotal</span><span>${formatMoney(bag.subtotal)}</span></div></div>`; }
function renderCart() {
  const bag = calculateBag(state.bag);
  $('#dialog-content').innerHTML = header('Your shopping bag', `<span class="badge">${bag.count} ${bag.count === 1 ? 'item' : 'items'}</span>`) + (bag.count ? `<div class="bag-lines">${bag.lines.map(line => `<div class="bag-line"><img src="/assets/original-theme/category-${line.product.image}.webp" width="75" height="83" alt="Illustrative ${escapeHTML(line.product.name)}"><div><div class="bag-line-name"><span>${escapeHTML(line.product.name)}</span><button class="remove-button" data-action="remove" data-id="${line.id}" data-pack="${line.pack}" aria-label="Remove ${escapeHTML(line.product.name)}, ${escapeHTML(line.product.packs[line.pack].label)}">${icon('trash')}</button></div><p class="bag-line-meta">${escapeHTML(line.product.packs[line.pack].label)} · ${formatMoney(line.product.packs[line.pack].price)} per pack</p><div class="bag-line-bottom">${quantityControl(line.id, line.pack, line.quantity, 'bag')}<strong>${formatMoney(line.product.packs[line.pack].price * line.quantity)}</strong></div></div></div>`).join('')}</div>${summaryHTML(bag)}<div class="bag-bottom"><div class="notice">${icon('info')}<span>This is a shopping bag, not an order. Delivery and taxes are not included in this subtotal.</span></div><button class="btn btn-primary" data-action="checkout">Review checkout ${icon('arrow')}</button><button class="btn btn-outline" data-action="close">Keep exploring</button><p>Your shopping bag is held in this tab only and resets on reload. No account or customer details are saved.</p></div>` : `<div class="bag-empty">${icon('bag')}<h3>A delicious beginning awaits.</h3><p>Your bag is empty. Explore the staging menu<br>and find something you love.</p><button class="btn btn-primary" data-action="browse">Explore the menu ${icon('arrow')}</button></div>`);
}
function openCart() { renderCart(); openDialog('cart'); }
function openCheckout() {
  const bag = calculateBag(state.bag);
  if (!bag.count) return openCart();
  try {
    sessionStorage.setItem('jwm-checkout-bag', JSON.stringify(bag.lines.map(({id,pack,quantity})=>({id,pack,quantity}))));
    window.location.assign('/checkout/');
  } catch {
    toast('Your browser blocked the shopping bag handoff. Allow tab storage and try again.');
  }
}
let locationReturn = null;
function openLocation() {
  locationReturn = state.modal === 'checkout' ? 'checkout' : null;
  $('#dialog-content').innerHTML = `${header('Your neighbourhood')}<div class="dialog-inner info-body"><p>Good food starts close to home. Try the delivery-location selector below.</p><div class="notice warning">${icon('info')}<span><strong>Location check:</strong> ${catalogue.live ? 'This checks the PIN codes configured in the database. Public ordering is still closed.' : 'Live delivery settings are unavailable. A valid PIN code is not a serviceability confirmation.'}</span></div><form id="pincode-form" novalidate><label class="pin-label" for="pincode">Indian pincode</label><div class="pin-row"><input class="input input-field" id="pincode" name="pincode" value="${escapeHTML(state.pincode)}" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" autocomplete="off" placeholder="Enter 6-digit pincode" aria-describedby="pin-error"><button class="btn btn-primary" type="submit">Check pincode</button></div><p class="field-error" id="pin-error" role="alert"></p></form><p>Only the pincode is held in this tab while you explore. It is not sent to a delivery service or stored after reload.</p></div>`;
  openDialog('location');
  requestAnimationFrame(() => $('#pincode')?.focus({ preventScroll: true }));
}
const info = {
  story: { title: 'A match made in your kitchen.', body: '<p>JabWeMeat is a new, independent meat-and-seafood store concept, built for people who believe the best meals come with good company.</p><p>Our starting point is simple: a thoughtfully organised menu, clear product information and a shopping experience that feels as good as the meal you are planning.</p><h3>From everyday cravings to Sunday feasts</h3><p>Explore chicken, mutton, fish, prawns, marinated options and eggs, all in one place.</p><div class="notice">Original JabWeMeat branding and design, made for the moments around your table.</div>' },
  support: { title: 'Contact JabWeMeat', body: '<p>JabWeMeat<sup class="brand-tm" aria-label="trademark">™</sup> is operated by <strong>URBAN CRAVE VENTURES LLP</strong>, a limited liability partnership.</p><p><strong>GSTIN:</strong> 20AAJFU1454F1ZJ</p><p><strong>Principal place of business:</strong><br>Ground Floor, Shyama Complex,<br>Singh More Hatia, Kalyanpur Road No. 04,<br>Ranchi, Jharkhand – 834003, India.</p><p><strong>Contact person:</strong> Himanshu Ranjan</p><p><strong>Current email for enquiries:</strong> <a href="mailto:support@jabwemeat.com">support@jabwemeat.com</a>. Please address your message to Himanshu Ranjan.</p><p><a href="/contact/">View contact details</a> · <a href="/privacy-policy/#contact">Privacy enquiries</a></p>' },
  terms: { title: 'Terms & policies', body: '<p>This is a non-transactional design preview, not an offer to sell. Prices, product names, pack sizes, ingredients and images are not verified product specifications.</p><p>For questions about delivery, cancellations, refunds or other terms, contact our team. Read our published Privacy Policy for information about personal data.</p><div class="notice warning">Customer ordering is currently unavailable. Payment testing does not create a delivery order.</div>' },
  images: { title: 'A note on the imagery', body: '<p>The food images on this website are original, generated illustrations created for the JabWeMeat design concept. They are not photographs of real inventory or supplier products.</p><p>Category illustrations are reused for some sample product variants. Garnishes and cooked serving suggestions do not indicate the contents of a product pack.</p><p>Please refer to product-specific information for pack contents.</p>' }
};
function openInfo(topic) { const content = info[topic]; if (!content) return; $('#dialog-content').innerHTML = `${header(content.title)}<div class="dialog-inner info-body">${brandInfoHTML(content.body)}</div>`; openDialog('info'); }

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const { action, id, pack, category, topic } = button.dataset;
  if (action === 'category') selectCategory(category);
  if (action === 'reset') { state.sort = 'featured'; $('#sort').value = 'featured'; selectCategory('all'); }
  if (action === 'increase') changeBag(id, Number(pack), 1);
  if (action === 'decrease') changeBag(id, Number(pack), -1);
  if (action === 'remove') { changeBag(id, Number(pack), -qty(id, Number(pack))); toast('Item removed from your shopping bag.'); }
  if (action === 'product') openProduct(id);
  if (action === 'pack') { state.pack = Number(pack); renderProductDetails(); restoreFocus(`pack-${pack}`); }
  if (action === 'cart') openCart();
  if (action === 'checkout') openCheckout();
  if (action === 'location') openLocation();
  if (action === 'close') closeDialog();
  if (action === 'browse') { closeDialog(); $('#catalogue').scrollIntoView({ behavior: 'smooth' }); }
  if (action === 'story') openInfo('story');
  if (action === 'account') { closeDialog(); window.dispatchEvent(new Event('jwm:account')); }
  if (action === 'info') openInfo(topic);
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'pincode-form') return;
  event.preventDefault();
  const pincode = $('#pincode').value.trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) { $('#pin-error').textContent = 'Enter a valid 6-digit Indian pincode (first digit 1–9).'; $('#pincode').setAttribute('aria-invalid', 'true'); $('#pincode').focus(); return; }
  state.pincode = pincode;
  const configured = catalogue.live && catalogue.pins.includes(pincode);
  $('#location-label').textContent = `${pincode} · ${configured ? 'Configured area' : 'Not available'}`;
  const returnTo = locationReturn;
  closeDialog();
  if (returnTo === 'checkout') requestAnimationFrame(openCheckout);
  toast(catalogue.live ? (configured ? 'This PIN is configured in the catalogue. Ordering is not open yet.' : 'This PIN is outside the configured areas.') : 'Delivery settings unavailable. No serviceability confirmation.');
});
$('#search').addEventListener('input', event => {
  state.query = event.target.value.slice(0, 150);
  state.category = 'all';
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { renderCategories(); renderProducts(); }, 140);
});
$('#search').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('#catalogue').scrollIntoView({ behavior: 'smooth' }); } });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; renderProducts(); });
$('#category-tiles').innerHTML = categories.filter(category => category.image !== undefined).map(category => `<button class="category-tile" data-action="category" data-category="${category.id}"><span class="category-tile-image"><img src="/assets/original-theme/category-${category.image}.webp" width="155" height="155" loading="lazy" alt="Illustrative ${category.label.toLowerCase()}"></span><h3>${escapeHTML(category.label)}</h3><p>${escapeHTML(category.note)}</p></button>`).join('');
$('#year').textContent = String(new Date().getFullYear());
hydrateIcons(); renderCategories(); renderProducts(); renderBagCount();


// Existing Supabase integration; reads and subscriptions only, never public writes.
connectCatalogue(() => {
  state.bag = state.bag.filter(line => productById(line.id)).map(line => ({...line, quantity:Math.min(line.quantity,productById(line.id).stock ?? 10)})).filter(line => line.quantity > 0);
  if (!categories.some(category => category.id === state.category)) state.category = 'all';
  $('#catalogue-status').textContent = catalogue.live ? 'Product catalogue · illustrative imagery.' : 'Catalogue unavailable · ordering closed.';
  $('#catalogue-badge').textContent = catalogue.live ? 'Product catalogue' : 'Catalogue unavailable';
  renderCategories(); renderProducts(); renderBagCount();
  if (state.modal === 'cart') renderCart();
  if (state.modal === 'product') { if(productById(state.product)) renderProductDetails(); else closeDialog(); }

});

function brandInfoHTML(html) { return html.replace(/\bJabWeMeat\b/g, 'JabWeMeat<sup class="brand-tm" aria-label="trademark">™</sup>'); }
