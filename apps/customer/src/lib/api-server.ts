import type { Category, Product, Spot, ModifierGroup } from '@sushimei/shared';

export const PUBLIC_DATA_TAGS = {
  categories: 'public-categories',
  products: 'public-products',
  spots: 'public-spots',
  modifiers: 'public-modifiers',
} as const;

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:9191/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

async function serverFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  tags?: string[],
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 300, tags },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as T;
}

export async function getCategories(): Promise<Category[]> {
  return serverFetch<Category[]>('/public/categories', undefined, [PUBLIC_DATA_TAGS.categories]);
}

export async function getAllProducts(): Promise<Product[]> {
  const allProducts: Product[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL(`${API_BASE_URL}/public/products`);
    url.searchParams.append('page', String(page));
    url.searchParams.append('limit', '100');

    const res = await fetch(url.toString(), {
      next: { revalidate: 300, tags: [PUBLIC_DATA_TAGS.products] },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json.data) {
      allProducts.push(...json.data);
    }

    const nextTotalPages = json.meta?.total_pages || json.meta?.total_page || 1;
    totalPages = Math.max(1, nextTotalPages);

    if (!json.data || json.data.length === 0) {
      break;
    }

    page += 1;
  }

  return allProducts;
}

export async function getSpots(): Promise<Spot[]> {
  return serverFetch<Spot[]>('/public/spots', undefined, [PUBLIC_DATA_TAGS.spots]);
}

export async function getModifiers(): Promise<ModifierGroup[]> {
  return serverFetch<ModifierGroup[]>('/public/modifiers', undefined, [PUBLIC_DATA_TAGS.modifiers]);
}

export async function getDietaryOptions(): Promise<string[]> {
  return serverFetch<string[]>('/public/dietary-options');
}
