import type { Item, Rate } from '../types/api';
import { parseNum } from './format';

export function resolveWholesaleRate(
  itemId: string,
  partnerRates: Rate[] | undefined,
  items: Item[] | undefined,
): number {
  const partnerRate = partnerRates?.find((r) => r.item_id === itemId);
  if (partnerRate) return parseNum(partnerRate.wholesale);
  const item = items?.find((i) => i.id === itemId);
  return item ? parseNum(item.default_wholesale) : 0;
}

export function resolveMrpRate(
  itemId: string,
  partnerRates: Rate[] | undefined,
  items: Item[] | undefined,
): number {
  const partnerRate = partnerRates?.find((r) => r.item_id === itemId);
  if (partnerRate) return parseNum(partnerRate.mrp);
  const item = items?.find((i) => i.id === itemId);
  return item ? parseNum(item.default_mrp) : 0;
}
