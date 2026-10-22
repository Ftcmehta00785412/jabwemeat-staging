import themeCategories from './category-theme.json';
import { supabase } from '../supabase';

export const categories = themeCategories.map(category => ({ ...category }));
export const products = [];
export const catalogue = { live: false, loading: true, pins: [], slots: [] };
const categoryId = slug => ({ 'fish-seafood':'seafood', 'ready-to-cook':'ready' }[slug] || slug);
const safeId = value => /^[a-zA-Z0-9-]{1,100}$/.test(String(value)) ? String(value) : null;
export const formatMoney = paise => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(paise / 100);
export const productById = id => products.find(product => product.id === id);
export function calculateBag(bag) {
  const lines=bag.map(line=>({...line,product:productById(line.id)})).filter(line=>line.product && Number.isInteger(line.pack) && line.product.packs[line.pack] && Number.isInteger(line.quantity) && line.quantity>0 && line.quantity<=Math.min(10,line.product.stock));
  return {lines,count:lines.reduce((sum,line)=>sum+line.quantity,0),subtotal:lines.reduce((sum,line)=>sum+line.product.packs[line.pack].price*line.quantity,0)};
}

export function connectCatalogue(onChange) {
  let request=0, timer;
  const load=async()=>{
    const version=++request;
    try {
      const signal=AbortSignal.timeout(15000);
      const [p,c,s,settings]=await Promise.all([
        supabase.from('products').select('*,categories(name,slug)').eq('active',true).order('created_at').abortSignal(signal),
        supabase.from('categories').select('name,slug').eq('active',true).order('sort_order').abortSignal(signal),
        supabase.from('delivery_slots').select('id,label').eq('active',true).order('sort_order').abortSignal(signal),
        supabase.from('store_settings').select('key,value').abortSignal(signal)
      ]);
      if(version!==request)return;
      if([p,c,s,settings].some(result=>result.error))throw Error('Staging catalogue read failed');
      const activeCategories=(c.data||[]).map(row=>{
        const id=safeId(categoryId(row.slug));
        if(!id)return null;
        const theme=themeCategories.find(item=>item.id===id);
        return {...theme,id,label:String(row.name),short:theme?.short || String(row.name),note:theme?.note || ''};
      }).filter(Boolean);
      categories.splice(0,categories.length,themeCategories[0],...activeCategories);
      const liveProducts=(p.data||[]).map(row=>{
        const id=safeId(row.id), category=categoryId(row.categories?.slug || 'chicken');
        const theme=themeCategories.find(item=>item.id===category);
        if(!id || !categories.some(item=>item.id===category) || !Number.isFinite(Number(row.price)))return null;
        return {
          id, category, name:String(row.name), description:String(row.description || 'Product description pending approval.'),
          image:/prawn|shrimp/i.test(row.name) ? 3 : (theme?.image ?? 0),
          tag:Number(row.stock)>0 ? (row.featured ? 'A HOUSE FAVOURITE' : 'ON THE MENU') : 'CURRENTLY SOLD OUT',
          detail:String(row.servings ? `Serves ${row.servings}` : 'Staging catalogue selection'),
          stock:Math.max(0,Math.floor(Number(row.stock)||0)),
          packs:[{label:String(row.weight || 'Configured pack'),price:Math.round(Number(row.price)*100)}],
          idea:'Plan your favourite recipe around the listed cut. The imagery is a serving or category illustration.',
          allergens:'Complete verified ingredients, allergen and cross-contact information must be provided before ordering opens.'
        };
      }).filter(Boolean);
      products.splice(0,products.length,...liveProducts);
      const pins=(settings.data||[]).find(row=>row.key==='serviceable_pins')?.value;
      catalogue.pins=Array.isArray(pins) ? pins.map(String).filter(pin=>/^[1-9]\d{5}$/.test(pin)) : [];
      catalogue.slots=s.data||[];
      catalogue.live=true;
    } catch(error) {
      if(version!==request)return;
      catalogue.live=false;
    } finally {
      if(version===request){catalogue.loading=false;onChange();}
    }
  };
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(load,200);};
  let channel=supabase.channel('jwm-original-theme-catalogue');
  for(const table of ['products','categories','delivery_slots','store_settings']) channel=channel.on('postgres_changes',{event:'*',schema:'public',table},schedule);
  channel.subscribe();
  load();
  window.addEventListener('pagehide',()=>{clearTimeout(timer);supabase.removeChannel(channel);},{once:true});
}
