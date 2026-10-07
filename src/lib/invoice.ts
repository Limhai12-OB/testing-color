import { id, type Branch, type RecordRow } from "./store";

export const INVOICE_DEMO_DATE = "2026-10-06";
export type InvoiceLine = {
  description: string;
  quantity: number | "";
  price: number | "";
  itemId?: string;
};
export type InvoiceDraft = {
  customer: string;
  customerName: string;
  branch: string;
  date: string;
  due: string;
  currency: "" | "USD" | "KHR";
  lineItems: InvoiceLine[];
  discount: number;
  taxRate: number;
  note: string;
  source: "Manual" | "Voice + AI";
  transcript?: string;
  originalTranscript?: string;
  dueInterpretation?: string;
  warnings: string[];
};
export const emptyInvoice = (): InvoiceDraft => ({
  customer: "",
  customerName: "",
  branch: "",
  date: INVOICE_DEMO_DATE,
  due: "",
  currency: "",
  lineItems: [],
  discount: 0,
  taxRate: 0,
  note: "",
  source: "Manual",
  warnings: [],
});
export function invoiceTotals(
  draft: Pick<InvoiceDraft, "lineItems" | "discount" | "taxRate" | "currency">,
) {
  const round = (n: number) =>
    Math.round((n + Number.EPSILON) * (draft.currency === "KHR" ? 1 : 100)) /
    (draft.currency === "KHR" ? 1 : 100);
  const subtotal = round(
    draft.lineItems.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.price),
      0,
    ),
  );
  const discount = round(Number(draft.discount) || 0);
  const taxable = round(subtotal - discount);
  const tax = round((taxable * (Number(draft.taxRate) || 0)) / 100);
  return { subtotal, discount, tax, total: round(taxable + tax) };
}
export function validateInvoice(
  draft: InvoiceDraft,
  customers: RecordRow[],
  allowedBranches: string[],
) {
  const errors: string[] = [];
  if (!allowedBranches.includes(draft.branch))
    errors.push("Choose an available branch.");
  if (
    !customers.some((c) => c.id === draft.customer && c.branch === draft.branch)
  )
    errors.push("Confirm a customer for this branch.");
  if (!draft.currency) errors.push("Confirm USD or KHR.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date))
    errors.push("Add an invoice date.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.due)) errors.push("Add a due date.");
  else if (draft.due < draft.date)
    errors.push("Due date must be on or after the invoice date.");
  if (!draft.lineItems.length) errors.push("Add at least one item or service.");
  draft.lineItems.forEach((l, i) => {
    if (!l.description.trim()) errors.push(`Item ${i + 1}: add a description.`);
    if (!Number.isFinite(Number(l.quantity)) || Number(l.quantity) <= 0)
      errors.push(`Item ${i + 1}: add a positive quantity.`);
    if (
      l.price === "" ||
      !Number.isFinite(Number(l.price)) ||
      Number(l.price) <= 0
    )
      errors.push(`Item ${i + 1}: add a unit price.`);
  });
  const { subtotal, total } = invoiceTotals(draft);
  if (
    !Number.isFinite(draft.discount) ||
    draft.discount < 0 ||
    draft.discount > subtotal
  )
    errors.push("Discount must be between zero and the subtotal.");
  if (
    !Number.isFinite(draft.taxRate) ||
    draft.taxRate < 0 ||
    draft.taxRate > 100
  )
    errors.push("Tax rate must be between 0% and 100%.");
  if (!Number.isFinite(total) || total <= 0)
    errors.push("Invoice total must be greater than zero.");
  return errors;
}
export function invoiceRecord(
  draft: InvoiceDraft,
  customer: RecordRow,
  author: string,
  existing?: RecordRow,
  invoiceId?: string,
): RecordRow {
  const totals = invoiceTotals(draft),
    rate = draft.currency === "KHR" ? 4100 : 1;
  return {
    ...existing,
    id: existing?.id || invoiceId || id("INV"),
    name: customer.name,
    customer: customer.id,
    branch: draft.branch as Branch,
    date: draft.date,
    due: draft.due,
    currency: draft.currency,
    amount: totals.total / rate,
    paid: existing?.paid || 0,
    status: existing?.status || "Draft",
    source: existing?.source || draft.source,
    note: draft.note,
    lineItems: draft.lineItems.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      price: Number(l.price) / rate,
      itemId: l.itemId,
    })),
    discount: totals.discount / rate,
    taxRate: draft.taxRate,
    subtotal: totals.subtotal / rate,
    tax: totals.tax / rate,
    transcript: draft.transcript || existing?.transcript,
    originalTranscript:
      draft.originalTranscript || existing?.originalTranscript,
    activity: [
      ...(existing?.activity || []),
      `${draft.date} · ${existing ? "Invoice updated" : draft.source === "Voice + AI" ? "Invoice created using Voice Assistant" : "Invoice created"} by ${author}`,
    ],
  };
}
export function draftFromRecord(record: RecordRow): InvoiceDraft {
  const rate = record.currency === "KHR" ? 4100 : 1;
  return {
    ...emptyInvoice(),
    customer: record.customer || "",
    customerName: record.name,
    branch: record.branch,
    date: record.date,
    due: record.due || "",
    currency: record.currency === "KHR" ? "KHR" : "USD",
    lineItems: (
      record.lineItems || [
        {
          description: record.note || "Products & services",
          quantity: 1,
          price: record.amount,
        },
      ]
    ).map((l) => ({
      ...l,
      price: Number((l.price * rate).toFixed(rate === 1 ? 2 : 0)),
    })),
    discount: (record.discount || 0) * rate,
    taxRate: record.taxRate || 0,
    note: record.note || "",
    source: record.source === "Voice + AI" ? "Voice + AI" : "Manual",
    transcript: record.transcript,
    originalTranscript: record.originalTranscript,
  };
}
