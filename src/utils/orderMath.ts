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

export const TAX_CODES: Record<string, number> = {
  'IGST@5': 5,
  'IGST@12': 12,
  'IGST@18': 18,
  'GST@5': 5,
  'GST@12': 12,
};

export const SALES_TYPES = ['Whole Sales', 'Retail', 'Export'] as const;
export const WAREHOUSES = ['DHB1 WH', 'MAIN WH', 'ERODE WH'] as const;
export const LOCATIONS = ['TAMIL NADU', 'KERALA', 'KARNATAKA'] as const;
