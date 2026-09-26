(async function(){
  const url = "https://cdn.jsdelivr.net/gh/Ftcmehta00785412/jabwemeat-staging@3e89507a6d072c3053e4f3f2f4f25b2cb8cca1d9/bundle.js";
  let code = await (await fetch(url)).text();
  const imgs = {
    curryCut: "https://static.wixstatic.com/media/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg/v1/fill/w_900,h_675,al_c,q_90,usm_0.66_1.00_0.01/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg",
    breast: "https://images.weserv.nl/?url=www.starquik.com/cdn/shop/files/Starfresh_Chicken_Breast_Boneless_1_Kg_Front_e2047377-7376-4980-8e4b-b6bcc56b5d4c.jpg&w=900&h=675&fit=contain&cbg=white&output=webp&q=90",
    mutton: "https://images.weserv.nl/?url=litter.catbox.moe/7s746z.webp&w=900&h=675&fit=cover&output=webp&q=85",
    rohu: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85",
    prawns: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85",
    eggs: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ1m5uC3SQNra7ZQF6YzEZplNwVC41oknw593aKAIjUQuJsL2J3iBiq0ir&s=10",
    tikka: "https://images.weserv.nl/?url=illustrake.zappfresh.com/6a904eccc05e26f328ed9738&w=900&h=675&fit=cover&output=webp&q=90",
    combo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85"
  };
  const patches = [
    ["Live staging storefront \u00b7 COD only", "Fresh delivery \u00b7 COD \u00b7 Ranchi"],
    ["Order tracking is not available in this storefront yet.", "Contact hello@jabwemeat.com for order help."],
    ["Customer care coming soon", "hello@jabwemeat.com"],
    ["Pay with confidence.", "Cash on delivery."],
    ["Choose the payment method that works best for you.", "Pay in cash when your order is delivered. Online payments are not required."],
    ["Premium Mutton Chops", "Premium Mutton Curry Cut"],
    ["Meaty bone-in chops selected for grills and rich home-style curries.", "Fresh mutton curry-cut pieces, cleaned and ready for rich home-style curries."],
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
    ["assets/eggs.webp", imgs.eggs],
    ["https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&h=675&q=85", imgs.eggs],
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
  style.textContent = ".combo-suggestion,.product-card .combo-suggestion{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;}";
  document.documentElement.appendChild(style);

  /* Most specific first: mutton must beat generic "curry cut" */
  const byTitle = [
    [/mutton/i, imgs.mutton],
    [/breast/i, imgs.breast],
    [/tikka/i, imgs.tikka],
    [/prawn/i, imgs.prawns],
    [/egg/i, imgs.eggs],
    [/rohu/i, imgs.rohu],
    [/combo/i, imgs.combo],
    [/chicken.*curry\s*cut|curry\s*cut.*chicken|^classic chicken/i, imgs.curryCut],
    [/^classic\s+chicken/i, imgs.curryCut]
  ];

  const fixUI = () => {
    document.querySelectorAll(".combo-suggestion").forEach(el => el.remove());
    document.querySelectorAll(".product-card").forEach(card => {
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
        if (t.trim() === "Chicken Breast") t = "Fresh Whole Rohu";
        if (t.includes("Fresh boneless chicken breast, pink and firm")) t = "Fresh Rohu with cleaning and cut options for your kitchen.";
        if (t !== (el.textContent || "")) el.textContent = t;
      }
    });
  };

  setTimeout(fixUI, 400);
  setTimeout(fixUI, 1000);
  setTimeout(fixUI, 2000);
  setTimeout(fixUI, 4000);
  setInterval(fixUI, 2000);
  const mo = new MutationObserver(() => fixUI());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
