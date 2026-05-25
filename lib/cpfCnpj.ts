export function onlyDigits(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidCpfCnpjDigits(digits: string): boolean {
  return digits.length === 11 || digits.length === 14;
}
