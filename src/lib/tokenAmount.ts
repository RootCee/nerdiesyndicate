export function formatTokenAmount(value: bigint, decimals = 18): string {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError('Token decimals must be a safe integer between 0 and 255.');
  }

  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const wholeDigits = decimals === 0 ? digits : digits.slice(0, -decimals);
  const fractionDigits = decimals === 0 ? '' : digits.slice(-decimals).replace(/0+$/, '');
  const groupedWhole = wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${negative ? '-' : ''}${groupedWhole}${fractionDigits ? `.${fractionDigits}` : ''}`;
}
