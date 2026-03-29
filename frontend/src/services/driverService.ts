import { api } from "./http";

export type Driver = { id: number; name: string; created_by: number };

export const getDrivers = () => api.get<Driver[]>("/drivers");

export const createDriver = (name: string) =>
  api.post<Driver>("/drivers", { name });

export const updateDriver = (id: number, name: string) =>
  api.put<Driver>(`/drivers/${id}`, { name });

export const deleteDriver = (id: number) =>
  api.delete<{ message: string }>(`/drivers/${id}`);
