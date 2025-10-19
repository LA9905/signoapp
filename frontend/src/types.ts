export interface MeResp {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_limited: boolean;
  subscription_paid_until: string | null;
  due_day: number | null;
}