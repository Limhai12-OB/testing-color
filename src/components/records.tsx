"use client";
import { useOptionalAuth } from "./auth-context";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Download,
  ArrowRight,
  Check,
  FileText,
  CreditCard,
  Package,
  Send,
  Mic,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useApp } from "./context";
import { InvoiceEditor, InvoiceDocument } from "./invoice-shared";
import {
  Badge,
  DataTable,
  Money,
  PageHeader,
  Modal,
  Timeline,
  type Column,
} from "./ui";
import {
  branches,
  id,
  today,
  type Collection,
  type RecordRow,
} from "@/lib/store";
const titles: Record<string, [string, string, string]> = {
  transactions: [
    "Transactions",
    "Every movement, one connected ledger.",
    "transaction",
  ],
  expenses: [
    "Expenses",
    "Understand your spending, right down to the receipt.",
    "transaction",
  ],
  invoices: [
    "Invoices",
    "From a great delivery to a payment received.",
    "invoice",
  ],
  estimates: [
    "Estimates",
    "Turn your next opportunity into business.",
    "estimate",
  ],
  bills: ["Bills & payables", "Stay ahead of what your business owes.", "bill"],
  payments: [
    "Payments",
    "A clear record of every payment received.",
    "payment",
  ],
  customers: [
    "Customers",
    "Good relationships start with a complete picture.",
    "customer",
  ],
  items: ["Items & inventory", "The right stock, in the right place.", "item"],
  sales: ["Sales", "Every sale connects your stock and your ledger.", "sale"],
  adjustments: [
    "Stock adjustments",
    "A traceable history of stock movements.",
    "adjustment",
  ],
  team: ["Team", "The people who keep your branches moving.", "invite"],
};
export function Records({ type }: { type: Collection | "expenses" }) {
  const a = useApp();
  const auth = useOptionalAuth();
  const params = useSearchParams();
  const [category, setCategory] = useState(
    params.get("category") || "All categories",
  );
  const [source, setSource] = useState("All sources");
  const [account, setAccount] = useState("All accounts");
  const [date, setDate] = useState("All dates");
  const [nativeCurrency, setNativeCurrency] = useState("All currencies");
  const meta = titles[type];
  const rows = a
    .scope(a.state[type === "expenses" ? "transactions" : type])
    .filter((r) => type !== "expenses" || r.amount < 0)
    .filter((r) => category === "All categories" || r.category === category)
    .filter((r) => source === "All sources" || r.source === source)
    .filter((r) => account === "All accounts" || r.account === account)
    .filter(
      (r) =>
        date === "All dates" ||
        r.date.startsWith(date === "October 2026" ? "2026-10" : "2026-09"),
    )
    .filter(
      (r) =>
        nativeCurrency === "All currencies" || r.currency === nativeCurrency,
    );
  const setFilter = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v && v !== "All statuses") p.set(k, v);
    else p.delete(k);
    a.go(`${type}?${p}`);
  };
  const money = (v: number) => <Money value={v} currency={a.currency} />;
  const columns: Column[] = [
    {
      key: "name",
      label:
        type === "items"
          ? "Item"
          : type === "customers"
            ? "Customer"
            : type === "team"
              ? "Team member"
              : "Description",
      render: (r) => (
        <div className="name-cell">
          <span className="avatar small">
            {r.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <strong>{r.name}</strong>
            <small>
              {type === "customers" || type === "team" ? r.email : r.id}
            </small>
          </span>
        </div>
      ),
    },
  ];
  if (["invoices", "estimates", "bills"].includes(type))
    columns.push(
      { key: "date", label: "Issue date" },
      { key: "due", label: "Due date" },
      {
        key: "amount",
        label: "Total",
        numeric: true,
        render: (r) => money(r.amount),
      },
      {
        key: "paid",
        label: "Paid",
        numeric: true,
        render: (r) => money(r.paid || 0),
      },
      {
        key: "balance",
        label: "Balance",
        numeric: true,
        render: (r) => money(r.amount - (r.paid || 0)),
      },
    );
  else if (type === "items")
    columns.push(
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      {
        key: "amount",
        label: "Price",
        numeric: true,
        render: (r) => money(r.amount),
      },
      {
        key: "cost",
        label: "Cost",
        numeric: true,
        render: (r) => money(r.cost || 0),
      },
      { key: "stock", label: "Stock", numeric: true },
    );
  else if (type === "customers")
    columns.push(
      { key: "phone", label: "Contact" },
      {
        key: "amount",
        label: "Lifetime purchases",
        numeric: true,
        render: (r) =>
          money(
            r.amount +
              a.state.payments
                .filter((p) => p.customer === r.id)
                .reduce((s, p) => s + p.amount, 0),
          ),
      },
      {
        key: "outstanding",
        label: "Outstanding",
        numeric: true,
        render: (r) =>
          money(
            a.state.invoices
              .filter(
                (i) =>
                  i.customer === r.id &&
                  !["Draft", "Cancelled"].includes(i.status),
              )
              .reduce((s, i) => s + i.amount - (i.paid || 0), 0),
          ),
      },
      { key: "date", label: "Last transaction" },
    );
  else if (type === "team") columns.push({ key: "note", label: "Last active" });
  else
    columns.push(
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "account", label: "Account" },
      {
        key: "amount",
        label: "Amount",
        numeric: true,
        render: (r) => (
          <span className={r.amount > 0 ? "green" : ""}>{money(r.amount)}</span>
        ),
      },
      { key: "source", label: "Source" },
    );
  columns.push(
    { key: "branch", label: "Branch" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge>{r.status}</Badge>,
    },
  );
  const total = rows.reduce((s, r) => s + Math.abs(r.amount), 0);
  return (
    <>
      <PageHeader
        title={meta[0]}
        description={meta[1]}
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => {
                const csv = [
                  columns.map((c) => c.label).join(","),
                  ...rows.map((r) =>
                    columns
                      .map(
                        (c) =>
                          `"${String(r[c.key as keyof RecordRow] ?? "").replaceAll('"', '""')}"`,
                      )
                      .join(","),
                  ),
                ].join("\n");
                const url = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv" }),
                );
                const el = document.createElement("a");
                el.href = url;
                el.download = `${type}.csv`;
                el.click();
                URL.revokeObjectURL(url);
                a.notify("CSV exported");
              }}
            >
              <Download size={15} />
              Export
            </button>
            {!(a.role === "Branch Manager" && ["items"].includes(type)) && (
              <button
                className="button primary"
                onClick={() => a.create(meta[2])}
              >
                <Plus size={16} />
                {type === "team" ? "Invite member" : `New ${meta[2]}`}
              </button>
            )}
            {type === "invoices" && (
              <button
                className="button secondary voice-entry-action"
                onClick={() => a.create("voice-invoice")}
              >
                <Mic size={16} />
                Create with Voice
              </button>
            )}
          </>
        }
      />
      <div className="summary-band">
        <div>
          <span>{type === "items" ? "Inventory value" : "Total value"}</span>
          <strong>
            {money(
              type === "items"
                ? rows.reduce((s, r) => s + (r.cost || 0) * (r.stock || 0), 0)
                : total,
            )}
          </strong>
        </div>
        <div>
          <span>
            {type === "items" ? "Units in stock" : "Records in scope"}
          </span>
          <strong>
            {type === "items"
              ? rows.reduce((s, r) => s + (r.stock || 0), 0)
              : rows.length}
          </strong>
        </div>
        <div>
          <span>
            {["invoices", "bills"].includes(type)
              ? "Outstanding balance"
              : "Needs attention"}
          </span>
          <strong>
            {["invoices", "bills"].includes(type)
              ? money(
                  rows
                    .filter((r) => !["Cancelled", "Draft"].includes(r.status))
                    .reduce((s, r) => s + r.amount - (r.paid || 0), 0),
                )
              : rows.filter((r) => /Overdue|Low|Review|Pending/.test(r.status))
                  .length}
          </strong>
        </div>
      </div>
      {type === "bills" && (
        <div className="tabs">
          {["All statuses", "Due today", "Due this week", "Later", "Paid"].map(
            (s) => (
              <button
                key={s}
                className={
                  (params.get("status") || "All statuses") === s ? "active" : ""
                }
                onClick={() => setFilter("status", s)}
              >
                {s}
              </button>
            ),
          )}
        </div>
      )}
      <DataTable
        key={type}
        rows={rows}
        columns={columns}
        onRow={(r) => a.detail(type, r)}
        search={params.get("search") || ""}
        onSearch={(s) => setFilter("search", s)}
        status={params.get("status") || "All statuses"}
        onStatus={(s) => setFilter("status", s)}
        bulkAction={
          ["transactions", "expenses"].includes(type)
            ? (ids) => {
                a.setState((s) => ({
                  ...s,
                  transactions: s.transactions.map((r) =>
                    ids.includes(r.id) ? { ...r, status: "Reviewed" } : r,
                  ),
                }));
                a.notify(`${ids.length} transactions reviewed`);
              }
            : undefined
        }
        extra={
          ["transactions", "expenses"].includes(type) ? (
            <>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setFilter(
                    "category",
                    e.target.value === "All categories" ? "" : e.target.value,
                  );
                }}
              >
                {[
                  "All categories",
                  ...new Set(
                    a.state.transactions.map((r) => r.category || "Other"),
                  ),
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {[
                  "All sources",
                  "Manual",
                  "Receipt OCR",
                  "Bank Import",
                  "Shopify",
                  "WeBill365",
                  "POS",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                {[
                  "All accounts",
                  "ABA Business",
                  "ACLEDA Business",
                  "Wing Wallet",
                  "Main Cash Till",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              >
                {["All dates", "October 2026", "September 2026"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Original currency"
                value={nativeCurrency}
                onChange={(e) => setNativeCurrency(e.target.value)}
              >
                {["All currencies", "USD", "KHR"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </>
          ) : undefined
        }
      />
    </>
  );
}
export function CreateForm({
  type,
  record,
  onClose,
}: {
  type: string;
  record?: RecordRow;
  onClose: () => void;
}) {
  if (type === "invoice" || type === "edit-invoice")
    return (
      <InvoiceEditor
        record={record}
        editing={type === "edit-invoice"}
        onClose={onClose}
      />
    );
  return <LegacyCreateForm type={type} record={record} onClose={onClose} />;
}
function LegacyCreateForm({
  type,
  record,
  onClose,
}: {
  type: string;
  record?: RecordRow;
  onClose: () => void;
}) {
  const a = useApp();
  const auth = useOptionalAuth();
  const [error, setError] = useState("");
  const [lineItems, setLineItems] = useState<
    { description: string; quantity: number; price: number }[]
  >(type === "edit-invoice" ? record?.lineItems || [] : []);
  const [selected, setSelected] = useState(record?.id || "");
  const [quantity, setQuantity] = useState(
    type === "edit-item" ? record?.stock || 0 : 1,
  );
  const [direction, setDirection] = useState("Increase");
  const [formBranch, setFormBranch] = useState(
    record?.branch || a.activeBranch,
  );
  const payment = type === "payment" || type === "bill-payment";
  const adjustment = type === "adjustment";
  const sale = type === "sale";
  const invoice = a
    .scope(a.state[type === "bill-payment" ? "bills" : "invoices"])
    .find((r) => r.id === selected);
  const item = a.scope(a.state.items).find((r) => r.id === selected);
  const [amount, setAmount] = useState(
    record
      ? (record.amount - (record.paid || 0)) *
          (record.currency === "KHR" ? 4100 : 1)
      : 0,
  );
  const title = payment
    ? "Record payment"
    : adjustment
      ? "Adjust stock"
      : type === "invite"
        ? "Invite a branch manager"
        : `${type === "edit-item" ? "Edit" : "New"} ${type.replace("edit-", "")}`;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "");
    if (type === "invite" && auth) {
      const email = String(f.get("email") || "")
        .trim()
        .toLowerCase();
      if (
        auth.data.users.some((u) => u.email === email) ||
        auth.data.invitations.some(
          (i) =>
            i.email === email && i.status === "valid" && i.expires > Date.now(),
        )
      ) {
        setError("This email already has an account or an active invitation.");
        return;
      }
    }
    const inputAmount = Number(f.get("amount"));
    const value =
      String(f.get("currency")) === "KHR" ? inputAmount / 4100 : inputAmount;
    const branch =
      a.role === "Branch Manager"
        ? a.activeBranch
        : (String(f.get("branch") || formBranch) as typeof a.activeBranch);
    const account = String(f.get("account") || "ABA Business");
    const note =
      String(f.get("notes") || "") +
      (payment
        ? ` ? ${String(f.get("method") || "Bank transfer")} ? ${String(f.get("reference") || "No reference")}`
        : "");
    const date = String(f.get("date") || today);
    const activity = [`Created by ${a.state.settings.name}`, note].filter(
      Boolean,
    );
    if (payment) {
      if (
        !invoice ||
        value <= 0 ||
        value > invoice.amount - (invoice.paid || 0)
      ) {
        setError(
          "Enter a positive payment no greater than the remaining balance.",
        );
        return;
      }
      const pid = id("PAY"),
        tid = id("TX");
      a.setState((s) => {
        const key = type === "bill-payment" ? "bills" : "invoices";
        const paid = (invoice.paid || 0) + value;
        return {
          ...s,
          [key]: s[key].map((r) =>
            r.id === invoice.id
              ? {
                  ...r,
                  paid,
                  status: paid >= r.amount ? "Paid" : "Partially Paid",
                  activity: [
                    ...(r.activity || ["Document created"]),
                    `Payment ${pid} received: $${value.toFixed(2)}`,
                  ],
                }
              : r,
          ),
          payments: [
            {
              id: pid,
              name: invoice.name,
              amount: value,
              branch: invoice.branch,
              status: "Completed",
              date,
              linked: invoice.id,
              customer: invoice.customer,
              account,
              note,
              activity,
            },
            ...s.payments,
          ],
          transactions: [
            {
              id: tid,
              name: `${type === "bill-payment" ? "Payment to" : "Payment from"} ${invoice.name}`,
              amount: type === "bill-payment" ? -value : value,
              branch: invoice.branch,
              status: "Completed",
              date,
              account,
              category:
                type === "bill-payment"
                  ? "Supplier payment"
                  : "Invoice payment",
              source: "Manual",
              currency: "USD",
              linked: invoice.id,
              activity,
            },
            ...s.transactions,
          ],
        };
      });
      a.notify("Payment recorded. Balance, history and ledger updated.");
    } else if (adjustment || sale) {
      if (!item) {
        setError("Select an item.");
        return;
      }
      const next = sale
        ? (item.stock || 0) - quantity
        : direction === "Correction"
          ? quantity
          : (item.stock || 0) +
            (direction === "Decrease" ? -quantity : quantity);
      if (next < 0) {
        setError("There is not enough stock for this movement.");
        return;
      }
      const rid = id(sale ? "SALE" : "ADJ");
      a.setState((s) => ({
        ...s,
        items: s.items.map((r) =>
          r.id === item.id
            ? {
                ...r,
                stock: next,
                status: next < 20 ? "Low stock" : "In stock",
                activity: [
                  ...(r.activity || []),
                  `${quantity} units · ${sale ? "Sale" : direction} · ${note}`,
                ],
              }
            : r,
        ),
        [sale ? "sales" : "adjustments"]: [
          {
            id: rid,
            name: item.name,
            branch: item.branch,
            amount: sale ? quantity * item.amount : next - (item.stock || 0),
            status: "Completed",
            date,
            linked: item.id,
            note: `${quantity} units · ${note}`,
            activity,
          },
          ...s[sale ? "sales" : "adjustments"],
        ],
        transactions: sale
          ? [
              {
                id: id("TX"),
                name: `Item sale · ${item.name}`,
                branch: item.branch,
                amount: quantity * item.amount,
                date,
                status: "Completed",
                category: "Sales",
                account,
                source: "POS",
                linked: rid,
                currency: "USD",
                activity,
              },
              ...s.transactions,
            ]
          : s.transactions,
      }));
      a.notify(
        sale
          ? "Sale recorded. Stock and ledger updated."
          : "Stock adjustment recorded.",
      );
    } else {
      const map: Record<string, Collection> = {
        transaction: "transactions",
        invoice: "invoices",
        "edit-invoice": "invoices",
        estimate: "estimates",
        bill: "bills",
        customer: "customers",
        item: "items",
        "edit-item": "items",
        invite: "team",
      };
      const key = map[type];
      if (!key) return;
      if (type === "edit-invoice" && value < (record?.paid || 0)) {
        setError(
          "The invoice total cannot be less than payments already received.",
        );
        return;
      }
      const customer = a
        .scope(a.state.customers)
        .find((c) => c.id === f.get("customer"));
      if (["invoice", "estimate", "edit-invoice"].includes(type) && !customer) {
        setError("Choose a customer in your current branch scope.");
        return;
      }
      const r: RecordRow = {
        id:
          (["edit-item", "edit-invoice"].includes(type)
            ? record?.id
            : undefined) ||
          id(
            type === "invoice"
              ? "INV"
              : type === "estimate"
                ? "EST"
                : type === "bill"
                  ? "BILL"
                  : type === "customer"
                    ? "CUS"
                    : type === "item"
                      ? "ITM"
                      : type === "invite"
                        ? "USR"
                        : "TX",
          ),
        name: customer?.name || name,
        branch: customer?.branch || branch,
        amount:
          type === "transaction" && f.get("direction") === "Expense"
            ? -value
            : value || 0,
        date,
        status:
          type === "edit-invoice"
            ? record?.status || "Draft"
            : type === "invite"
              ? "Pending Invitation"
              : ["invoice", "estimate", "edit-invoice"].includes(type)
                ? "Draft"
                : type === "bill"
                  ? "Due this week"
                  : type === "customer"
                    ? "Active"
                    : type.includes("item")
                      ? quantity < 20
                        ? "Low stock"
                        : "In stock"
                      : "Completed",
        paid: type === "edit-invoice" ? record?.paid || 0 : 0,
        due: String(f.get("due") || "2026-10-12"),
        customer: customer?.id,
        category: String(f.get("category") || "Sales"),
        account,
        source: "Manual",
        currency: String(f.get("currency") || "USD"),
        email: String(f.get("email") || ""),
        phone: String(f.get("phone") || ""),
        stock: quantity,
        cost: Number(f.get("cost")) || 0,
        sku: String(f.get("sku") || ""),
        note,
        activity,
        lineItems: lineItems.length
          ? lineItems.map((l) => ({
              ...l,
              price:
                String(f.get("currency")) === "KHR" ? l.price / 4100 : l.price,
            }))
          : undefined,
      };
      if (type === "invite" && auth) {
        const token = crypto.randomUUID();
        r.email = r.email?.trim().toLowerCase();
        r.note = `/invite/${token}`;
        auth.setData((d) => ({
          ...d,
          invitations: [
            ...d.invitations,
            {
              token,
              email: r.email!,
              business: a.state.settings.business,
              branch: r.branch,
              invitedBy: a.state.settings.name,
              expires: Date.now() + 604800000,
              status: "valid",
            },
          ],
        }));
      }
      a.setState((s) => ({
        ...s,
        [key]: ["edit-item", "edit-invoice"].includes(type)
          ? s[key].map((x) => (x.id === r.id ? r : x))
          : [r, ...s[key]],
      }));
      a.notify(
        `${type === "invite" ? "Invitation simulated" : type === "edit-item" ? "Item updated" : "Record created"} successfully`,
      );
    }
    onClose();
  };
  return (
    <form onSubmit={submit} className="record-form">
      <p className="form-intro">
        {payment
          ? "The payment will update the document balance and post to your account ledger."
          : adjustment
            ? "Every adjustment is recorded in your inventory history."
            : "Details stay connected across your business workspace."}
      </p>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {payment ? (
        <>
          <label>
            {type === "bill-payment" ? "Bill" : "Invoice"}
            <select
              required
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                const r = a.state[
                  type === "bill-payment" ? "bills" : "invoices"
                ].find((r) => r.id === e.target.value);
                setAmount(
                  r
                    ? (r.amount - (r.paid || 0)) *
                        (r.currency === "KHR" ? 4100 : 1)
                    : 0,
                );
              }}
            >
              <option value="">Select document</option>
              {a
                .scope(a.state[type === "bill-payment" ? "bills" : "invoices"])
                .filter(
                  (r) => !["Paid", "Cancelled", "Draft"].includes(r.status),
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} · {r.name}
                  </option>
                ))}
            </select>
          </label>
          {invoice && (
            <div className="form-info">
              Remaining balance{" "}
              <strong>
                <Money value={invoice.amount - (invoice.paid || 0)} />
              </strong>
              <small>{invoice.branch}</small>
            </div>
          )}
          <label>
            Amount ({invoice?.currency === "KHR" ? "KHR" : "USD"})
            <input
              name="amount"
              type="number"
              min={invoice?.currency === "KHR" ? 1 : 0.01}
              max={
                invoice
                  ? (invoice.amount - (invoice.paid || 0)) *
                    (invoice.currency === "KHR" ? 4100 : 1)
                  : undefined
              }
              step={invoice?.currency === "KHR" ? 1 : 0.01}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <input
            type="hidden"
            name="currency"
            value={invoice?.currency === "KHR" ? "KHR" : "USD"}
          />
        </>
      ) : adjustment || sale ? (
        <>
          <label>
            Item
            <select
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select item and branch</option>
              {a.scope(a.state.items).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.branch}
                </option>
              ))}
            </select>
          </label>
          {adjustment && (
            <label>
              Adjustment type
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                {["Increase", "Decrease", "Correction"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Quantity
            <input
              type="number"
              required
              min={adjustment && direction === "Correction" ? 0 : 1}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          {item && (
            <div className="form-info">
              Current stock: {item.stock}
              <ArrowRight size={16} />
              <strong>
                Result:{" "}
                {sale
                  ? (item.stock || 0) - quantity
                  : direction === "Correction"
                    ? quantity
                    : (item.stock || 0) +
                      (direction === "Decrease" ? -quantity : quantity)}
              </strong>
            </div>
          )}
        </>
      ) : (
        <>
          {["invoice", "estimate", "edit-invoice"].includes(type) ? (
            <label>
              Customer
              <select
                name="customer"
                required
                defaultValue={
                  type === "edit-invoice"
                    ? record?.customer || ""
                    : record?.id || ""
                }
              >
                <option value="">Select customer</option>
                {a.scope(a.state.customers).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              {type === "bill"
                ? "Supplier"
                : type === "transaction"
                  ? "Description"
                  : "Name"}
              <input
                name="name"
                required
                defaultValue={record?.name}
                placeholder={
                  type === "transaction"
                    ? "e.g. Morning café sales"
                    : "Enter name"
                }
              />
            </label>
          )}
          {!["customer", "invite"].includes(type) && (
            <div className="form-grid">
              <label>
                {type.includes("item") ? "Unit price" : "Amount"}
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={
                    ["edit-item", "edit-invoice"].includes(type)
                      ? record?.amount
                      : undefined
                  }
                  readOnly={lineItems.length > 0}
                  value={
                    lineItems.length
                      ? lineItems.reduce((s, l) => s + l.quantity * l.price, 0)
                      : undefined
                  }
                />
              </label>
              <label>
                Currency
                <select name="currency">
                  <option>USD</option>
                  <option>KHR</option>
                </select>
              </label>
            </div>
          )}
          {["invoice", "estimate", "bill", "edit-invoice"].includes(type) && (
            <div className="line-items-editor">
              {lineItems.map((line, i) => (
                <div className="line-item-editor" key={i}>
                  <label>
                    Description
                    <input
                      required
                      value={line.description}
                      onChange={(e) =>
                        setLineItems((ls) =>
                          ls.map((l, j) =>
                            j === i ? { ...l, description: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Qty
                    <input
                      required
                      min="1"
                      step="1"
                      type="number"
                      value={line.quantity}
                      onChange={(e) =>
                        setLineItems((ls) =>
                          ls.map((l, j) =>
                            j === i
                              ? { ...l, quantity: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Unit price
                    <input
                      required
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={line.price}
                      onChange={(e) =>
                        setLineItems((ls) =>
                          ls.map((l, j) =>
                            j === i
                              ? { ...l, price: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Remove line item"
                    onClick={() =>
                      setLineItems((ls) => ls.filter((_, j) => j !== i))
                    }
                  >
                    ?
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setLineItems((ls) => [
                    ...ls,
                    { description: "", quantity: 1, price: 0 },
                  ])
                }
              >
                <Plus size={14} />
                Add line item
              </button>
            </div>
          )}
          {type === "transaction" && (
            <label>
              Type
              <select name="direction">
                <option>Income</option>
                <option>Expense</option>
              </select>
            </label>
          )}
          {["customer", "invite"].includes(type) && (
            <>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                />
              </label>
              {type === "customer" && (
                <label>
                  Phone
                  <input name="phone" type="tel" placeholder="+855" />
                </label>
              )}
            </>
          )}
          {type.includes("item") && (
            <>
              <div className="form-grid">
                <label>
                  SKU
                  <input name="sku" required defaultValue={record?.sku} />
                </label>
                <label>
                  Unit cost (USD)
                  <input
                    name="cost"
                    min="0"
                    type="number"
                    step="0.01"
                    defaultValue={record?.cost}
                  />
                </label>
              </div>
              <label>
                Opening stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
            </>
          )}
          {a.role === "Business Owner" ? (
            <label>
              Branch
              <select
                name="branch"
                value={formBranch}
                onChange={(e) =>
                  setFormBranch(e.target.value as typeof formBranch)
                }
              >
                {a.state.locations
                  .filter((l) => l.active)
                  .map((l) => (
                    <option key={l.name}>{l.name}</option>
                  ))}
              </select>
            </label>
          ) : (
            <div className="form-info">Branch · {a.activeBranch}</div>
          )}
        </>
      )}
      {(payment || type === "transaction" || sale) && (
        <label>
          Account
          <select name="account">
            <option>ABA Business</option>
            <option>ACLEDA Business</option>
            <option>Wing Wallet</option>
            <option>Main Cash Till</option>
          </select>
        </label>
      )}
      {payment && (
        <div className="form-grid">
          <label>
            Payment method
            <select name="method">
              <option>Bank transfer</option>
              <option>Cash</option>
              <option>Card</option>
            </select>
          </label>
          <label>
            Reference
            <input name="reference" placeholder="Bank reference" />
          </label>
        </div>
      )}
      {!["invite", "customer"].includes(type) && (
        <label>
          {["invoice", "estimate", "bill", "edit-invoice"].includes(type)
            ? "Issue date"
            : "Date"}
          <input type="date" name="date" required defaultValue={today} />
        </label>
      )}
      {["invoice", "estimate", "bill", "edit-invoice"].includes(type) && (
        <label>
          Due date
          <input
            type="date"
            name="due"
            min={today}
            required
            defaultValue={record?.due || "2026-10-12"}
          />
        </label>
      )}
      {["transaction", "bill", "item", "edit-item"].includes(type) && (
        <label>
          Category
          <select name="category">
            {[
              "Sales",
              "Ingredients",
              "Inventory",
              "Utilities",
              "Packaging",
              "Rent",
              "Other",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        {adjustment ? "Reason" : "Notes"}
        <textarea
          name="notes"
          rows={2}
          required={adjustment}
          placeholder={
            adjustment ? "Why is this stock changing?" : "Add a little context…"
          }
        />
      </label>
      <div className="form-footer">
        <button className="button secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          <Check size={16} />
          {payment
            ? "Record payment"
            : adjustment
              ? "Confirm adjustment"
              : type === "invite"
                ? "Send demo invitation"
                : "Save record"}
        </button>
      </div>
    </form>
  );
}
export function RecordDetail({
  type,
  record,
  onClose,
}: {
  type: string;
  record: RecordRow;
  onClose: () => void;
}) {
  const a = useApp();
  const auth = useOptionalAuth();
  const key = type === "expenses" ? "transactions" : type;
  const r =
    (a.state[key as Collection] as RecordRow[] | undefined)?.find(
      (x) => x.id === record.id,
    ) || record;
  const [tab, setTab] = useState("Overview");
  const [confirm, setConfirm] = useState("");
  const related = a
    .scope(a.state.payments)
    .filter((p) => p.linked === r.id || p.customer === r.id);
  const invoices = a.scope(a.state.invoices).filter((i) => i.customer === r.id);
  const change = (status: string) => {
    if (type === "team" && auth && status === "Inactive")
      auth.setData((d) => ({
        ...d,
        users: d.users.map((u) =>
          u.email === r.email ? { ...u, status: "INACTIVE" } : u,
        ),
        invitations: d.invitations.map((i) =>
          i.email === r.email ? { ...i, status: "deactivated" } : i,
        ),
      }));
    a.setState((s) => ({
      ...s,
      [key]: s[key as Collection].map((x) =>
        x.id === r.id
          ? {
              ...x,
              status,
              activity: [
                ...(x.activity || ["Record created"]),
                `Status changed to ${status}`,
              ],
            }
          : x,
      ),
    }));
    a.notify(`Marked ${status.toLowerCase()}`);
  };
  const convert = () => {
    const inv = {
      ...r,
      id: id("INV"),
      status: "Draft",
      paid: 0,
      linked: r.id,
      due: "2026-10-19",
      activity: [`Converted from ${r.id}`],
    };
    a.setState((s) => ({
      ...s,
      invoices: [inv, ...s.invoices],
      estimates: s.estimates.map((x) =>
        x.id === r.id ? { ...x, status: "Converted", linked: inv.id } : x,
      ),
    }));
    a.notify("Estimate converted. Your invoice is ready to review.");
    onClose();
    a.go(`invoices?search=${inv.id}`);
  };
  return (
    <div className="detail-body">
      <div className="detail-title">
        <span className="record-symbol">
          <FileText size={24} />
        </span>
        <div>
          <small>{r.id}</small>
          <h2>{r.name}</h2>
        </div>
        <Badge>{r.status}</Badge>
      </div>
      <div className="detail-total">
        <small>{type === "items" ? "Unit price" : "Total amount"}</small>
        <Money value={r.amount} currency={a.currency} />
      </div>
      <div className="detail-actions">
        {["invoices", "bills"].includes(type) &&
          !["Paid", "Cancelled", "Draft"].includes(r.status) && (
            <button
              className="button primary"
              onClick={() => {
                onClose();
                a.create(type === "bills" ? "bill-payment" : "payment", r);
              }}
            >
              <CreditCard size={15} />
              Record payment
            </button>
          )}
        {["invoices", "estimates"].includes(type) && r.status === "Draft" && (
          <button className="button primary" onClick={() => change("Sent")}>
            <Send size={15} />
            Simulate send
          </button>
        )}
        {type === "estimates" && r.status === "Sent" && (
          <>
            <button
              className="button secondary"
              onClick={() => change("Accepted")}
            >
              Simulate acceptance
            </button>
            <button
              className="button secondary"
              onClick={() => change("Rejected")}
            >
              Reject
            </button>
          </>
        )}
        {type === "estimates" && r.status === "Accepted" && (
          <button className="button primary" onClick={convert}>
            Convert to invoice <ArrowRight size={15} />
          </button>
        )}
        {type === "customers" && (
          <>
            <button
              className="button primary"
              onClick={() => {
                onClose();
                a.create("invoice", r);
              }}
            >
              Create invoice
            </button>
            <button
              className="button secondary"
              onClick={() => {
                onClose();
                a.create("estimate", r);
              }}
            >
              Create estimate
            </button>
          </>
        )}
        {type === "items" && (
          <>
            <button
              className="button primary"
              onClick={() => {
                onClose();
                a.create("adjustment", r);
              }}
            >
              Adjust stock
            </button>
            {a.role === "Business Owner" && (
              <button
                className="button secondary"
                onClick={() => {
                  onClose();
                  a.create("edit-item", r);
                }}
              >
                Edit item
              </button>
            )}
            <button
              className="button secondary"
              onClick={() => {
                onClose();
                a.create("sale", r);
              }}
            >
              Record sale
            </button>
          </>
        )}
        {type === "invoices" && (
          <>
            {!["Paid", "Cancelled"].includes(r.status) && (
              <button
                className="button secondary"
                onClick={() => {
                  onClose();
                  a.create("edit-invoice", r);
                }}
              >
                Edit
              </button>
            )}
            <button className="button secondary" onClick={() => window.print()}>
              <Download size={15} />
              Print / PDF
            </button>
            <button
              className="button secondary"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `${location.origin}/invoices?search=${r.id}`,
                );
                a.notify("Invoice link copied");
              }}
            >
              Copy link
            </button>
            {!["Paid", "Cancelled"].includes(r.status) && (
              <button
                className="button quiet"
                onClick={() =>
                  setConfirm(
                    "Cancel this invoice? It will be removed from outstanding receivables; recorded payments remain in the ledger.",
                  )
                }
              >
                Cancel invoice
              </button>
            )}
          </>
        )}
        {type === "team" && (
          <button
            className="button secondary"
            onClick={() =>
              setConfirm(
                "Deactivate this member? They will lose access to their assigned branch in this demo.",
              )
            }
          >
            Deactivate
          </button>
        )}
      </div>
      <div className="tabs">
        {[
          "Overview",
          ...(type === "customers" ? ["Invoices"] : []),
          ...(type === "items"
            ? ["Stock by Branch", "Sales History", "Adjustments"]
            : ["Payments"]),
          "Activity",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" ? (
        <>
          {type === "invoices" && <InvoiceDocument record={r} />}
          {r.transcript && (
            <details className="saved-voice-transcript">
              <summary>
                <Mic size={15} />
                Created via Voice · transcript available
              </summary>
              <blockquote>{r.transcript}</blockquote>
              {r.originalTranscript &&
                r.originalTranscript !== r.transcript && (
                  <details>
                    <summary>Original simulated recording</summary>
                    <blockquote>{r.originalTranscript}</blockquote>
                  </details>
                )}
              <small>
                {r.date} · {r.source} · reviewed before creation
              </small>
            </details>
          )}
          {["estimates", "bills"].includes(type) && (
            <div className="invoice-paper">
              <div className="invoice-paper-head">
                <div>
                  <strong>{a.state.settings.business}</strong>
                  <small>{r.branch} ? Cambodia</small>
                </div>
                <div>
                  <h3>
                    {type === "invoices"
                      ? "INVOICE"
                      : type === "estimates"
                        ? "ESTIMATE"
                        : "BILL"}
                  </h3>
                  <small>{r.id}</small>
                </div>
              </div>
              <p>
                {type === "bills" ? "SUPPLIER" : "BILL TO"}
                <br />
                <strong>{r.name}</strong>
                <br />
                Issued {r.date} ? Due {r.due || "On receipt"}
              </p>
              {(
                r.lineItems || [
                  {
                    description: r.note || "Products & services",
                    quantity: 1,
                    price: r.amount,
                  },
                ]
              ).map((line, i) => (
                <div className="invoice-line" key={i}>
                  <span>
                    {line.description}
                    <small>
                      {line.quantity} ?{" "}
                      <Money value={line.price} currency={a.currency} />
                    </small>
                  </span>
                  <Money
                    value={line.quantity * line.price}
                    currency={a.currency}
                  />
                </div>
              ))}
              <div className="invoice-line total">
                <span>Total</span>
                <Money value={r.amount} currency={a.currency} />
              </div>
            </div>
          )}
          <dl className="detail-grid">
            <div>
              <dt>Branch</dt>
              <dd>{r.branch}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{r.date}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{r.source || "Manual"}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{r.account || "—"}</dd>
            </div>
            {["invoices", "bills"].includes(type) && (
              <>
                <div>
                  <dt>Paid</dt>
                  <dd>
                    <Money value={r.paid || 0} currency={a.currency} />
                  </dd>
                </div>
                <div>
                  <dt>Balance due</dt>
                  <dd>
                    <Money
                      value={r.amount - (r.paid || 0)}
                      currency={a.currency}
                    />
                  </dd>
                </div>
              </>
            )}
            {r.email && (
              <div>
                <dt>Email</dt>
                <dd>{r.email}</dd>
              </div>
            )}
            {r.stock !== undefined && type === "items" && (
              <div>
                <dt>Stock on hand</dt>
                <dd>{r.stock} units</dd>
              </div>
            )}
          </dl>
          {type === "team" && (
            <label className="field">
              Assigned branch
              <select
                value={r.branch}
                onChange={(e) => {
                  const b = e.target.value as typeof r.branch;
                  a.setState((s) => ({
                    ...s,
                    team: s.team.map((t) =>
                      t.id === r.id ? { ...t, branch: b } : t,
                    ),
                  }));
                  auth?.setData((d) => ({
                    ...d,
                    users: d.users.map((u) =>
                      u.email === r.email ? { ...u, assignedBranch: b } : u,
                    ),
                    invitations: d.invitations.map((i) =>
                      i.email === r.email ? { ...i, branch: b } : i,
                    ),
                  }));
                  a.notify("Branch assignment updated");
                }}
              >
                {a.state.locations
                  .filter((l) => l.active)
                  .map((l) => (
                    <option key={l.name}>{l.name}</option>
                  ))}
              </select>
            </label>
          )}
          {type === "team" && r.note?.startsWith("/invite/") ? (
            <div className="note-box">
              <label className="field">
                Invitation link
                <input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}${r.note}`
                      : r.note
                  }
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${location.origin}${r.note}`,
                    );
                    a.notify("Invitation link copied");
                  } catch {
                    a.notify("Select and copy the invitation link above.");
                  }
                }}
              >
                Copy invitation link
              </button>
              <p>
                Share this demo link, then sign out to test account setup in
                this browser. No email is sent.
              </p>
            </div>
          ) : (
            r.note && <div className="note-box">{r.note}</div>
          )}
          {r.linked && (
            <div className="linked-record">
              <span>Connected record</span>
              <button
                onClick={() => {
                  onClose();
                  a.go(
                    `${r.linked?.startsWith("EST") ? "estimates" : r.linked?.startsWith("INV") ? "invoices" : r.linked?.startsWith("BILL") ? "bills" : r.linked?.startsWith("ITM") ? "items" : r.linked?.startsWith("SALE") ? "sales" : r.linked?.startsWith("IMP") ? "imports" : "transactions"}?search=${r.linked}`,
                  );
                }}
              >
                {r.linked}
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          {r.source === "Receipt OCR" && (
            <div className="receipt-preview mini">
              <strong>{r.name}</strong>
              <p>Receipt · {r.date}</p>
              <hr />
              <p>
                Total <Money value={Math.abs(r.amount)} currency={a.currency} />
              </p>
              <small>Demo receipt · extracted and reviewed</small>
            </div>
          )}
          {["transactions", "expenses"].includes(type) && (
            <div className="note-box">
              Account impact:{" "}
              <strong>
                <Money value={r.amount} currency={a.currency} />
              </strong>{" "}
              posted to {r.account}. Included in dashboard, reports and
              forecasts.
            </div>
          )}
          {type === "customers" && (
            <div className="summary-band">
              <div>
                <span>Outstanding</span>
                <strong>
                  <Money
                    value={invoices.reduce(
                      (s, i) => s + i.amount - (i.paid || 0),
                      0,
                    )}
                    currency={a.currency}
                  />
                </strong>
              </div>
              <div>
                <span>Lifetime value</span>
                <strong>
                  <Money value={r.amount} currency={a.currency} />
                </strong>
              </div>
            </div>
          )}
        </>
      ) : tab === "Activity" ? (
        <Timeline
          events={
            r.activity || [
              "Record created by Vanda Sok",
              `Assigned to ${r.branch}`,
              `Current status: ${r.status}`,
            ]
          }
        />
      ) : tab === "Invoices" ? (
        <div>
          {invoices.map((i) => (
            <button
              className="linked-row"
              key={i.id}
              onClick={() => {
                onClose();
                a.go(`invoices?search=${i.id}`);
              }}
            >
              {i.id}
              <Money value={i.amount} />
              <Badge>{i.status}</Badge>
            </button>
          ))}
        </div>
      ) : tab === "Stock by Branch" ? (
        a
          .scope(a.state.items)
          .filter((i) => i.sku === r.sku)
          .map((i) => (
            <div className="linked-row" key={i.id}>
              {i.branch}
              <strong>{i.stock} units</strong>
              <Badge>{i.status}</Badge>
            </div>
          ))
      ) : tab === "Sales History" || tab === "Adjustments" ? (
        a
          .scope(a.state[tab === "Sales History" ? "sales" : "adjustments"])
          .filter((x) => x.linked === r.id)
          .map((x) => (
            <div className="linked-row" key={x.id}>
              {x.id}
              <span>{x.note}</span>
            </div>
          ))
      ) : (
        <div>
          {related.length ? (
            related.map((p) => (
              <button
                className="linked-row"
                key={p.id}
                onClick={() => {
                  onClose();
                  a.go(`payments?search=${p.id}`);
                }}
              >
                {p.id}
                <Money value={p.amount} currency={a.currency} />
                <ArrowUpRight size={15} />
              </button>
            ))
          ) : (
            <p className="muted pad">
              No payments recorded for this record yet.
            </p>
          )}
        </div>
      )}
      {confirm && (
        <Modal title="Confirm action" onClose={() => setConfirm("")}>
          <div className="pad">
            <p>{confirm}</p>
            <div className="form-footer">
              <button
                className="button secondary"
                onClick={() => setConfirm("")}
              >
                Keep record
              </button>
              <button
                className="button danger"
                onClick={() => {
                  change(type === "team" ? "Inactive" : "Cancelled");
                  setConfirm("");
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
