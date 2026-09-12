export type Category = 'Chicken' | 'Mutton' | 'Fish & Seafood' | 'Eggs' | 'Ready to Cook' | 'Combos';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Category;
  description: string;
  weight: string;
  servings: string;
  price: number;
  mrp: number;
  stock: number;
  icon: string;
  featured?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export type AppView = 'store' | 'admin';
