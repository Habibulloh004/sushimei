import { getCategories, getAllProducts, getSpots, getModifiers } from '@/lib/api-server';
import { MainLayoutClient } from './main-layout-client';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [products, categories, spots, modifiers] = await Promise.all([
    getAllProducts(),
    getCategories(),
    getSpots(),
    getModifiers(),
  ]);

  return (
    <MainLayoutClient products={products} categories={categories} spots={spots} modifiers={modifiers}>
      {children}
    </MainLayoutClient>
  );
}
