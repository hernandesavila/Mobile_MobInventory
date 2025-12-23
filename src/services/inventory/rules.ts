import { AppSettings, InventoryDiff } from '@/types';

export function deriveFinalQuantity(diff: InventoryDiff, settings: AppSettings) {
  if (diff.status === 'MISSING') {
    return settings.missingRule === 'zero' ? 0 : diff.l0Quantity;
  }

  const choice = diff.resolutionChoice ?? 'L1';
  if (choice === 'IGNORE') {
    return diff.l0Quantity;
  }

  if (choice === 'L2') {
    return diff.l2Quantity ?? diff.l1Quantity ?? diff.l0Quantity;
  }

  return diff.l1Quantity ?? diff.l0Quantity;
}
