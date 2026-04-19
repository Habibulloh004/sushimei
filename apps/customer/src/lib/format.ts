export function formatPrice(price: number): string {
  return `$${(price / 100).toFixed(2)}`;
}

export function formatUzPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const localDigits = (digits.startsWith('998') ? digits.slice(3) : digits).slice(0, 9);
  const part1 = localDigits.slice(0, 2);
  const part2 = localDigits.slice(2, 5);
  const part3 = localDigits.slice(5, 7);
  const part4 = localDigits.slice(7, 9);

  let formatted = '+998';
  if (part1) formatted += ` ${part1}`;
  if (part2) formatted += ` ${part2}`;
  if (part3) formatted += ` ${part3}`;
  if (part4) formatted += ` ${part4}`;

  return formatted;
}

export function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const normalizedDigits = digits.startsWith('998') ? digits : `998${digits}`;
  return `+${normalizedDigits.slice(0, 12)}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatOrderStatus(status: string): string {
  return status.replaceAll('_', ' ');
}
