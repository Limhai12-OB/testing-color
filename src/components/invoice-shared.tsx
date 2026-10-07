"use client";
import { useState } from "react";
import {
  Plus,
  Check,
  ArrowRight,
  FileText,
  X,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import { useApp } from "./context";
import { Badge, Money, Modal } from "./ui";
import { id, type Branch, type RecordRow } from "@/lib/store";
import {
  draftFromRecord,
  emptyInvoice,
  invoiceRecord,
  invoiceTotals,
  validateInvoice,
  type InvoiceDraft,
} from "@/lib/invoice";
import { matchingRecords } from "@/lib/voice";

export function InvoiceDocument({ record }: { record: RecordRow }) {
  const { state } = useApp();
  const currency = record.currency === "KHR" ? "KHR" : "USD";
  const subtotal =
    record.subtotal ??
    record.lineItems?.reduce((s, l) => s + l.quantity * l.price, 0) ??
    record.amount;
  return (
    <article className="invoice-paper">
      <div className="invoice-paper-head">
        <div>
          <strong>{state.settings.business}</strong>
          <small>{record.branch} · Cambodia</small>
        </div>
        <div>
          <h3>INVOICE</h3>
          <small>{record.id}</small>
          <Badge>{record.status}</Badge>
        </div>
      </div>
      <div className="invoice-addresses">
        <div>
          <small>BILL TO</small>
          <strong>{record.name}</strong>
        </div>
        <div>
          <small>Issued {record.date}</small>
          <small>Due {record.due || "Not specified"}</small>
          <small>Currency · {currency}</small>
        </div>
      </div>
      {(
        record.lineItems || [
          {
            description: record.note || "Products & services",
            quantity: 1,
            price: record.amount,
          },
        ]
      ).map((line, i) => (
        <div className="invoice-line" key={i}>
          <span>
            {line.description}
            <small>
              {line.quantity} × <Money value={line.price} currency={currency} />
            </small>
          </span>
          <Money value={line.quantity * line.price} currency={currency} />
        </div>
      ))}
      <div className="invoice-calculation">
        <div>
          <span>Subtotal</span>
          <Money value={subtotal} currency={currency} />
        </div>
        <div>
          <span>Discount</span>
          <span>
            −<Money value={record.discount || 0} currency={currency} />
          </span>
        </div>
        <div>
          <span>Tax ({record.taxRate || 0}%)</span>
          <Money value={record.tax || 0} currency={currency} />
        </div>
        <div className="invoice-total">
          <strong>Total</strong>
          <Money value={record.amount} currency={currency} />
        </div>
      </div>
      {record.note && (
        <div className="invoice-document-note">
          <small>NOTES</small>
          <p>{record.note}</p>
        </div>
      )}
      <p className="invoice-thanks">Thank you for your business.</p>
    </article>
  );
}
export function InvoiceFields({
  draft,
  onChange,
  voice = false,
}: {
  draft: InvoiceDraft;
  onChange: (draft: InvoiceDraft) => void;
  voice?: boolean;
}) {
  const a = useApp();
  const [newCustomer, setNewCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const patch = (change: Partial<InvoiceDraft>) =>
    onChange({ ...draft, ...change });
  const allowed =
    a.role === "Branch Manager"
      ? [a.activeBranch]
      : a.state.locations.filter((l) => l.active).map((l) => l.name);
  const customers = a.state.customers.filter(
    (c) =>
      allowed.includes(c.branch) &&
      (!draft.branch || c.branch === draft.branch),
  );
  const selected = customers.find((c) => c.id === draft.customer);
  const matches = matchingRecords(draft.customerName, customers);
  const totals = invoiceTotals(draft);
  const rate = draft.currency === "KHR" ? 4100 : 1;
  const money = (n: number) =>
    draft.currency ? (
      <Money value={n / rate} currency={draft.currency} />
    ) : (
      <span>{n.toFixed(2)} · currency needed</span>
    );
  const updateLine = (
    i: number,
    change: Partial<InvoiceDraft["lineItems"][number]>,
  ) =>
    patch({
      lineItems: draft.lineItems.map((l, j) =>
        i === j ? { ...l, ...change } : l,
      ),
    });
  return (
    <div className="invoice-fields">
      <section>
        <div className="invoice-section-title">
          <span>01</span>
          <div>
            <h2>Customer & context</h2>
            <p>Make sure this invoice reaches the right place.</p>
          </div>
        </div>
        <div className="form-grid">
          {a.role === "Branch Manager" ? (
            <div className="assigned-branch">
              <small>BRANCH</small>
              <strong>{a.activeBranch}</strong>
              <span>
                <Check size={13} />
                Automatically assigned
              </span>
            </div>
          ) : (
            <label className="field">
              Branch
              <select
                aria-label="Invoice branch"
                value={draft.branch}
                onChange={(e) =>
                  patch({ branch: e.target.value, customer: "" })
                }
              >
                <option value="">Which branch is this invoice for?</option>
                {allowed.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Currency
            <select
              aria-label="Invoice currency"
              value={draft.currency}
              onChange={(e) =>
                patch({ currency: e.target.value as InvoiceDraft["currency"] })
              }
            >
              <option value="">Currency not detected — choose</option>
              <option>USD</option>
              <option>KHR</option>
            </select>
          </label>
        </div>
        {voice && (
          <p className="field-context">
            Currency changes relabel the draft prices; check every amount before
            creating.
          </p>
        )}
        <label className="field">
          Customer
          <select
            aria-label="Customer"
            value={selected?.id || ""}
            onChange={(e) => {
              const c = customers.find((c) => c.id === e.target.value);
              patch({
                customer: c?.id || "",
                customerName: c?.name || draft.customerName,
                branch: draft.branch || c?.branch || "",
              });
            }}
          >
            <option value="">Choose an existing customer</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
                {a.role === "Business Owner" ? ` · ${c.branch}` : ""}
              </option>
            ))}
          </select>
        </label>
        {voice && !selected && (
          <div className="customer-matches">
            <div className="match-heading">
              <strong>
                {matches.length
                  ? `We found ${matches.length} possible ${matches.length === 1 ? "customer" : "customers"}`
                  : draft.customerName
                    ? `No customer match for “${draft.customerName}”`
                    : "No customer was detected"}
              </strong>
              <Badge>{matches.length ? "Check this" : "Missing"}</Badge>
            </div>
            {matches.map((c) => (
              <div className="customer-match" key={c.id}>
                <span className="avatar small">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>
                    {c.phone || c.email || "No contact added"}
                    {a.role === "Business Owner" ? ` · ${c.branch}` : ""}
                  </small>
                  <small>
                    Outstanding:{" "}
                    <Money
                      value={a.state.invoices
                        .filter(
                          (i) =>
                            i.customer === c.id &&
                            !["Draft", "Cancelled"].includes(i.status),
                        )
                        .reduce((s, i) => s + i.amount - (i.paid || 0), 0)}
                      currency={draft.currency || "USD"}
                    />
                  </small>
                </div>
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={() =>
                    patch({
                      customer: c.id,
                      customerName: c.name,
                      branch: draft.branch || c.branch,
                    })
                  }
                >
                  Use customer
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={!draft.branch}
              onClick={() => {
                setCustomerError("");
                setNewCustomer(true);
              }}
            >
              <UserPlus size={14} />
              Create new customer
            </button>
            {!draft.branch && (
              <small>Choose a branch before adding a customer.</small>
            )}
          </div>
        )}
        {selected && (
          <div className="confirmed-customer">
            <Check size={15} />
            <span>{selected.name} · customer confirmed</span>
            <Badge>Confirmed</Badge>
          </div>
        )}
        <div className="form-grid">
          <label className="field">
            Invoice date
            <input
              aria-label="Invoice date"
              type="date"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </label>
          <label className="field">
            Due date
            <input
              aria-label="Due date"
              type="date"
              min={draft.date}
              value={draft.due}
              onChange={(e) => patch({ due: e.target.value })}
            />
          </label>
        </div>
        {draft.dueInterpretation && (
          <p className="date-interpretation">
            <FileText size={14} />
            {draft.dueInterpretation}
          </p>
        )}
      </section>
      <section>
        <div className="invoice-section-title">
          <span>02</span>
          <div>
            <h2>Items & services</h2>
            <p>Adjust a quantity or price. The totals update as you go.</p>
          </div>
        </div>
        {draft.lineItems.map((line, i) => {
          const suggestions = matchingRecords(
            line.description,
            a.state.items.filter((item) => item.branch === draft.branch),
          );
          return (
            <div className="invoice-edit-line" key={i}>
              <div className="invoice-line-number">
                ITEM {i + 1}
                {line.price === "" && <Badge>Missing price</Badge>}
              </div>
              <div className="line-item-editor">
                <label className="field">
                  Description
                  <input
                    aria-label={`Item ${i + 1} description`}
                    value={line.description}
                    onChange={(e) =>
                      updateLine(i, {
                        description: e.target.value,
                        itemId: undefined,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Quantity
                  <input
                    aria-label={`Item ${i + 1} quantity`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, {
                        quantity:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  Unit price {draft.currency}
                  <input
                    aria-label={`Item ${i + 1} unit price`}
                    type="number"
                    min={draft.currency === "KHR" ? 1 : 0.01}
                    step={draft.currency === "KHR" ? 1 : 0.01}
                    value={line.price}
                    onChange={(e) =>
                      updateLine(i, {
                        price:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="Missing"
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() =>
                    patch({
                      lineItems: draft.lineItems.filter((_, j) => i !== j),
                    })
                  }
                >
                  <X size={15} />
                </button>
              </div>
              <div className="line-amount">
                Line total{" "}
                <strong>
                  {money(Number(line.quantity) * Number(line.price))}
                </strong>
              </div>
              {voice &&
                suggestions.map((item) => (
                  <div className="item-suggestion" key={item.id}>
                    <div>
                      <small>CATALOG SUGGESTION · {item.sku}</small>
                      <strong>{item.name}</strong>
                      <p>
                        Catalog: {money(item.amount * rate)}
                        {line.price !== "" &&
                          Math.abs(item.amount * rate - Number(line.price)) >
                            0.001 && (
                            <>
                              {" "}
                              · Voice price: {money(Number(line.price))}{" "}
                              <Badge>Price differs</Badge>
                            </>
                          )}
                      </p>
                    </div>
                    <div className="page-actions">
                      <button
                        type="button"
                        className="button secondary compact"
                        onClick={() =>
                          updateLine(i, {
                            description: item.name,
                            itemId: item.id,
                          })
                        }
                      >
                        {line.itemId === item.id
                          ? "Item linked"
                          : "Use item · keep price"}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={!draft.currency}
                        onClick={() =>
                          updateLine(i, {
                            description: item.name,
                            itemId: item.id,
                            price: Number(
                              (item.amount * rate).toFixed(
                                draft.currency === "KHR" ? 0 : 2,
                              ),
                            ),
                          })
                        }
                      >
                        Use catalog price
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            patch({
              lineItems: [
                ...draft.lineItems,
                { description: "", quantity: 1, price: "" },
              ],
            })
          }
        >
          <Plus size={15} />
          Add line item
        </button>
      </section>
      <section>
        <div className="invoice-section-title">
          <span>03</span>
          <div>
            <h2>The final details</h2>
            <p>
              Discount and tax are optional; neither is inferred if unspoken.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            Discount ({draft.currency || "choose currency"})
            <input
              aria-label="Discount"
              type="number"
              min="0"
              max={totals.subtotal}
              step={draft.currency === "KHR" ? 1 : 0.01}
              value={draft.discount}
              onChange={(e) => patch({ discount: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Tax rate (%)
            <input
              aria-label="Tax rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={draft.taxRate}
              onChange={(e) => patch({ taxRate: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="field">
          Notes
          <textarea
            aria-label="Invoice notes"
            rows={3}
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
            placeholder="A little context for your customer…"
          />
        </label>
        <div
          className="invoice-calculation live-calculation"
          aria-live="polite"
        >
          <div>
            <span>Subtotal</span>
            {money(totals.subtotal)}
          </div>
          <div>
            <span>Discount</span>
            {money(totals.discount)}
          </div>
          <div>
            <span>Tax</span>
            {money(totals.tax)}
          </div>
          <div className="invoice-total">
            <strong>Total</strong>
            {money(totals.total)}
          </div>
        </div>
      </section>
      {newCustomer && (
        <Modal
          title="Create a customer without leaving your invoice"
          onClose={() => setNewCustomer(false)}
        >
          <form
            className="record-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name") || "").trim();
              if (!name) {
                setCustomerError("Enter a customer name.");
                return;
              }
              const existing = customers.find(
                (c) =>
                  c.name.toLowerCase() === name.toLowerCase() &&
                  c.branch === draft.branch,
              );
              if (existing) {
                patch({ customer: existing.id, customerName: existing.name });
                setNewCustomer(false);
                return;
              }
              const customer: RecordRow = {
                id: id("CUS"),
                name,
                branch: draft.branch as Branch,
                amount: 0,
                status: "Active",
                date: draft.date,
                email: String(data.get("email") || ""),
                phone: String(data.get("phone") || ""),
              };
              a.setState((s) => ({
                ...s,
                customers: [customer, ...s.customers],
              }));
              patch({ customer: customer.id, customerName: name });
              setNewCustomer(false);
              a.notify("Customer added. Your invoice draft is still here.");
            }}
          >
            <p className="form-intro">
              This customer will be available in {draft.branch}. Your transcript
              and invoice details are preserved.
            </p>
            {customerError && (
              <p className="inline-error" role="alert">
                {customerError}
              </p>
            )}
            <label>
              Name
              <input name="name" required defaultValue={draft.customerName} />
            </label>
            <label>
              Email (optional)
              <input type="email" name="email" />
            </label>
            <label>
              Phone (optional)
              <input name="phone" />
            </label>
            <div className="form-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setNewCustomer(false)}
              >
                Back to invoice
              </button>
              <button className="button primary">
                <Check size={15} />
                Add customer & return
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function InvoiceEditor({
  record,
  editing = false,
  onClose,
}: {
  record?: RecordRow;
  editing?: boolean;
  onClose: () => void;
}) {
  const a = useApp();
  const [draft, setDraft] = useState<InvoiceDraft>(() =>
    editing && record
      ? draftFromRecord(record)
      : {
          ...emptyInvoice(),
          customer: record?.id || "",
          customerName: record?.name || "",
          branch: record?.branch || a.activeBranch,
          currency: "USD",
          due: "2026-10-13",
          lineItems: [
            { description: "Products & services", quantity: 1, price: "" },
          ],
        },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const allowed =
    a.role === "Branch Manager"
      ? [a.activeBranch]
      : a.state.locations.filter((l) => l.active).map((l) => l.name);
  const customer = a.state.customers.find((c) => c.id === draft.customer);
  const check = () => {
    const messages = validateInvoice(draft, a.state.customers, allowed);
    if (
      editing &&
      invoiceTotals(draft).total / (draft.currency === "KHR" ? 4100 : 1) <
        (record?.paid || 0)
    )
      messages.push("Total cannot be less than payments already received.");
    setErrors(messages);
    return !messages.length;
  };
  const save = () => {
    if (!check() || !customer) return;
    const invoice = invoiceRecord(
      draft,
      customer,
      a.state.settings.name,
      editing ? record : undefined,
    );
    a.setState((s) => ({
      ...s,
      invoices: editing
        ? s.invoices.map((i) => (i.id === invoice.id ? invoice : i))
        : [invoice, ...s.invoices],
    }));
    a.notify(editing ? "Invoice updated" : "Invoice draft created");
    onClose();
  };
  return (
    <div className="shared-invoice-editor">
      {errors.length > 0 && (
        <div className="inline-error" role="alert">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
      {!preview ? (
        <>
          <label className="field invoice-quick-amount">
            Amount
            <input
              aria-label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={
                draft.lineItems.length === 1
                  ? draft.lineItems[0].price
                  : invoiceTotals(draft).total
              }
              readOnly={draft.lineItems.length !== 1}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  lineItems: [
                    {
                      ...draft.lineItems[0],
                      price:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  ],
                })
              }
            />
            <small>
              For a simple invoice, enter the amount here. Itemized invoices
              calculate below.
            </small>
          </label>
          <InvoiceFields
            draft={draft}
            onChange={(d) => {
              setDraft(d);
              setErrors([]);
            }}
          />
        </>
      ) : (
        customer && (
          <InvoiceDocument
            record={invoiceRecord(
              draft,
              customer,
              a.state.settings.name,
              editing ? record : undefined,
              record?.id || "DRAFT · preview",
            )}
          />
        )
      )}
      <div className="form-footer">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button secondary"
          onClick={() => {
            if (preview) setPreview(false);
            else if (check()) setPreview(true);
          }}
        >
          {preview ? "Back to details" : "Preview invoice"}
        </button>
        <button className="button primary" onClick={save}>
          <Check size={16} />
          Save record
        </button>
      </div>
    </div>
  );
}
