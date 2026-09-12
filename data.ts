import type { Product } from './types';

export const PRODUCTS: Product[] = [
  { id:'p1', sku:'JWM-CHK-001', name:'Classic Chicken Curry Cut', category:'Chicken', description:'Fresh skinless curry pieces, cleaned and ready to cook.', weight:'500 g', servings:'3–4', price:179, mrp:209, stock:32, icon:'🍗', featured:true },
  { id:'p2', sku:'JWM-CHK-002', name:'Chicken Breast Boneless', category:'Chicken', description:'Lean, tender cuts for grills, curries and meal prep.', weight:'450 g', servings:'2–3', price:229, mrp:259, stock:18, icon:'🥩', featured:true },
  { id:'p3', sku:'JWM-MUT-001', name:'Goat Curry Cut', category:'Mutton', description:'Bone-in medium cuts selected for rich home-style curries.', weight:'500 g', servings:'3–4', price:449, mrp:499, stock:9, icon:'🍖', featured:true },
  { id:'p4', sku:'JWM-FSH-001', name:'Rohu Bengali Cut', category:'Fish & Seafood', description:'Descaled, cleaned and sliced into curry-ready steaks.', weight:'500 g', servings:'3–4', price:199, mrp:229, stock:14, icon:'🐟' },
  { id:'p5', sku:'JWM-SEA-001', name:'Freshwater Prawns', category:'Fish & Seafood', description:'Cleaned prawns for curries, fries and quick starters.', weight:'250 g', servings:'2', price:249, mrp:289, stock:6, icon:'🦐' },
  { id:'p6', sku:'JWM-EGG-001', name:'Farm Fresh Eggs', category:'Eggs', description:'Clean, carefully packed everyday protein.', weight:'Pack of 12', servings:'6', price:109, mrp:119, stock:45, icon:'🥚' },
  { id:'p7', sku:'JWM-RTC-001', name:'Tandoori Chicken Tikka', category:'Ready to Cook', description:'Marinated boneless bites—pan-fry or air-fry in minutes.', weight:'300 g', servings:'2–3', price:239, mrp:279, stock:11, icon:'🔥' },
  { id:'p8', sku:'JWM-CMB-001', name:'Family Curry Combo', category:'Combos', description:'Chicken curry cut with farm-fresh eggs for family meals.', weight:'500 g + 6 eggs', servings:'4–5', price:249, mrp:298, stock:8, icon:'🛍️' }
];

export const CATEGORIES = ['All','Chicken','Mutton','Fish & Seafood','Eggs','Ready to Cook','Combos'] as const;
export const SLOTS = ['9:00–11:00 AM','12:00–3:00 PM','4:00–6:00 PM','7:00–9:00 PM'];
export const SERVICEABLE_PINS = ['834002','834003','834004'];
