export const STATUSES = [
  { id: 'new', label: 'নতুন', color: '#d81b60' },
  { id: 'confirmed', label: 'কনফার্মড', color: '#1976d2' },
  { id: 'shipped', label: 'পাঠানো হয়েছে', color: '#ed6c02' },
  { id: 'delivered', label: 'ডেলিভারড', color: '#2e7d32' },
  { id: 'cancelled', label: 'বাতিল', color: '#757575' },
] as const;

export type StatusId = (typeof STATUSES)[number]['id'];
export const isStatus = (s: unknown): s is StatusId => STATUSES.some((x) => x.id === s);
export const statusInfo = (s: string) => STATUSES.find((x) => x.id === s) ?? STATUSES[0];

export type AdminOrder = {
  id: number;
  orderNo: string;
  createdAt: number;
  name: string;
  phone: string;
  address: string;
  qty: number;
  items: { color: string; size: string }[];
  subtotal: number;
  delivery: number;
  total: number;
  status: StatusId;
  note: string;
  capi: string | null;
};
