import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

export interface Driver {
  id: number;
  name: string;
  created_by: string;
}

interface DriversContextType {
  drivers: Driver[];
  refresh: () => Promise<void>;
  createDriver: (name: string) => Promise<Driver>;
  updateDriver: (id: number, name: string) => Promise<Driver>;
  deleteDriver: (id: number) => Promise<void>;
}

const DriversContext = createContext<DriversContextType | null>(null);

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const DriversProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const refresh = useCallback(async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/drivers`, {
      headers: getAuthHeaders(),
    });
    setDrivers(res.data);
  }, []);

  const createDriver = useCallback(async (name: string) => {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/drivers`,
      { name },
      { headers: getAuthHeaders() }
    );
    setDrivers(prev => [...prev, res.data]);
    return res.data as Driver;
  }, []);

  const updateDriver = useCallback(async (id: number, name: string) => {
    const res = await axios.put(
      `${import.meta.env.VITE_API_URL}/api/drivers/${id}`,
      { name },
      { headers: getAuthHeaders() }
    );
    setDrivers(prev => prev.map(d => (d.id === id ? res.data : d)));
    return res.data as Driver;
  }, []);

  const deleteDriver = useCallback(async (id: number) => {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/drivers/${id}`, {
      headers: getAuthHeaders(),
    });
    setDrivers(prev => prev.filter(d => d.id !== id));
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
