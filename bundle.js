(async function(){
  const url = "https://cdn.jsdelivr.net/gh/Ftcmehta00785412/jabwemeat-staging@3e89507a6d072c3053e4f3f2f4f25b2cb8cca1d9/bundle.js";
  let code = await (await fetch(url)).text();
  const imgs = {
    curryCut: "https://static.wixstatic.com/media/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg/v1/fill/w_900,h_675,al_c,q_90,usm_0.66_1.00_0.01/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg",
    breast: "https://images.weserv.nl/?url=www.starquik.com/cdn/shop/files/Starfresh_Chicken_Breast_Boneless_1_Kg_Front_e2047377-7376-4980-8e4b-b6bcc56b5d4c.jpg&w=900&h=675&fit=contain&cbg=white&output=webp&q=90",
    mutton: "https://images.weserv.nl/?url=litter.catbox.moe/7s746z.webp&w=900&h=675&fit=cover&output=webp&q=85",
    rohu: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85",
    prawns: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85",
    brownEggs: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ1m5uC3SQNra7ZQF6YzEZplNwVC41oknw593aKAIjUQuJsL2J3iBiq0ir&s=10",
    tikka: "https://images.weserv.nl/?url=illustrake.zappfresh.com/6a904eccc05e26f328ed9738&w=900&h=675&fit=cover&output=webp&q=90",
    combo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85",
    biryani: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBjTfNdM-oVdnnZwc7r4RJs6kAEyE3jAYACoL5s9gpHf0E2XhqWHhGH6A&s=10"
  };
  const patches = [
    ["Live staging storefront \u00b7 COD only", "Fresh delivery \u00b7 COD \u00b7 Ranchi"],
    ["Order tracking is not available in this storefront yet.", "Contact hello@jabwemeat.com for order help."],
    ["Customer care coming soon", "hello@jabwemeat.com"],
    ["Pay with confidence.", "Cash on delivery."],
    ["Choose the payment method that works best for you.", "Pay in cash when your order is delivered. Online payments are not required."],
    ["Premium Mutton Chops", "Premium Mutton Curry Cut"],
    ["Meaty bone-in chops selected for grills and rich home-style curries.", "Fresh mutton curry-cut pieces, cleaned and ready for rich home-style curries."],
    ["Farm Fresh Eggs", "Farm Fresh Brown Eggs"],
    ["assets/chicken-curry.webp", imgs.curryCut],
    ["https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&h=675&q=85", imgs.curryCut],
    ["assets/chicken-breast-boneless-finance.webp", imgs.breast],
    ["assets/chicken-breast-boneless.webp", imgs.breast],
    ["assets/chicken-breast.webp", imgs.breast],
    ["https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85", imgs.breast],
    ["https://images.weserv.nl/?url=images.pexels.com/photos/5769378/pexels-photo-5769378.jpeg&w=900&h=675&fit=cover&output=webp&q=85", imgs.breast],
    ["https://images.weserv.nl/?url=www.starquik.com/cdn/shop/files/SQ109620_01_6acafdd0-6812-49f5-9ce7-64b819989971.png&w=900&h=675&fit=cover&output=webp&q=85", imgs.breast],
    ["assets/mutton.webp", imgs.mutton],
    ["https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&h=675&q=85", imgs.mutton],
    ["https://litter.catbox.moe/7s746z.webp", imgs.mutton],
    ["assets/rohu.webp", imgs.rohu],
    ["https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85", imgs.rohu],
    ["assets/prawns.webp", imgs.prawns],
    ["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85", imgs.prawns],
    ["assets/eggs.webp", imgs.brownEggs],
    ["https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&h=675&q=85", imgs.brownEggs],
    ["assets/tikka.webp", imgs.tikka],
    ["https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&h=675&q=85", imgs.tikka],
    ["assets/family-combo.webp", imgs.combo],
    ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85", imgs.combo]
  ];
  for (const [a,b] of patches) code = code.split(a).join(b);
  const blob = new Blob([code], {type: "text/javascript"});
  const s = document.createElement("script");
  s.type = "module";
  s.src = URL.createObjectURL(blob);
  document.body.appendChild(s);

  const style = document.createElement("style");
  style.id = "jwm-hide-rec";
  style.textContent = ".combo-suggestion{display:none!important;}#jwm-biryani{display:flex!important;}";
  document.documentElement.appendChild(style);

  const byTitle = [
    [/biryani/i, imgs.biryani],
    [/mutton/i, imgs.mutton],
    [/breast/i, imgs.breast],
    [/tikka/i, imgs.tikka],
    [/prawn/i, imgs.prawns],
    [/brown\s*egg|farm\s*fresh.*egg|egg/i, imgs.brownEggs],
    [/rohu/i, imgs.rohu],
    [/combo/i, imgs.combo],
    [/chicken.*curry\s*cut|^classic chicken/i, imgs.curryCut]
  ];

  function ensureReadyToEatNav() {
    const nav = document.querySelector("nav, .nav, header nav, [class*='nav']") || document.body;
    if (document.getElementById("jwm-rte-nav")) return;
    const cook = [...document.querySelectorAll("a,button,span")].find(el => /ready\s*to\s*cook/i.test((el.textContent||"").trim()) && (el.textContent||"").trim().length < 20);
    if (!cook || !cook.parentElement) return;
    const btn = cook.cloneNode(true);
    btn.id = "jwm-rte-nav";
    if (btn.textContent) btn.textContent = "READY TO EAT";
    btn.querySelectorAll("*").forEach(c => { if (c.childNodes.length === 1 && c.childNodes[0].nodeType === 3) c.textContent = "READY TO EAT"; });
    cook.parentElement.insertBefore(btn, cook.nextSibling);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll(".product-card, article.product-card").forEach(c => {
        const cat = (c.querySelector(".product-category")?.textContent || "").trim();
        const name = (c.querySelector("h3")?.textContent || "").trim();
        const isBiryani = /biryani/i.test(name) || /ready\s*to\s*eat/i.test(cat);
        c.style.display = isBiryani ? "" : "none";
      });
      const h = document.querySelector("h1,h2");
      if (h) h.textContent = "READY TO EAT";
      ensureBiryaniCard();
    });
  }

  function ensureBiryaniCard() {
    if (document.getElementById("jwm-biryani")) return;
    const cards = [...document.querySelectorAll("article.product-card, .product-card")];
    if (!cards.length) return;
    const sample = cards[0];
    const parent = sample.parentElement;
    if (!parent) return;
    const card = document.createElement("article");
    card.className = sample.className || "product-card";
    card.id = "jwm-biryani";
    card.setAttribute("data-jwm-injected", "biryani");
    card.innerHTML =
      '<div class="product-image-wrap">' +
        '<img src="' + imgs.biryani + '" alt="Fresh Chicken Biryani" loading="lazy" width="900" height="675" style="object-fit:cover;width:100%;height:100%" />' +
        '<span class="availability-badge">In stock</span>' +
        '<span class="bestseller">Bestseller</span>' +
      '</div>' +
      '<div class="product-info">' +
        '<p class="product-category">Ready to Eat</p>' +
        '<h3>Fresh Chicken Biryani</h3>' +
        '<p class="product-description">Aromatic chicken biryani served with raita and salad. Ready to enjoy.</p>' +
        '<div class="product-attributes"><span>served with raita</span><span>salad</span><span>biryani</span></div>' +
        '<div class="variant-label">Choose weight</div>' +
        '<div class="variant-options">' +
          '<button type="button" class="selected" data-w="500 g" data-p="250">500 g</button>' +
          '<button type="button" data-w="1 kg" data-p="400">1 kg</button>' +
        '</div>' +
        '<div class="product-meta"><span id="jwm-biryani-w">500 g</span><i>•</i><span>Serves 2–3</span></div>' +
        '<div class="fresh-note">Freshly packed for your slot</div>' +
        '<div class="product-buy-row">' +
          '<div class="price"><strong id="jwm-biryani-price">₹250</strong></div>' +
          '<button type="button" class="add-button">ADD TO CART</button>' +
        '</div>' +
      '</div>';
    parent.appendChild(card);
    card.querySelectorAll(".variant-options button").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".variant-options button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        const p = btn.getAttribute("data-p");
        const w = btn.getAttribute("data-w");
        const pe = document.getElementById("jwm-biryani-price");
        const we = document.getElementById("jwm-biryani-w");
        if (pe) pe.textContent = "₹" + p;
        if (we) we.textContent = w;
      });
    });
  }

  const fixUI = () => {
    document.querySelectorAll("#jwm-white-eggs").forEach(el => el.remove());
    document.querySelectorAll(".product-card, article.product-card").forEach(card => {
      const title = (card.querySelector("h3")?.textContent || "").trim();
      if (/white\s*egg/i.test(title)) { card.remove(); return; }
    });
    document.querySelectorAll(".combo-suggestion").forEach(el => el.remove());
    document.querySelectorAll(".product-card, article.product-card").forEach(card => {
      const title = (card.querySelector("h3")?.textContent || "").trim();
      if (!title) return;
      const img = card.querySelector("img");
      if (!img) return;
      for (const [re, src] of byTitle) {
        if (re.test(title)) {
          if (img.getAttribute("src") !== src) {
            img.setAttribute("src", src);
            img.style.objectFit = /breast/i.test(title) ? "contain" : "cover";
            img.style.background = /breast/i.test(title) ? "#fff" : "";
          }
          break;
        }
      }
    });
    document.querySelectorAll("h3, p, span, b").forEach(el => {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        let t = el.textContent || "";
        if (t.includes("Premium Mutton Chops")) t = t.replace(/Premium Mutton Chops/g, "Premium Mutton Curry Cut");
        if (t.trim() === "Farm Fresh Eggs") t = "Farm Fresh Brown Eggs";
        if (t.includes("Farm Fresh Eggs") && !/Brown|White/.test(t)) t = t.replace(/Farm Fresh Eggs/g, "Farm Fresh Brown Eggs");
        if (t.trim() === "Chicken Breast") t = "Fresh Whole Rohu";
        if (t.includes("Fresh boneless chicken breast, pink and firm")) t = "Fresh Rohu with cleaning and cut options for your kitchen.";
        if (t !== (el.textContent || "")) el.textContent = t;
      }
    });
    ensureReadyToEatNav();
    ensureBiryaniCard();
  };

  setTimeout(fixUI, 500);
  setTimeout(fixUI, 1200);
  setTimeout(fixUI, 2500);
  setTimeout(fixUI, 5000);
  setInterval(fixUI, 2500);
  const mo = new MutationObserver(() => { setTimeout(fixUI, 100); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
