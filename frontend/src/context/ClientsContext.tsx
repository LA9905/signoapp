import React, { createContext, useContext, useCallback, useState } from "react";
import axios from "axios";

export interface Client {
  id: number;
  name: string;
  created_by: string;
}

interface ClientsContextShape {
  clients: Client[];
  refresh: () => Promise<void>;
  createClient: (name: string) => Promise<Client>;
  updateClient: (id: number, name: string) => Promise<Client>;
  deleteClient: (id: number) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextShape | null>(null);

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);

  const refresh = useCallback(async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/clients`, {
      headers: getAuthHeaders(),
    });
    setClients(res.data);
  }, []);

  const createClient = useCallback(async (name: string) => {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/clients`,
      { name },
      { headers: getAuthHeaders() }
    );
    setClients(prev => [...prev, res.data]);
    return res.data as Client;
  }, []);

  const updateClient = useCallback(async (id: number, name: string) => {
    const res = await axios.put(
      `${import.meta.env.VITE_API_URL}/api/clients/${id}`,
      { name },
      { headers: getAuthHeaders() }
    );
    const updated = res.data as Client;
    setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteClient = useCallback(async (id: number) => {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/clients/${id}`, {
      headers: getAuthHeaders(),
    });
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  React.useEffect(() => {
    // Carga inicial y al volver el foco
    refresh().catch(() => {});
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <ClientsContext.Provider value={{ clients, refresh, createClient, updateClient, deleteClient }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients debe usarse dentro de <ClientsProvider>");
  return ctx;
};