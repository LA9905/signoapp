import { api } from "./http";

export type BillingUser = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_super_admin?: boolean;
  due_day: number;
  subscription_paid_until: string | null;
  blocked: boolean;
  can_edit_stock: boolean;
  notify_low_stock: boolean;
  notify_pending_dispatches: boolean;
  linked_operator_id?: number | null;
  linked_operator_name?: string | null;
  linked_driver_id?: number | null;
  linked_driver_name?: string | null;
};

export type SimpleEmployee = { id: number; name: string };

export const getBillingStatus = (email?: string) =>
  api.get<{ today: string; viewer_is_admin: boolean; viewer_is_super_admin: boolean; user: BillingUser }>(
    "/billing/status",
    { params: email ? { email } : undefined }
  );

export const markPaid = (payload?: { email?: string; until?: string }) =>
  api.post("/billing/mark-paid", payload || {});

export const getAllUsers = () =>
  api.get<{ users: BillingUser[] }>("/billing/users");

export const markPaidMultiple = (payload: { user_ids: number[]; until: string }) =>
  api.post("/billing/mark-paid-multiple", payload);

export const blockMultiple = (payload: { user_ids: number[] }) =>
  api.post("/billing/block-multiple", payload);

export const deleteUsers = (payload: { user_ids: number[] }) =>
  api.delete("/billing/delete-multiple", { data: payload });

export const setStockPermission = (payload: { user_ids: number[]; can_edit_stock: boolean }) =>
  api.post("/billing/set-stock-permission", payload);

export const setNotificationPrefs = (payload: {
  user_ids: number[];
  notify_low_stock?: boolean;
  notify_pending_dispatches?: boolean;
}) => api.post("/billing/set-notification-prefs", payload);

export const getOperatorsList = () =>
  api.get<SimpleEmployee[]>("/operators");

export const getDriversList = () =>
  api.get<SimpleEmployee[]>("/drivers");

export const setEmployeeLink = (payload: {
  user_id: number;
  role: "operator" | "driver" | "none";
  operator_id?: number;
  driver_id?: number;
}) => api.post("/billing/set-employee-link", payload);

export const setAdminStatus = (payload: { user_id: number; is_admin: boolean }) =>
  api.post("/billing/set-admin-status", payload);