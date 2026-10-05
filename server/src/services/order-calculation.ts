export type PriceLine = { unitPricePaise: number; quantity: number; taxRateBps: number };

export function calculateOrderTotal(lines: PriceLine[], discountPaise = 0) {
  const subtotalPaise = lines.reduce((sum, line) => sum + line.unitPricePaise * line.quantity, 0);
  if (discountPaise < 0 || discountPaise > subtotalPaise) throw new Error("Discount cannot exceed subtotal");
  const taxPaise = lines.reduce((sum, line) => sum + Math.round(line.unitPricePaise * line.quantity * line.taxRateBps / 10000), 0);
  return { subtotalPaise, taxPaise, totalPaise: subtotalPaise - discountPaise + taxPaise };
}
