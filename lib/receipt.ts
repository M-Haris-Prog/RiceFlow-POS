// The only bill data that is safe to show a cashier or print: no cost or profit.
// Used by the API (to build it) and the UI (for the type), so keep it free of server-only imports.

export interface ReceiptItem {
  varietyName: string;
  packaging: string;
  qtyKg: number;
  ratePerKg: number;
  lineTotal: number;
}

export interface ReceiptData {
  billNumber: number;
  billDate: string;
  customerName: string | null;
  customerPhone: string | null;
  cashierName: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  amountDue: number;
}

// One line of a bill that can still be returned (cashier-safe: no cost or profit).
export interface ReturnableItem {
  saleItemId: string;
  varietyName: string;
  packaging: string;
  qtyKg: number;
  returnedKg: number;
  // What the customer actually paid per kilo after the bill's discount.
  refundPerKg: number;
}

// The slip for a refund: what came back and what was given back.
export interface ReturnSlipData {
  returnId: string;
  billNumber: number;
  returnDate: string;
  customerName: string | null;
  cashierName: string;
  items: { varietyName: string; packaging: string; qtyKg: number; refundAmount: number }[];
  refundAmount: number;
  // Part of the refund that only reduced what the customer still owed.
  dueReduced: number;
  // Cash handed back.
  cashRefunded: number;
  note: string | null;
}

interface ReturnForSlip {
  id: string;
  returnDate: Date;
  refundAmount: number;
  dueReduced: number;
  cashRefunded: number;
  note: string | null;
  createdBy: { displayName: string };
  bill: { billNumber: number; customerName: string | null };
  items: {
    qtyKg: number;
    refundAmount: number;
    saleItem: { packaging: string; variety: { name: string } };
  }[];
}

export function toReturnSlip(r: ReturnForSlip): ReturnSlipData {
  return {
    returnId: r.id,
    billNumber: r.bill.billNumber,
    returnDate: r.returnDate.toISOString(),
    customerName: r.bill.customerName,
    cashierName: r.createdBy.displayName,
    items: r.items.map((i) => ({
      varietyName: i.saleItem.variety.name,
      packaging: i.saleItem.packaging,
      qtyKg: i.qtyKg,
      refundAmount: i.refundAmount,
    })),
    refundAmount: r.refundAmount,
    dueReduced: r.dueReduced,
    cashRefunded: r.cashRefunded,
    note: r.note,
  };
}

interface BillForReceipt {
  billNumber: number;
  billDate: Date;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  amountDue: number;
  createdBy: { displayName: string };
  items: {
    packaging: string;
    qtyKg: number;
    ratePerKg: number;
    totalRevenue: number;
    variety: { name: string };
  }[];
}

export function toReceipt(bill: BillForReceipt): ReceiptData {
  return {
    billNumber: bill.billNumber,
    billDate: bill.billDate.toISOString(),
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    cashierName: bill.createdBy.displayName,
    items: bill.items.map((i) => ({
      varietyName: i.variety.name,
      packaging: i.packaging,
      qtyKg: i.qtyKg,
      ratePerKg: i.ratePerKg,
      lineTotal: i.totalRevenue,
    })),
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    total: bill.total,
    paymentMethod: bill.paymentMethod,
    amountReceived: bill.amountReceived,
    amountDue: bill.amountDue,
  };
}
