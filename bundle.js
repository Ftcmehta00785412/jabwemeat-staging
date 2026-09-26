(async function(){
  const url = "https://cdn.jsdelivr.net/gh/Ftcmehta00785412/jabwemeat-staging@3e89507a6d072c3053e4f3f2f4f25b2cb8cca1d9/bundle.js";
  let code = await (await fetch(url)).text();
  const patches = [
    ["Live staging storefront \u00b7 COD only", "Fresh delivery \u00b7 COD \u00b7 Ranchi"],
    ["Order tracking is not available in this storefront yet.", "Contact hello@jabwemeat.com for order help."],
    ["Customer care coming soon", "hello@jabwemeat.com"],
    ["Pay with confidence.", "Cash on delivery."],
    ["Choose the payment method that works best for you.", "Pay in cash when your order is delivered. Online payments are not required."],
    ["assets/chicken-curry.webp", "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/chicken-breast-boneless-finance.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/chicken-breast-boneless.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/chicken-breast.webp", "https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85"],
    ["assets/mutton.webp", "https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&h=675&q=85"],
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
})();
