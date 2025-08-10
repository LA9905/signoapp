// src/context/ClientsContext.tsx
import React, { createContext, useContext, useCallback, useState } from "react";
import { api } from "../services/http";

export interface Client {
  id: number;
  name: string;
  created_by: number | string; // tolerante: backend podría enviar id o nombre
}

interface ClientsContextShape {
  clients: Client[];
  refresh: () => Promise<void>;
  createClient: (name: string) => Promise<Client>;
  updateClient: (id: number, name: string) => Promise<Client>;
  deleteClient: (id: number) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextShape | null>(null);

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);

  const refresh = useCallback(async () => {
    const res = await api.get<Client[]>("/clients");
    setClients(res.data);
  }, []);

  const createClient = useCallback(async (name: string) => {
    const res = await api.post<Client>("/clients", { name });
    setClients((prev) => [...prev, res.data]);
    return res.data;
  }, []);

  const updateClient = useCallback(async (id: number, name: string) => {
    const res = await api.put<Client>(`/clients/${id}`, { name });
    const updated = res.data;
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteClient = useCallback(async (id: number) => {
    await api.delete(`/clients/${id}`);
    setClients((prev) => prev.filter((c) => c.id !== id));
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
