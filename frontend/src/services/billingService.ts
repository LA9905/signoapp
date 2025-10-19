import { api } from "./http";

export type BillingUser = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  due_day: number;
  subscription_paid_until: string | null;
  blocked: boolean;
};

export const getBillingStatus = (email?: string) =>
  api.get<{ today: string; viewer_is_admin: boolean; user: BillingUser }>(
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