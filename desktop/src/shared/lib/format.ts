const DATE_TIME = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NUMBER = new Intl.NumberFormat('uk-UA');

const MONEY = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 3,
});

const SECONDS_IN_MINUTE = 60;

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatMoney(usd: number): string {
  return MONEY.format(usd);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
  const rest = Math.round(seconds % SECONDS_IN_MINUTE);

  return `${formatNumber(minutes)} хв ${rest.toString().padStart(2, '0')} с`;
}
