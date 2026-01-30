import { getApiUrl } from "@/lib/config/global-config";
import { handleResponse } from "@/lib/api/fetch-utils";

export interface Product {
  id: string;
  name: string;
  organization_id: string;
  creation_date: string;
  product_key: string;
}

export interface ProductCreate {
  name: string;
  product_key: string;
}

export interface ProductUpdate {
  name?: string;
}

// List all products
export async function listProducts(): Promise<Product[]> {
  const response = await fetch(`${getApiUrl()}/products/`);
  return handleResponse<Product[]>(response);
}

// Get a single product by key
export async function getProductByKey(productKey: string): Promise<Product> {
  const response = await fetch(`${getApiUrl()}/products/key/${productKey}`);
  return handleResponse<Product>(response);
}

// Create a new product
export async function createProduct(
  productData: ProductCreate,
): Promise<Product> {
  const response = await fetch(`${getApiUrl()}/products/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });
  return handleResponse<Product>(response);
}

// Update an existing product
export async function updateProduct(
  productId: string,
  productData: ProductUpdate,
): Promise<Product> {
  const response = await fetch(`${getApiUrl()}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });
  return handleResponse<Product>(response);
}

// Delete a product
export async function deleteProduct(productId: string): Promise<Product> {
  const response = await fetch(`${getApiUrl()}/products/${productId}`, {
    method: "DELETE",
  });
  return handleResponse<Product>(response);
}
