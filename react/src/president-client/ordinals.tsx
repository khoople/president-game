const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}
