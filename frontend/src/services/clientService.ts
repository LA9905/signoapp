// src/services/clientService.ts
import { api } from "./http";

export type Client = { id: number; name: string; created_by: number };

export const getClients = () => api.get<Client[]>("/clients");

export const createClient = (name: string) =>
  api.post<Client>("/clients", { name });

export const updateClient = (id: number, name: string) =>
  api.put<Client>(`/clients/${id}`, { name });

export const deleteClient = (id: number) =>
  api.delete<{ message: string }>(`/clients/${id}`);
