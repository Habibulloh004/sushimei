"use client";

import { ReactNode, useState } from 'react';
import { Product, Category, Spot, ModifierGroup } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CartSheet } from '@/components/cart/CartSheet';
import { SearchDialog } from '@/components/search/SearchDialog';
import { ProductDetailDialog } from '@/components/product/ProductDetailDialog';
import { ProductDialogProvider } from '@/lib/product-dialog-context';

interface MainLayoutClientProps {
  children: ReactNode;
  products: Product[];
  categories: Category[];
  spots: Spot[];
  modifiers: ModifierGroup[];
}

export function MainLayoutClient({ children, products, categories, spots, modifiers }: MainLayoutClientProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <ProductDialogProvider
      selectedProduct={selectedProduct}
      openProduct={(product) => setSelectedProduct(product)}
      closeProduct={() => setSelectedProduct(null)}
    >
      <div className="min-h-screen pb-24 md:pb-0">
        <Header onSearchOpen={() => setIsSearchOpen(true)} />
        <main>{children}</main>
        <BottomNav />
        <CartSheet spots={spots} modifiers={modifiers} />
        <SearchDialog
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          products={products}
          categories={categories}
          onProductSelect={(product) => {
            setIsSearchOpen(false);
            setSelectedProduct(product);
          }}
        />
        <ProductDetailDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
          modifiers={modifiers}
        />
      </div>
    </ProductDialogProvider>
  );
}
