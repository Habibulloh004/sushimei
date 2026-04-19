import { getCategories, getAllProducts, getSpots } from '@/lib/api-server';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { PromoBanner } from '@/components/home/PromoBanner';
import { LocationsGrid } from '@/components/home/LocationsGrid';

export const revalidate = 300;

export default async function HomePage() {
  const [categories, products, spots] = await Promise.all([
    getCategories(),
    getAllProducts(),
    getSpots(),
  ]);

  return (
    <div className="space-y-16 md:space-y-32">
      <HeroSection />
      <CategoryScroll categories={categories} />
      <FeaturedProducts products={products} />
      <PromoBanner />
      <LocationsGrid spots={spots} />
    </div>
  );
}
