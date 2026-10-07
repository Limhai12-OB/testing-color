"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Send,
  FileText,
  Download,
  Check,
  TrendingUp,
  RotateCcw,
  Save,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useSearchParams } from "next/navigation";
import { useApp } from "./context";
import { PageHeader, Money, Badge } from "./ui";
import { totals } from "@/lib/store";
import { cashBalance } from "@/lib/finance";
export function Advisor() {
  const a = useApp();
  const params = useSearchParams();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { q: string; answer: string; kind: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const requestGeneration = useRef(0);
  const tx = a.scope(a.state.transactions);
  const t = totals(tx);
  const spend = Object.entries(
    tx
      .filter((r) => r.amount < 0)
      .reduce(
        (s, r) => ({
          ...s,
          [r.category || "Other"]: (s[r.category || "Other"] || 0) - r.amount,
        }),
        {} as Record<string, number>,
      ),
  ).sort((a, b) => b[1] - a[1]);
  const ask = (q: string) => {
    if (!q.trim() || busy) return;
    setQuestion("");
    setBusy(true);
    const generation = requestGeneration.current;
    setTimeout(() => {
      if (generation !== requestGeneration.current) return;
      let answer = "";
      let kind = "expenses";
      if (/voice/i.test(q)) {
        kind = "voice-invoices";
        const invoices = a
          .scope(a.state.invoices)
          .filter((i) => i.source === "Voice + AI");
        answer = `Your current branch scope contains ${invoices.length} invoices created using Voice Assistant. ${invoices.filter((i) => i.status === "Draft").length} are drafts awaiting review or sending. They use the same invoice and payment workflow; drafts are not yet included in receivables.`;
      } else if (/unpaid|invoice/i.test(q)) {
        kind = "invoices";
        const inv = a
          .scope(a.state.invoices)
          .filter((i) => !["Paid", "Cancelled", "Draft"].includes(i.status));
        answer = `There are ${inv.length} open invoices with $${inv.reduce((s, i) => s + i.amount - (i.paid || 0), 0).toLocaleString()} still to collect. Start with overdue invoices, then follow up on upcoming balances.`;
      } else if (/branch|margin/i.test(q)) {
        kind = "branches";
        answer = `Your current scope has a ${t.margin.toFixed(1)}% profit margin. Compare each location’s revenue against its operating costs before moving stock or increasing investment.`;
      } else if (/compare|month/i.test(q)) {
        const now = totals(tx.filter((r) => r.date.startsWith("2026-10"))),
          prior = totals(tx.filter((r) => r.date.startsWith("2026-09")));
        answer = `October-to-date spending is $${now.expenses.toFixed(2)}, compared with $${prior.expenses.toFixed(2)} across the September records available here. These are different sample windows, so they are not a reliable month-on-month growth rate. ${spend[0]?.[0] || "Inventory"} is the largest cost category in your scope.`;
      } else
        answer = `Across the records for ${a.branch}, ${spend[0]?.[0] || "inventory"} is your largest spending category at $${(spend[0]?.[1] || 0).toFixed(2)}. Review supplier pricing and purchase frequency first. Your recorded revenue of $${t.revenue.toFixed(2)} currently covers $${t.expenses.toFixed(2)} in expenses.`;
      setMessages((m) => [...m, { q, answer, kind }]);
      setBusy(false);
    }, 1000);
  };
  useEffect(() => {
    setMessages([]);
    setBusy(false);
    const q = params.get("question");
    if (q) ask(q);
    return () => {
      requestGeneration.current += 1;
    };
  }, [a.branch, a.role]);
  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE"
        title="A clearer picture. A smarter next step."
        description="Your financial advisor, grounded in your business records."
        actions={<Badge>Demo advisor</Badge>}
      />
      <div className="advisor-layout">
        <section className="advisor-main">
          {!messages.length && !busy ? (
            <div className="advisor-welcome">
              <span className="advisor-orb">
                <Sparkles size={31} />
              </span>
              <h2>Let’s make sense of the numbers.</h2>
              <p>
                Find the story behind your finances, and a practical way
                forward.
              </p>
              <div className="starter-grid">
                {[
                  "Why did expenses increase this month?",
                  "Which branch has the best margin?",
                  "How much did I spend on inventory?",
                  "Show unpaid invoices.",
                  "Show recent voice invoices.",
                  "Compare this month with last month.",
                ]
                  .filter(
                    (q) => a.role === "Business Owner" || !q.includes("branch"),
                  )
                  .map((q) => (
                    <button key={q} onClick={() => ask(q)}>
                      {q}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="conversation">
              {messages.map((m, i) => (
                <div key={i}>
                  <div className="user-question">
                    <span className="avatar small">VS</span>
                    {m.q}
                  </div>
                  <div className="advisor-response">
                    <span className="insight-icon">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <strong>Here’s what your records show</strong>
                      <p>{m.answer}</p>
                      <div className="evidence">
                        <small>
                          SUPPORTING RECORDS · {a.branch.toUpperCase()}
                        </small>
                        {["invoices", "voice-invoices"].includes(m.kind)
                          ? a
                              .scope(a.state.invoices)
                              .filter((r) =>
                                m.kind === "voice-invoices"
                                  ? r.source === "Voice + AI"
                                  : !["Paid", "Cancelled", "Draft"].includes(
                                      r.status,
                                    ),
                              )
                              .map((r) => (
                                <button
                                  key={r.id}
                                  onClick={() =>
                                    a.go(`invoices?search=${r.id}`)
                                  }
                                >
                                  {r.name}
                                  <Money
                                    value={r.amount - (r.paid || 0)}
                                    currency={a.currency}
                                  />
                                  <ArrowUpRight size={13} />
                                </button>
                              ))
                          : spend.slice(0, 3).map(([cat, v]) => (
                              <button
                                key={cat}
                                onClick={() =>
                                  a.go(`transactions?category=${cat}`)
                                }
                              >
                                {cat}
                                <Money value={v} currency={a.currency} />
                                <ArrowUpRight size={13} />
                              </button>
                            ))}
                      </div>
                      <div className="page-actions">
                        <button
                          className="button secondary"
                          onClick={() =>
                            a.go(
                              ["invoices", "voice-invoices"].includes(m.kind)
                                ? "invoices"
                                : "expenses",
                            )
                          }
                        >
                          View related records <ArrowRight size={14} />
                        </button>
                        <button
                          className="button quiet"
                          onClick={() => a.go("reports")}
                        >
                          Open report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="advisor-thinking">
                  <LoaderCircle size={18} className="spin" />
                  Reviewing your scoped business records…
                </div>
              )}
            </div>
          )}
          <form
            className="advisor-composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <textarea
              rows={2}
              aria-label="Ask your financial advisor"
              placeholder="Ask anything about your business finances…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
            />
            <div>
              <span>
                <span className="live-dot" />
                {a.branch} · {tx.length} records
              </span>
              <button
                className="button primary"
                aria-label="Send question"
                disabled={busy || !question.trim()}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <p className="advisor-disclaimer">
            Simulated insights based on demo business records. Not professional
            accounting or tax advice.
          </p>
        </section>
        <aside className="advisor-context">
          <div className="section-heading">
            <h2>Your context</h2>
            <Sparkles size={16} />
          </div>
          <small>BUSINESS SCOPE</small>
          <strong>{a.state.settings.business}</strong>
          <p>{a.branch}</p>
          <hr />
          <small>AT A GLANCE</small>
          {[
            ["Revenue", t.revenue],
            ["Expenses", t.expenses],
            ["Net profit", t.profit],
          ].map(([k, v]) => (
            <div className="context-stat" key={k}>
              <span>{k}</span>
              <strong>
                <Money value={Number(v)} currency={a.currency} />
              </strong>
            </div>
          ))}
          <hr />
          <small>CONNECTED DATA</small>
          {[
            "Transactions & expenses",
            "Customer invoices",
            "Inventory records",
            "Bank statement activity",
          ].map((s) => (
            <p className="context-source" key={s}>
              <Check size={14} />
              {s}
            </p>
          ))}
          <div className="note-box">
            Answers use your active branch scope. Change branches to explore
            another location.
          </div>
        </aside>
      </div>
    </>
  );
}
export function Reports() {
  const a = useApp();
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);
  const tx = a
    .scope(a.state.transactions)
    .filter((r) =>
      r.date.startsWith(report === "October 2026" ? "2026-10" : "2026-09"),
    );
  const t = totals(tx);
  const unresolved = a
    .scope(a.state.imports)
    .filter((i) => i.status === "Needs Review").length;
  const reports = [
    "October 2026",
    "September 2026",
    "August 2026",
    "July 2026",
  ];
  return (
    <>
      <PageHeader
        eyebrow={
          report ? "MONTHLY REPORTS / " + report.toUpperCase() : undefined
        }
        title={report || "Your business, month by month."}
        description={
          report
            ? `${a.branch} · Executive financial report · ${a.currency}`
            : "The numbers, the story, and the next steps. All in one place."
        }
        actions={
          report ? (
            <>
              <button
                className="button secondary"
                onClick={() => setReport("")}
              >
                All reports
              </button>
              <button className="button primary" onClick={() => window.print()}>
                <Download size={15} />
                Export PDF
              </button>
            </>
          ) : (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setTimeout(() => {
                  setReport("October 2026");
                  setBusy(false);
                }, 1000);
              }}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Generate report
            </button>
          )
        }
      />
      {!report ? (
        <div className="report-grid">
          {reports.map((r, i) => (
            <button
              className="report-card"
              key={r}
              onClick={() => setReport(r)}
            >
              <div className="report-cover">
                <div className="report-logo">
                  ledger<span>MONTHLY REVIEW</span>
                </div>
                <h2>
                  {r.split(" ")[0]}
                  <span>{r.split(" ")[1]}</span>
                </h2>
                <div className="report-bars">
                  {[35, 52, 42, 68, 56, 80, 72, 94].map((v, j) => (
                    <i key={j} style={{ height: v + "%" }} />
                  ))}
                </div>
              </div>
              <div className="report-card-info">
                <div>
                  <strong>{r}</strong>
                  <Badge>
                    {i < 2 && unresolved ? "Incomplete" : "Complete"}
                  </Badge>
                </div>
                <p>{a.branch}</p>
                <small>
                  {i < 2 ? "Generated Oct 5, 2026" : "Archived demo report"}{" "}
                  <ArrowUpRight size={15} />
                </small>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <article className="report-document">
          <div className="report-document-head">
            <span className="wordmark">
              <span className="brand-mark">l</span>ledger
            </span>
            <small>FINANCIAL REVIEW / {report.toUpperCase()}</small>
          </div>
          {unresolved > 0 && (
            <div className="notice">
              <AlertTriangle size={19} />
              <div>
                <strong>This report has outstanding source records.</strong>
                <p>
                  {unresolved} statement import needs review. Complete
                  reconciliation to finalize your report.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => a.go("reconciliation")}
              >
                Review entries <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="report-intro">
            <span className="eyebrow">EXECUTIVE SUMMARY</span>
            <h2>A business moving forward.</h2>
            <p>
              Recorded revenue for {a.branch} is{" "}
              <Money value={t.revenue} currency={a.currency} />, with a{" "}
              {t.margin.toFixed(1)}% operating margin. Focus on collecting
              outstanding invoices and maintaining inventory coverage.
            </p>
            {["August 2026", "July 2026"].includes(report) && (
              <p className="demo-note">
                Archived layout preview uses available September sample records.
              </p>
            )}
          </div>
          <div className="summary-band">
            {[
              ["Revenue", t.revenue],
              ["Expenses", t.expenses],
              ["Profit", t.profit],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>
                  <Money value={Number(v)} currency={a.currency} />
                </strong>
              </div>
            ))}
          </div>
          <div className="report-sections">
            <section>
              <h2>Expense breakdown</h2>
              {["Ingredients", "Inventory", "Utilities", "Packaging"].map(
                (c) => {
                  const v = -tx
                    .filter((r) => r.category === c && r.amount < 0)
                    .reduce((s, r) => s + r.amount, 0);
                  return (
                    <div key={c} className="expense-bar">
                      <div>
                        <span>{c}</span>
                        <Money value={v} currency={a.currency} />
                      </div>
                      <div>
                        <span
                          style={{
                            width: `${(v / Math.max(t.expenses, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </section>
            <section>
              <h2>Cash flow & obligations</h2>
              {[
                ["Operating cash flow", t.profit],
                [
                  "Receivables",
                  a
                    .scope(a.state.invoices)
                    .filter((r) => !["Draft", "Cancelled"].includes(r.status))
                    .reduce((s, r) => s + r.amount - (r.paid || 0), 0),
                ],
                [
                  "Payables",
                  a
                    .scope(a.state.bills)
                    .reduce((s, r) => s + r.amount - (r.paid || 0), 0),
                ],
              ].map(([k, v]) => (
                <div className="linked-row" key={k}>
                  <span>{k}</span>
                  <Money value={Number(v)} currency={a.currency} />
                </div>
              ))}
            </section>
          </div>
          <section className="report-recommendations">
            <Sparkles size={22} />
            <div>
              <h2>Diagnostics & recommendations</h2>
              <p>
                1. Follow up on overdue receivables before the next supplier
                payment cycle.
              </p>
              <p>
                2. Review your highest-cost inventory categories with your
                purchasing team.
              </p>
              <p>
                3. Resolve statement mismatches to improve confidence in next
                month’s forecast.
              </p>
              <button className="text-button" onClick={() => a.go("advisor")}>
                Explore this report with your advisor <ArrowRight size={15} />
              </button>
            </div>
          </section>
          <footer>
            Prepared for {a.state.settings.business} · Demo financial analysis ·
            Not accounting or tax advice
          </footer>
        </article>
      )}
    </>
  );
}
export function Forecast() {
  const a = useApp();
  const [horizon, setHorizon] = useState(90);
  const [sales, setSales] = useState(0);
  const [cost, setCost] = useState(0);
  const [rent, setRent] = useState(1800);
  const [newBranch, setNewBranch] = useState(false);
  const [setup, setSetup] = useState(6000);
  const [saved, setSaved] = useState(false);
  const [scenarioName, setScenarioName] = useState("Growth plan");
  const t = totals(
    a.scope(a.state.transactions).filter((r) => r.date.startsWith("2026-10")),
  );
  const startingCash = cashBalance(a.scope(a.state.transactions), a.branch);
  const baseRevenue = t.revenue * 6;
  const baseExpense = t.expenses * 6;
  const revenue = baseRevenue * (1 + sales / 100) * (newBranch ? 1.2 : 1);
  const expense =
    baseExpense * (1 + cost / 100) + rent - 1800 + (newBranch ? 2400 : 0);
  const cash =
    startingCash +
    ((revenue - expense) * horizon) / 30 -
    (newBranch ? setup : 0);
  const baseline = startingCash + ((baseRevenue - baseExpense) * horizon) / 30;
  const data = Array.from({ length: 7 }, (_, i) => ({
    day: `Day ${Math.round((i * horizon) / 6)}`,
    Baseline: Math.round(startingCash + ((baseline - startingCash) * i) / 6),
    Scenario: Math.round(startingCash + ((cash - startingCash) * i) / 6),
    Conservative: Math.round(
      startingCash + ((((revenue * 0.8 - expense) * horizon) / 30) * i) / 6,
    ),
    Optimistic: Math.round(
      startingCash + ((((revenue * 1.2 - expense) * horizon) / 30) * i) / 6,
    ),
  }));
  const runway =
    expense > revenue
      ? Math.round(startingCash / ((expense - revenue) / 30))
      : 365;
  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE / PLANNING"
        title="Make your next move with confidence."
        description="Explore the possibilities before you commit to them."
        actions={
          <select
            aria-label="Forecast horizon"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        }
      />
      <div className="summary-band forecast-summary">
        {[
          ["Starting cash", startingCash],
          ["Forecast inflows", (revenue * horizon) / 30],
          ["Scheduled outflows", (expense * horizon) / 30],
          ["Projected cash", cash],
        ].map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>
              <Money value={Number(v)} currency={a.currency} />
            </strong>
          </div>
        ))}
      </div>
      {Math.min(...data.map((d) => d.Scenario)) <
        a.state.settings.threshold && (
        <div className="notice">
          <AlertTriangle size={20} />
          <div>
            <strong>Cash may fall below your safety threshold.</strong>
            <p>
              Adjust your scenario to keep a reserve of{" "}
              <Money value={a.state.settings.threshold} currency={a.currency} />
              .
            </p>
          </div>
        </div>
      )}
      <section className="panel forecast-chart">
        <div className="section-heading">
          <div>
            <h2>Cash flow outlook</h2>
            <p>Expected, conservative and optimistic scenarios · {a.branch}</p>
          </div>
          <Badge>Simulated forecast</Badge>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 15, right: 25 }}>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) =>
                  a.currency === "KHR"
                    ? `${Math.round(v * 4.1)}k៛`
                    : `$${Math.round(v / 1000)}k`
                }
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="Conservative"
                stroke="#64748b"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                dataKey="Baseline"
                name="Expected baseline"
                stroke="#64748b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="Optimistic"
                stroke="#c7d2fe"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                dataKey="Scenario"
                stroke="#3930cb"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="scenario-heading">
        <div>
          <span className="eyebrow">WHAT-IF SANDBOX</span>
          <h2>A small change. A different future.</h2>
          <p className="muted">
            Move the controls to see the impact immediately.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setSales(0);
            setCost(0);
            setRent(1800);
            setNewBranch(false);
            setSetup(6000);
            setSaved(false);
          }}
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
      <div className="scenario-grid">
        <section className="panel scenario-controls">
          <label>
            Sales change{" "}
            <strong>
              {sales > 0 ? "+" : ""}
              {sales}%
            </strong>
            <input
              aria-label="Sales change"
              type="range"
              min="-30"
              max="30"
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
            />
            <span className="range-labels">
              <small>−30%</small>
              <small>+30%</small>
            </span>
          </label>
          <label>
            Inventory cost{" "}
            <strong>
              {cost > 0 ? "+" : ""}
              {cost}%
            </strong>
            <input
              aria-label="Inventory cost"
              type="range"
              min="-20"
              max="30"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
            />
            <span className="range-labels">
              <small>−20%</small>
              <small>+30%</small>
            </span>
          </label>
          <div className="form-grid">
            <label>
              Monthly rent (USD)
              <input
                type="number"
                min="0"
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
              />
            </label>
            <label>
              Setup cost (USD)
              <input
                type="number"
                min="0"
                value={setup}
                onChange={(e) => setSetup(Number(e.target.value))}
                disabled={!newBranch}
              />
            </label>
          </div>
          <label className="toggle-row">
            <span>
              Open a new branch
              <small>+20% revenue · +$2,400 monthly costs</small>
            </span>
            <input
              aria-label="Open new branch"
              type="checkbox"
              checked={newBranch}
              onChange={(e) => setNewBranch(e.target.checked)}
            />
          </label>
        </section>
        <section className="panel scenario-results">
          <div className="section-heading">
            <h2>Your scenario impact</h2>
            <TrendingUp size={19} />
          </div>
          <div className="scenario-big">
            <small>Projected closing cash</small>
            <strong>
              <Money value={cash} currency={a.currency} />
            </strong>
            <span className={cash >= baseline ? "green" : "warning-text"}>
              {cash >= baseline ? "+" : ""}
              <Money value={cash - baseline} currency={a.currency} /> vs.
              baseline
            </span>
          </div>
          <div className="scenario-metrics">
            <div>
              <small>Runway</small>
              <strong>{runway >= 365 ? "365+" : runway} days</strong>
            </div>
            <div>
              <small>Lowest cash point</small>
              <strong>
                <Money
                  value={Math.min(...data.map((d) => d.Scenario))}
                  currency={a.currency}
                />
              </strong>
            </div>
            <div>
              <small>Monthly revenue</small>
              <strong>
                <Money value={revenue} currency={a.currency} />
              </strong>
            </div>
            <div>
              <small>Monthly expenses</small>
              <strong>
                <Money value={expense} currency={a.currency} />
              </strong>
            </div>
          </div>
          <label className="field">
            Scenario name
            <input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </label>
          <div className="page-actions">
            <button
              className="button primary"
              disabled={!scenarioName.trim()}
              onClick={() => {
                a.setState((s) => ({
                  ...s,
                  scenarios: [...s.scenarios, { name: scenarioName, cash }],
                }));
                setSaved(true);
                a.notify("Scenario saved");
              }}
            >
              <Save size={15} />
              {saved ? "Saved" : "Save scenario"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                a.setState((s) => ({
                  ...s,
                  scenarios: [
                    ...s.scenarios,
                    { name: `Target budget · ${scenarioName}`, cash },
                  ],
                }));
                a.notify("Scenario set as your demo target budget");
              }}
            >
              Set as target budget
            </button>
          </div>
        </section>
      </div>
      {a.state.scenarios.length > 0 && (
        <section className="panel saved-scenarios">
          <h2>Saved plans</h2>
          {a.state.scenarios.map((s, i) => (
            <div className="linked-row" key={i}>
              {s.name}
              <Money value={s.cash} currency={a.currency} />
            </div>
          ))}
        </section>
      )}
      <p className="demo-note">
        Illustrative forecast: October-to-date activity extrapolated to 30 days.
        Scenario assumptions are for product testing, not financial advice.
      </p>
    </>
  );
}
