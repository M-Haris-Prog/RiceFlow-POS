// The only bill data that is safe to show a cashier or print: no cost or profit.
// Used by the API (to build it) and the UI (for the type), so keep it free of server-only imports.

export interface ReceiptItem {
  varietyName: string;
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
  items: { qtyKg: number; ratePerKg: number; totalRevenue: number; variety: { name: string } }[];
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
