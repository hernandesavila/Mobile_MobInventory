export function formatPatrimonyNumber(sequence: number, format = 'PAT-{seq}', pad = 6) {
  const padded = sequence.toString().padStart(pad, '0');
  if (format.includes('{seq}')) {
    return format.replace('{seq}', padded);
  }
  return `PAT-${padded}`;
}
