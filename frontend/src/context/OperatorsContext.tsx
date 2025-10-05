import React, { createContext, useContext, useCallback, useState } from "react";
import { api } from "../services/http";

export interface Operator {
  id: number;
  name: string;
  created_by: number | string;
}

interface OperatorsContextShape {
  operators: Operator[];
  refresh: () => Promise<void>;
  createOperator: (name: string) => Promise<Operator>;
  updateOperator: (id: number, name: string) => Promise<Operator>;
  deleteOperator: (id: number) => Promise<void>;
}

const OperatorsContext = createContext<OperatorsContextShape | null>(null);

export const OperatorsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operators, setOperators] = useState<Operator[]>([]);

  const refresh = useCallback(async () => {
    const res = await api.get<Operator[]>("/operators");
    setOperators(res.data);
  }, []);

  const createOperator = useCallback(async (name: string) => {
    const res = await api.post<Operator>("/operators", { name });
    setOperators((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateOperator = useCallback(async (id: number, name: string) => {
    const res = await api.put<Operator>(`/operators/${id}`, { name });
    const updated = res.data;
    setOperators((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const deleteOperator = useCallback(async (id: number) => {
    await api.delete(`/operators/${id}`);
    setOperators((prev) => prev.filter((s) => s.id !== id));
  }, []);

  React.useEffect(() => {
    refresh().catch(() => {});
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <OperatorsContext.Provider value={{ operators, refresh, createOperator, updateOperator, deleteOperator }}>
      {children}
    </OperatorsContext.Provider>
  );
};

export const useOperators = () => {
  const ctx = useContext(OperatorsContext);
  if (!ctx) throw new Error("useOperators debe usarse dentro de <OperatorsProvider>");
  return ctx;
};