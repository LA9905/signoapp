// src/services/productService.ts
import { api } from "./http";

export type Product = { id: number; name: string; category: string; created_by: number };

export const getProducts = () => api.get<Product[]>("/products");

export const createProduct = (data: { name: string; category: string }) =>
  api.post<Product>("/products", data);

export const updateProduct = (id: number, data: { name: string; category: string }) =>
  api.put<Product>(`/products/${id}`, data);

export const deleteProduct = (id: number) => api.delete<{ message: string }>(`/products/${id}`);
