export const ITEM_GROUPS = ['Dhothie', 'Bedsheet', 'Towel'] as const;
export const ITEM_SUBGROUPS = ['kavi', 'lungi', 'dhothie'] as const;
export const ITEM_UOMS = ['Nos', 'Set', 'Dozen'] as const;

export type ItemUom = (typeof ITEM_UOMS)[number];

export function defaultUomConversion(uom: ItemUom): number {
  return uom === 'Nos' ? 1 : 12;
}

export function uomConversionLabel(uom: ItemUom, conversion: number): string {
  if (uom === 'Nos') return '1 Nos = 1 Nos';
  return `1 ${uom} = ${conversion} Nos`;
}

/** Per-base-unit (Nos) rate when item is sold by Set/Dozen. */
export function ratePerNos(rate: number, uom: ItemUom, conversion: number): number {
  if (uom === 'Nos') return rate;
  return conversion > 0 ? rate / conversion : rate;
}
