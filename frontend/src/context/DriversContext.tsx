import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "../services/http";

export interface Driver {
  id: number;
  name: string;
  created_by: number | string; // tolerante: puede venir id o nombre según la API
}

interface DriversContextType {
  drivers: Driver[];
  refresh: () => Promise<void>;
  createDriver: (name: string) => Promise<Driver>;
  updateDriver: (id: number, name: string) => Promise<Driver>;
  deleteDriver: (id: number) => Promise<void>;
}

const DriversContext = createContext<DriversContextType | null>(null);

export const DriversProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const refresh = useCallback(async () => {
    const res = await api.get<Driver[]>("/drivers");
    setDrivers(res.data);
  }, []);

  const createDriver = useCallback(async (name: string) => {
    const res = await api.post<Driver>("/drivers", { name });
    setDrivers((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateDriver = useCallback(async (id: number, name: string) => {
    const res = await api.put<Driver>(`/drivers/${id}`, { name });
    setDrivers((prev) => prev.map((d) => (d.id === id ? res.data : d)));
    return res.data;
  }, []);

  const deleteDriver = useCallback(async (id: number) => {
    await api.delete(`/drivers/${id}`);
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  React.useEffect(() => {
    // Carga inicial y al volver el foco
    refresh().catch(() => {});
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <DriversContext.Provider value={{ drivers, refresh, createDriver, updateDriver, deleteDriver }}>
      {children}
    </DriversContext.Provider>
  );
};

export const useDrivers = () => {
  const ctx = useContext(DriversContext);
  if (!ctx) throw new Error("useDrivers must be used within DriversProvider");
  return ctx;
};