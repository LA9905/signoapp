import { api } from "./http";

export type DispatchProduct = { nombre: string; cantidad: number; unidad: string };
export type Dispatch = {
  id: number;
  orden: string;
  cliente: string;   // nombre
  chofer: string;    // nombre
  created_by: string; // nombre del usuario creador
  fecha: string;
  status: string;
  productos: DispatchProduct[];
};

// Crear
export const createDispatch = (data: {
  orden: string;
  cliente: string;         // nombre del cliente
  chofer: number | string;
  productos: DispatchProduct[];
}) => api.post<Dispatch>("/dispatches", data);

// Listar con filtros opcionales ?client=&order=&user=&driver=&date=YYYY-MM-DD
export const getDispatches = (filters?: {
  client?: string;
  order?: string;
  user?: string;
  driver?: string;
  date?: string; // YYYY-MM-DD
}) => api.get<Dispatch[]>("/dispatches", { params: filters });

// Detalle
export const getDispatchById = (id: number) =>
  api.get<Dispatch>(`/dispatches/${id}`);

// Marcar entregado
export const markDelivered = (id: number) =>
  api.post<{ message: string; status: string }>(`/dispatches/${id}/mark-delivered`, {});

// Actualizar
export const updateDispatch = (
  id: number,
  data: {
    orden?: string;
    cliente?: string;        // nombre
    chofer?: number | string;
    fecha?: string;
    status?: string;
    productos?: DispatchProduct[];
  }
) => api.put<Dispatch>(`/dispatches/${id}`, data);

// Eliminar
export const deleteDispatch = (id: number) =>
  api.delete<{ message: string }>(`/dispatches/${id}`);

// Serie mensual (31 puntos)
export const getMonthlySeries = () =>
  api.get<number[]>("/dispatches/monthly");