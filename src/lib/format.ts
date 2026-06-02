export function formatCurrency(value: number | string | { toString(): string }) {
  return new Intl.NumberFormat("en-ZW", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-ZW", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-ZW", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function enumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dateInputValue(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function daysFromNow(value: Date | string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
