export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  typeId: 'buy' | 'sell';
  location: string;
  authorId: string;
  authorName: string;
  images: string[];
  upVotes: string[];
  downVotes: string[];
  createdAt: string;
  status?: 'active' | 'sold' | 'archived';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'business' | 'admin' | 'guardian' | 'mega_guardian';
  bio?: string;
  location?: string;
  plan_id?: string;
  createdAt: string;
  is_banned?: boolean;
}
