import type { OrderLineForm } from '../types/salesOrder';

export interface OrderTotals {
  totalBeforeDiscount: number;
  lineDiscountTotal: number;
  subtotal: number;
  headerDiscountAmount: number;
  taxable: number;
  tax: number;
  rounding: number;
  docTotal: number;
}

export function lineTotal(line: Pick<OrderLineForm, 'qty' | 'unitRate' | 'discountPct'>): number {
  const gross = line.qty * line.unitRate;
  return Math.round(gross * (1 - line.discountPct / 100) * 100) / 100;
}

export function lineTax(lineTotalValue: number, taxPct: number): number {
  return Math.round(lineTotalValue * (taxPct / 100) * 100) / 100;
}

export function computeOrderTotals(
  lines: OrderLineForm[],
  gstRatePct: number,
  headerDiscountPct: number,
  rounding: number,
): OrderTotals {
  let totalBeforeDiscount = 0;
  let subtotal = 0;

  for (const line of lines) {
    const gross = line.qty * line.unitRate;
    totalBeforeDiscount += gross;
    subtotal += lineTotal(line);
  }

  totalBeforeDiscount = Math.round(totalBeforeDiscount * 100) / 100;
  subtotal = Math.round(subtotal * 100) / 100;
  const lineDiscountTotal = Math.round((totalBeforeDiscount - subtotal) * 100) / 100;
  const headerDiscountAmount = Math.round(subtotal * (headerDiscountPct / 100) * 100) / 100;
  const taxable = Math.max(0, Math.round((subtotal - headerDiscountAmount) * 100) / 100);
  const tax = Math.round(taxable * (gstRatePct / 100) * 100) / 100;
  const docTotal = Math.round((taxable + tax + rounding) * 100) / 100;

  return {
    totalBeforeDiscount,
    lineDiscountTotal,
    subtotal,
    headerDiscountAmount,
    taxable,
    tax,
    rounding,
    docTotal,
  };
}

export const TAX_CODE_OPTIONS = [
  'GST0%',
  'GST5%',
  'GST18%',
  'IGST0%',
  'IGST5%',
  'IGST18%',
] as const;

export type TaxCode = (typeof TAX_CODE_OPTIONS)[number];

export const TAX_CODES: Record<string, number> = {
  'GST0%': 0,
  'GST5%': 5,
  'GST18%': 18,
  'IGST0%': 0,
  'IGST5%': 5,
  'IGST18%': 18,
};

export function taxRateFromCode(code: string): number {
  return TAX_CODES[code] ?? 0;
}

export function isTamilNaduOrder(partnerState: string | null | undefined, location: string): boolean {
  if (partnerState?.trim().toLowerCase() === 'tamil nadu') return true;
  if (location.toUpperCase().includes('TAMIL NADU')) return true;
  if (/^TN-/i.test(location)) return true;
  return false;
}

export function defaultTaxCode(
  partnerState: string | null | undefined,
  location: string,
  rate: 0 | 5 | 18 = 5,
): TaxCode {
  const prefix = isTamilNaduOrder(partnerState, location) ? 'GST' : 'IGST';
  return `${prefix}${rate}%` as TaxCode;
}

export function lineAmount(qty: number, unitRate: number, discountPct: number): number {
  const gross = qty * unitRate;
  return Math.round(gross * (1 - discountPct / 100) * 100) / 100;
}

export function normalizeTaxCode(
  code: string | undefined,
  partnerState: string | null | undefined,
  location: string,
): TaxCode {
  if (code && TAX_CODES[code] !== undefined) return code as TaxCode;
  const legacy: Record<string, TaxCode> = {
    'IGST@5': 'IGST5%',
    'IGST@12': 'IGST18%',
    'IGST@18': 'IGST18%',
    'GST@5': 'GST5%',
    'GST@12': 'GST18%',
  };
  if (code && legacy[code]) return legacy[code];
  return defaultTaxCode(partnerState, location, 5);
}

export const SALES_TYPES = ['Whole Sales', 'Retail', 'Export'] as const;
export const WAREHOUSES = ['DHB1 WH', 'MAIN WH', 'ERODE WH'] as const;
export const LOCATIONS = ['TAMIL NADU', 'KERALA', 'KARNATAKA'] as const;
