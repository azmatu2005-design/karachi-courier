const TRACKING_PREFIX = "KC";

export function formatTrackingId(id: string): string {
  const normalized = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${TRACKING_PREFIX}-${normalized.slice(0, 12)}`;
}

export function isValidKarachiPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^(92)?0?3[0-9]{9}$/.test(digits);
}

export function formatCurrencyPkr(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}
