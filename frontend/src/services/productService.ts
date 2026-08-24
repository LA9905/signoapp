import { api } from "./http";

export type Product = {
  id: number;
  name: string;
  category: string;
  created_by: string;
  created_by_name?: string | null;
  created_at?: string | null;
  edited_by?: string | null;
  edited_by_name?: string | null;
  edited_at?: string | null;
  image_url?: string | null;
  stock: number;
  usage?: number;
};

export const getProducts = () => api.get<Product[]>("/products");

export const createProduct = (data: { name: string; category: string; imageFile?: File }) => {
  if (data.imageFile) {
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("category", data.category);
    fd.append("image", data.imageFile);
    return api.post<Product>("/products", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return api.post<Product>("/products", { name: data.name, category: data.category });
};

export const updateProduct = (
  id: number,
  data: { name: string; category: string; imageFile?: File; deleteImage?: boolean }
) => {
  if (data.imageFile || data.deleteImage) {
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("category", data.category);
    if (data.imageFile) fd.append("image", data.imageFile);
    if (data.deleteImage) fd.append("delete_image", "1");
    return api.put<Product>(`/products/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return api.put<Product>(`/products/${id}`, { name: data.name, category: data.category });
};

export const deleteProduct = (id: number) => api.delete<{ message: string }>(`/products/${id}`);