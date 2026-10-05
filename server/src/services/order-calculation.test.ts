import { describe, expect, it } from "vitest";
import { calculateOrderTotal } from "./order-calculation.js";

describe("calculateOrderTotal", () => {
  it("calculates item totals and tax in paise", () => {
    expect(calculateOrderTotal([{ unitPricePaise: 12000, quantity: 2, taxRateBps: 500 }])).toEqual({ subtotalPaise: 24000, taxPaise: 1200, totalPaise: 25200 });
  });
  it("subtracts a valid discount", () => {
    expect(calculateOrderTotal([{ unitPricePaise: 10000, quantity: 1, taxRateBps: 0 }], 1500).totalPaise).toBe(8500);
  });
  it("rejects a discount larger than the subtotal", () => {
    expect(() => calculateOrderTotal([{ unitPricePaise: 100, quantity: 1, taxRateBps: 0 }], 101)).toThrow("Discount cannot exceed subtotal");
  });
});
