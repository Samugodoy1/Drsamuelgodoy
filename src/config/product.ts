export const PRODUCTS = {
  ODONTOHUB: 'odontohub',
  ACADEMY: 'academy'
} as const;

export type ProductCode = typeof PRODUCTS[keyof typeof PRODUCTS];

export const CURRENT_PRODUCT = 'academy' as const;
export type CurrentProduct = typeof CURRENT_PRODUCT;

export const PRODUCT_LABEL = 'OdontoHub Academy';
