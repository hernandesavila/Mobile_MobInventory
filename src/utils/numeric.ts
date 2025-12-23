export function formatIntegerInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  return digits.replace(/^0+/, '') || '0';
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  const normalized = digits.padStart(3, '0');
  const intPart = normalized.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimal = normalized.slice(-2);
  return `${intPart}.${decimal}`;
}

export function applyThousandSeparator(value: string) {
  const [intPart, decimal = '00'] = value.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withSep},${decimal.padEnd(2, '0')}`;
}
