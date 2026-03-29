import React, { createContext, useContext, useCallback, useState } from "react";
import { api } from "../services/http";

export interface Supplier {
  id: number;
  name: string;
  created_by: number | string;
}

interface SuppliersContextShape {
  suppliers: Supplier[];
  refresh: () => Promise<void>;
  createSupplier: (name: string) => Promise<Supplier>;
  updateSupplier: (id: number, name: string) => Promise<Supplier>;
  deleteSupplier: (id: number) => Promise<void>;
}

const SuppliersContext = createContext<SuppliersContextShape | null>(null);

export const SuppliersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refresh = useCallback(async () => {
    const res = await api.get<Supplier[]>("/suppliers");
    setSuppliers(res.data);
  }, []);

  const createSupplier = useCallback(async (name: string) => {
    const res = await api.post<Supplier>("/suppliers", { name });
    setSuppliers((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateSupplier = useCallback(async (id: number, name: string) => {
    const res = await api.put<Supplier>(`/suppliers/${id}`, { name });
    const updated = res.data;
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const deleteSupplier = useCallback(async (id: number) => {
    await api.delete(`/suppliers/${id}`);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  React.useEffect(() => {
    refresh().catch(() => {});
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <SuppliersContext.Provider value={{ suppliers, refresh, createSupplier, updateSupplier, deleteSupplier }}>
      {children}
    </SuppliersContext.Provider>
  );
};

export const useSuppliers = () => {
  const ctx = useContext(SuppliersContext);
  if (!ctx) throw new Error("useSuppliers debe usarse dentro de <SuppliersProvider>");
  return ctx;
};