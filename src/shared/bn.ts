const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** English digits → Bangla digits. Deterministic (same output on server + browser). */
export const bnDigits = (v: string | number) => String(v).replace(/\d/g, (d) => BN[+d]);

/** 1700 → "১,৭০০" */
export const bnNumber = (n: number) => bnDigits(Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));

/** 1700 → "৳১,৭০০" */
export const taka = (n: number) => `৳${bnNumber(n)}`;

export const orderNo = (id: number) => `TH${1000 + id}`;
