export interface Perfume {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  description: string;
  imageUrl: string;
  category: 'unisex' | 'men' | 'women';
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  size: string;
  isNew?: boolean;
  isHighlighted?: boolean;
}
