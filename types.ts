export interface ProductVariant {
  weight: string;
  price: number;
  mrp: number;
  stock: number;
}
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
  variants?: ProductVariant[];
  attributes?: string[];
  cutTypes?: string[];
  recommendation?: string;
}
/** Cart line includes the selected weight/price at add time. Matched by id + weight. */
export interface CartItem extends Product {
  quantity: number;
}
export type AppView = 'store' | 'admin';
export type Language = 'en' | 'hi' | 'bn';
