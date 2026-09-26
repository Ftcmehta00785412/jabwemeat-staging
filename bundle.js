(async function(){
  const url = "https://cdn.jsdelivr.net/gh/Ftcmehta00785412/jabwemeat-staging@3e89507a6d072c3053e4f3f2f4f25b2cb8cca1d9/bundle.js";
  let code = await (await fetch(url)).text();
  const curryCut = "https://static.wixstatic.com/media/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg/v1/fill/w_900,h_675,al_c,q_90,usm_0.66_1.00_0.01/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg";
  const muttonImg = "https://images.weserv.nl/?url=litter.catbox.moe/7s746z.webp&w=900&h=675&fit=cover&output=webp&q=85";
  const patches = [
    ["Live staging storefront \u00b7 COD only", "Fresh delivery \u00b7 COD \u00b7 Ranchi"],
    ["Order tracking is not available in this storefront yet.", "Contact hello@jabwemeat.com for order help."],
    ["Customer care coming soon", "hello@jabwemeat.com"],
    ["Pay with confidence.", "Cash on delivery."],
    ["Choose the payment method that works best for you.", "Pay in cash when your order is delivered. Online payments are not required."],
    ["Premium Mutton Chops", "Premium Mutton Curry Cut"],
    ["Meaty bone-in chops selected for grills and rich home-style curries.", "Fresh mutton curry-cut pieces, cleaned and ready for rich home-style curries."],
    ["assets/chicken-curry.webp", curryCut],
    ["https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&h=675&q=85", curryCut],
    ["assets/mutton.webp", muttonImg],
    ["https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&h=675&q=85", muttonImg],
    ["https://litter.catbox.moe/7s746z.webp", muttonImg],
    ["assets/chicken-breast-boneless-finance.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/chicken-breast-boneless.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/chicken-breast.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/rohu.webp", "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/prawns.webp", "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/eggs.webp", "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/tikka.webp", "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/family-combo.webp", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85"]
  ];
  for (const [a,b] of patches) code = code.split(a).join(b);
  const blob = new Blob([code], {type: "text/javascript"});
  const s = document.createElement("script");
  s.type = "module";
  s.src = URL.createObjectURL(blob);
  document.body.appendChild(s);
  const rename = () => {
    document.querySelectorAll("h3, p, span, b").forEach(el => {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        const t = el.textContent || "";
        if (t.includes("Premium Mutton Chops")) el.textContent = t.replace(/Premium Mutton Chops/g, "Premium Mutton Curry Cut");
      }
    });
  };
  setTimeout(rename, 800);
  setTimeout(rename, 2000);
  setInterval(rename, 4000);
})();
