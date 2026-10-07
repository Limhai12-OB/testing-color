"use client";
import { useEffect, useState } from "react";
import {
  Upload,
  ArrowRight,
  Check,
  FileText,
  Sparkles,
  ScanLine,
  LoaderCircle,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { useApp } from "./context";
import { Badge, DataTable, Money, PageHeader } from "./ui";
import { branches, id, today } from "@/lib/store";
export function ImportCenter({ receipt = false }: { receipt?: boolean }) {
  const a = useApp();
  const [flow, setFlow] = useState(receipt);
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(receipt ? "Receipts" : "Bank Statement");
  const [file, setFile] = useState("");
  const [preview, setPreview] = useState("");
  const [merchant, setMerchant] = useState("Mekong Fresh Supply");
  const [total, setTotal] = useState(486);
  const [currency, setCurrency] = useState("USD");
  const [branch, setBranch] = useState(a.activeBranch);
  const [category, setCategory] = useState("Ingredients");
  const [date, setDate] = useState(today);
  const [result, setResult] = useState("");
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState("");
  const [mapping, setMapping] = useState(["Date", "Description", "Amount"]);
  const isReceipt = source === "Receipts" || source === "Payment Slip";
  const recordCount = ["Bank Statement", "Transactions"].includes(source)
    ? 3
    : 1;
  const steps = isReceipt
    ? [
        "Upload",
        "Processing",
        "Review extraction",
        "Categorize",
        "Confirm",
        "Completed",
      ]
    : [
        "Source & upload",
        "AI detection",
        "Field mapping",
        "Validation",
        "Review & import",
        "Completed",
      ];
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => setStep(2), 1700);
      return () => clearTimeout(timer);
    }
  }, [step]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const finish = () => {
    const rid = id("IMP");
    const tid = id("TX");
    const itemId = id("ITM");
    const saleId = id("SALE");
    const amount = currency === "KHR" ? total / 4100 : total;
    const rec = {
      id: tid,
      name: merchant,
      amount: -amount,
      branch,
      date,
      status: "Completed",
      category,
      source: isReceipt ? "Receipt OCR" : "Bank Import",
      account: "ABA Business",
      currency,
      linked: rid,
      activity: [
        `${isReceipt ? "Receipt extracted" : "Statement imported"} from ${file || "demo file"}`,
        "Reviewed and confirmed by Vanda Sok",
      ],
    };
    a.setState((s) => {
      const imported = {
        id: rid,
        name: file || `${source.toLowerCase().replaceAll(" ", "_")}_demo.csv`,
        amount: recordCount,
        branch,
        date,
        status: "Completed",
        source,
        linked: ["Items", "Supplier Catalog"].includes(source)
          ? itemId
          : source === "Sales"
            ? saleId
            : tid,
        note: "Reviewed and confirmed",
      };
      if (isReceipt || ["Transactions", "Bank Statement"].includes(source))
        return {
          ...s,
          transactions: [
            rec,
            ...(!isReceipt
              ? [
                  {
                    ...rec,
                    id: id("TXA"),
                    name: "Morning café sales",
                    amount: 640,
                    category: "Sales",
                  },
                  {
                    ...rec,
                    id: id("TXB"),
                    name: "Packaging supplies",
                    amount: -94,
                    category: "Packaging",
                  },
                ]
              : []),
            ...s.transactions,
          ],
          imports: [imported, ...s.imports],
        };
      if (source === "Items" || source === "Supplier Catalog")
        return {
          ...s,
          items: [
            {
              id: itemId,
              name: "Imported house blend",
              amount: 14,
              branch,
              date,
              status: "In stock",
              stock: 24,
              cost: 7,
              sku: id("SKU"),
              category: "Coffee",
              linked: rid,
            },
            ...s.items,
          ],
          imports: [imported, ...s.imports],
        };
      const item = s.items.find((i) => i.branch === branch);
      return {
        ...s,
        sales: [
          {
            id: saleId,
            name: "Imported counter sales",
            amount: 140,
            branch,
            date,
            status: "Completed",
            linked: item?.id,
            source: "Import",
          },
          ...s.sales,
        ],
        transactions: [
          { ...rec, amount: 140, name: "Imported sales", category: "Sales" },
          ...s.transactions,
        ],
        items: s.items.map((i) =>
          i.id === item?.id
            ? { ...i, stock: Math.max(0, (i.stock || 0) - 1) }
            : i,
        ),
        imports: [imported, ...s.imports],
      };
    });
    setResult(tid);
    setStep(5);
    a.notify("Import completed. Connected records updated.");
  };
  return (
    <>
      <PageHeader
        eyebrow={flow ? "IMPORT CENTER / NEW IMPORT" : undefined}
        title={receipt ? "Receipt capture" : "Import center"}
        description="From a source file to a complete financial picture."
        actions={
          !flow ? (
            <button
              className="button primary"
              onClick={() => {
                setFlow(true);
                setStep(0);
              }}
            >
              <Upload size={16} />
              New import
            </button>
          ) : (
            <button className="button secondary" onClick={() => setFlow(false)}>
              View import history
            </button>
          )
        }
      />
      {!flow ? (
        <>
          <div className="import-sources">
            {[
              "Bank Statement",
              "Transactions",
              "Items",
              "Sales",
              "Receipts",
              "Payment Slip",
              "Supplier Catalog",
            ].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSource(s);
                  setFlow(true);
                  setStep(0);
                }}
              >
                <span className="tiny-icon">
                  {s === "Receipts" ? (
                    <ScanLine size={21} />
                  ) : (
                    <FileText size={21} />
                  )}
                </span>
                <strong>{s}</strong>
                <span>
                  Start import <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
          <h2 className="section-title">Import history</h2>
          <DataTable
            rows={a.scope(a.state.imports)}
            columns={[
              { key: "name", label: "Filename" },
              { key: "source", label: "Type" },
              { key: "branch", label: "Branch" },
              { key: "amount", label: "Records", numeric: true },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge>{r.status}</Badge>,
              },
              { key: "date", label: "Imported" },
              { key: "by", label: "Imported by", render: () => "Vanda Sok" },
            ]}
            onRow={(r) => {
              if (r.status === "Needs Review") a.go("reconciliation");
              else a.detail("imports", r);
            }}
          />
        </>
      ) : (
        <>
          <div className="stepper">
            {steps.map((s, i) => (
              <div
                key={s}
                className={i === step ? "current" : i < step ? "done" : ""}
              >
                <span>{i < step ? <Check size={13} /> : i + 1}</span>
                <small>{s}</small>
              </div>
            ))}
          </div>
          <div className="flow-content">
            {step === 0 ? (
              <>
                <div className="flow-heading">
                  <span className="large-icon">
                    <Upload size={26} />
                  </span>
                  <h2>
                    {receipt
                      ? "A receipt today. A clear ledger tomorrow."
                      : "Bring your records together"}
                  </h2>
                  <p>
                    Choose a file or explore the full workflow with a sample.
                  </p>
                </div>
                <div className="form-grid">
                  <label>
                    Import type
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    >
                      {[
                        "Bank Statement",
                        "Transactions",
                        "Items",
                        "Sales",
                        "Receipts",
                        "Payment Slip",
                        "Supplier Catalog",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Branch
                    {a.role === "Business Owner" ? (
                      <select
                        value={branch}
                        onChange={(e) =>
                          setBranch(e.target.value as typeof branch)
                        }
                      >
                        {a.state.locations
                          .filter((l) => l.active)
                          .map((l) => (
                            <option key={l.name}>{l.name}</option>
                          ))}
                      </select>
                    ) : (
                      <input readOnly value={branch} />
                    )}
                  </label>
                </div>
                <label className="upload-zone">
                  <Upload size={30} />
                  <strong>
                    {file || "Click to upload or capture a receipt"}
                  </strong>
                  <span>CSV, Excel, PDF, JPG or PNG · up to 10 MB</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png"
                    capture={receipt ? "environment" : undefined}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 10485760) {
                          setError("Choose a file smaller than 10 MB.");
                          return;
                        }
                        setFile(f.name);
                        setError("");
                        if (f.type.startsWith("image/"))
                          setPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                </label>
                {error && <p className="inline-error">{error}</p>}
                <p className="demo-note">
                  Demo processing uses sample records. Uploaded files stay on
                  your device.
                </p>
                <div className="form-footer">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setFile(
                        isReceipt
                          ? "Mekong_Fresh_receipt.jpg"
                          : "ABA_October_2026.csv",
                      );
                      setStep(1);
                    }}
                  >
                    Use sample file
                  </button>
                  <button
                    className="button primary"
                    disabled={!file}
                    onClick={() => setStep(1)}
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : step === 1 ? (
              <div className="processing">
                <LoaderCircle className="spin" size={35} />
                <h2>
                  {isReceipt
                    ? "Reading your receipt…"
                    : "Detecting your file structure…"}
                </h2>
                <p>Identifying amounts, dates and connected records.</p>
                <div className="progress-track">
                  <span />
                </div>
                <small>Simulated processing · your file stays private</small>
              </div>
            ) : step === 2 ? (
              isReceipt ? (
                <>
                  <h2>Review extracted information</h2>
                  <p className="muted">
                    Check the highlighted field before continuing.
                  </p>
                  <div className="ocr-grid">
                    <div className="receipt-preview">
                      {preview ? (
                        <img src={preview} alt="Uploaded receipt" />
                      ) : (
                        <>
                          <strong>MEKONG FRESH</strong>
                          <small>Phnom Penh · Cambodia</small>
                          <p>RECEIPT #08321</p>
                          <hr />
                          <p>
                            Fresh produce <span>$286.00</span>
                          </p>
                          <p>
                            Dairy & ingredients <span>$200.00</span>
                          </p>
                          <hr />
                          <p>
                            <strong>TOTAL</strong>
                            <strong>$486.00</strong>
                          </p>
                          <small>Thank you for supporting local.</small>
                        </>
                      )}
                    </div>
                    <div className="record-form">
                      <label>
                        Merchant <span className="green">98% confidence</span>
                        <input
                          value={merchant}
                          onChange={(e) => setMerchant(e.target.value)}
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          Date
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                          />
                        </label>
                        <label>
                          Currency
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                          >
                            <option>USD</option>
                            <option>KHR</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Total · 96% confidence
                        <input
                          type="number"
                          min="0.01"
                          value={total}
                          onChange={(e) => setTotal(Number(e.target.value))}
                        />
                      </label>
                      <label className="low-confidence">
                        Category · 61% confidence · needs review
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {[
                            "Ingredients",
                            "Inventory",
                            "Utilities",
                            "Packaging",
                            "Other",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Description
                        <input
                          value={merchant + " · receipt purchase"}
                          readOnly
                        />
                      </label>
                    </div>
                  </div>
                  <div className="form-footer">
                    <button
                      className="button primary"
                      disabled={!merchant || total <= 0 || !date}
                      onClick={() => setStep(3)}
                    >
                      Confirm extraction <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Map your columns</h2>
                  <p className="muted">
                    We detected {recordCount} sample records. Confirm the field
                    mapping.
                  </p>
                  {["Transaction date", "Description / merchant", "Amount"].map(
                    (f, i) => (
                      <div className="mapping-row" key={f}>
                        <span>
                          <FileText size={16} />
                          {f}
                        </span>
                        <ArrowRight size={16} />
                        <select
                          aria-label={`Map ${f}`}
                          value={mapping[i]}
                          onChange={(e) =>
                            setMapping((m) =>
                              m.map((v, j) => (i === j ? e.target.value : v)),
                            )
                          }
                        >
                          {["Date", "Description", "Amount", "Reference"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                        <Badge>Detected</Badge>
                      </div>
                    ),
                  )}
                  {new Set(mapping).size < 3 && (
                    <p className="inline-error">
                      Each field must map to a different column.
                    </p>
                  )}
                  <div className="form-footer">
                    <button
                      className="button primary"
                      disabled={new Set(mapping).size < 3}
                      onClick={() => setStep(3)}
                    >
                      Validate records <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )
            ) : step === 3 ? (
              <>
                <h2>
                  {isReceipt ? "Categorize your expense" : "Validation results"}
                </h2>
                {isReceipt ? (
                  <div className="record-form">
                    <label>
                      Expense category
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {[
                          "Ingredients",
                          "Inventory",
                          "Utilities",
                          "Packaging",
                          "Other",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <div className="form-info">
                      Branch: {branch}
                      <br />
                      Account: ABA Business
                    </div>
                    <p>
                      This expense will flow into transactions, account balance,
                      monthly reporting and your forecast.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="validation-row">
                      <Check size={18} />
                      <span>{recordCount - 1} records ready to import</span>
                      <Badge>Validated</Badge>
                    </div>
                    <div className="validation-row warning-text">
                      <AlertCircle size={18} />
                      <span>Row {recordCount} · Missing expense category</span>
                      <Badge>{resolved ? "Reviewed" : "Needs Review"}</Badge>
                    </div>
                    <label className="field">
                      Resolve missing category
                      <select
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setResolved(!!e.target.value);
                        }}
                        defaultValue=""
                      >
                        <option value="">Choose a category</option>
                        <option>Packaging</option>
                        <option>Ingredients</option>
                        <option>Other</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="form-footer">
                  <button
                    className="button secondary"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    className="button primary"
                    disabled={!isReceipt && !resolved}
                    onClick={() => setStep(4)}
                  >
                    Review & confirm <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : step === 4 ? (
              <>
                <h2>Ready to put everything in place?</h2>
                <div className="confirmation-summary">
                  <dl>
                    <dt>Source</dt>
                    <dd>{file}</dd>
                    <dt>Branch</dt>
                    <dd>{branch}</dd>
                    <dt>Records</dt>
                    <dd>{recordCount} reviewed</dd>
                    <dt>Category</dt>
                    <dd>{category}</dd>
                    <dt>Account</dt>
                    <dd>ABA Business</dd>
                  </dl>
                </div>
                <div className="connection-flow">
                  <span>{source}</span>
                  <ArrowRight size={16} />
                  <span>Records</span>
                  <ArrowRight size={16} />
                  <span>Ledger & reports</span>
                </div>
                <div className="form-footer">
                  <button
                    className="button secondary"
                    onClick={() => setStep(3)}
                  >
                    Back
                  </button>
                  <button className="button primary" onClick={finish}>
                    <Check size={16} />
                    {isReceipt ? "Create transaction" : "Confirm import"}
                  </button>
                </div>
              </>
            ) : (
              <div className="success-state">
                <span className="success-icon">
                  <Check size={30} />
                </span>
                <h2>
                  {isReceipt
                    ? "Transaction created successfully."
                    : "Your records are right where they belong."}
                </h2>
                <p>
                  Balances, dashboard and reports now include your new records.
                </p>
                <div className="page-actions">
                  <button
                    className="button primary"
                    onClick={() =>
                      a.go(
                        source === "Items" || source === "Supplier Catalog"
                          ? "items"
                          : source === "Sales"
                            ? "sales"
                            : `transactions?search=${result}`,
                      )
                    }
                  >
                    View records <ArrowRight size={16} />
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setStep(0);
                      setFile("");
                      setResolved(false);
                    }}
                  >
                    Upload another
                  </button>
                  <button
                    className="button quiet"
                    onClick={() => a.go("expenses")}
                  >
                    Go to expenses
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function Reconciliation() {
  const a = useApp();
  const [rejected, setRejected] = useState<string[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const entries = a.scope(a.state.transactions).slice(0, 5);
  const matched = entries.filter((r) =>
    a.state.reconciled.includes(r.id),
  ).length;
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="BANKING / ABA BUSINESS / OCTOBER STATEMENT"
        title="Bring the books into balance"
        description="Review suggested matches and connect every bank entry to its source."
        actions={
          <button className="button secondary" onClick={() => a.go("imports")}>
            Import another statement
          </button>
        }
      />
      <div className="reconcile-summary">
        <div>
          <span className="tiny-icon">
            <Landmark size={22} />
          </span>
          <div>
            <strong>ABA Business · October 2026</strong>
            <p>{a.branch} · USD statement</p>
          </div>
        </div>
        <div>
          <strong>
            {matched} / {entries.length} reconciled
          </strong>
          <div className="progress-track">
            <span
              style={{
                width: `${(matched / Math.max(entries.length, 1)) * 100}%`,
                animation: "none",
              }}
            />
          </div>
        </div>
      </div>
      <div className="reconcile-head">
        <span>Bank statement entry</span>
        <span>Match confidence</span>
        <span>Your transaction</span>
      </div>
      {entries.map((r, i) => {
        const done = a.state.reconciled.includes(r.id);
        const reject = rejected.includes(r.id);
        return (
          <div className={`reconcile-row ${done ? "matched" : ""}`} key={r.id}>
            <div>
              <small>
                {r.date} · Statement line {i + 1}
              </small>
              <h3>{r.name}</h3>
              <Money value={r.amount} currency={a.currency} />
            </div>
            <div className="match-center">
              <span className="match-line" />
              <Badge>
                {done
                  ? "Matched"
                  : reject
                    ? "Unmatched"
                    : i === 4
                      ? "Discrepancy"
                      : "Suggested Match"}
              </Badge>
              <small>
                {done
                  ? "Confirmed"
                  : reject
                    ? "Select a transaction"
                    : `${i === 4 ? 62 : 98 - i}% confidence`}
              </small>
              <ArrowRight size={18} />
            </div>
            <div>
              <strong>{reject ? "Find a transaction" : r.name}</strong>
              <small>
                {r.id} · {r.account}
              </small>
              {reject && (
                <select
                  aria-label="Find transaction"
                  value={selection[r.id] || ""}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, [r.id]: e.target.value }))
                  }
                >
                  <option value="">Choose matching transaction</option>
                  {a
                    .scope(a.state.transactions)
                    .filter((t) => t.amount === r.amount)
                    .map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.id} · {t.name}
                      </option>
                    ))}
                </select>
              )}
              <div className="page-actions">
                {!done ? (
                  <>
                    <button
                      className="button primary compact"
                      disabled={reject && !selection[r.id]}
                      onClick={() => {
                        a.setState((s) => ({
                          ...s,
                          reconciled: [...s.reconciled, r.id],
                          transactions: s.transactions.map((t) =>
                            t.id === (selection[r.id] || r.id)
                              ? {
                                  ...t,
                                  status: "Reconciled",
                                  activity: [
                                    ...(t.activity || []),
                                    "Matched to ABA statement entry",
                                  ],
                                }
                              : t,
                          ),
                        }));
                        a.notify(
                          "Match confirmed. Report completeness updated.",
                        );
                      }}
                    >
                      <Check size={13} />
                      Accept match
                    </button>
                    <button
                      className="button quiet compact"
                      onClick={() => setRejected((s) => [...s, r.id])}
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="green">
                    <Check size={15} /> Account ledger confirmed
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="form-footer">
        <p className="muted">
          Matching existing entries does not double-count your balance.
        </p>
        <button
          className="button primary"
          disabled={matched !== entries.length || !entries.length}
          onClick={() => {
            a.setState((s) => ({
              ...s,
              imports: s.imports.map((i) =>
                i.source === "Bank Statement" &&
                (a.branch === "All branches" || i.branch === a.branch)
                  ? {
                      ...i,
                      status: "Completed",
                      note: "Statement fully reconciled",
                    }
                  : i,
              ),
            }));
            setConfirm(true);
            a.notify("Statement reconciled. Your monthly report is complete.");
          }}
        >
          Finish reconciliation <Check size={16} />
        </button>
      </div>
      {confirm && (
        <div className="insight-strip">
          <Check size={22} />
          <div>
            <strong>Everything balances.</strong>
            <p>
              This statement is now included in your completed monthly report.
            </p>
          </div>
          <button className="button secondary" onClick={() => a.go("reports")}>
            Open reports <ArrowRight size={15} />
          </button>
        </div>
      )}
    </>
  );
}
