export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  weight: string;
  servings: string;
  price: number;
  mrp: number;
  stock: number;
  icon: string;
  imageUrl?: string;
  featured?: boolean;
  active?: boolean;
}

export interface CartItem extends Product { quantity: number; }
export type AppView = 'store' | 'admin';
export type Language = 'en' | 'hi' | 'bn';
