"use client";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Sparkles,
  Receipt,
  FileText,
  Package,
  Landmark,
  ChevronRight,
  Plus,
  Upload,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { useApp } from "./context";
import { Money, PageHeader } from "./ui";
import { today, totals } from "@/lib/store";
import { useState } from "react";
import { cashBalance } from "@/lib/finance";
import { DashboardNumber, MagicCard } from "./dashboard-motion";
export function Dashboard() {
  const { state, scope, currency, go, create, branch } = useApp();
  const [period, setPeriod] = useState("This month");
  const monthOffset = period === "Last month" ? 1 : 0;
  const anchor = new Date(`${today}T12:00:00Z`);
  const monthKey = (offset: number) => {
    const date = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1),
    );
    return date.toISOString().slice(0, 7);
  };
  const selectedMonth = monthKey(monthOffset);
  const ledger = scope(state.transactions);
  const tx = ledger.filter((r) => r.date.startsWith(selectedMonth));
  const t = totals(tx);
  const previous = totals(
    ledger.filter((r) => r.date.startsWith(monthKey(monthOffset + 1))),
  );
  const change = (value: number, before: number) =>
    before === 0
      ? value === 0
        ? "No change"
        : "No prior data"
      : `${value >= before ? "+" : ""}${(((value - before) / Math.abs(before)) * 100).toFixed(1)}%`;
  const days = new Date(
    Date.UTC(
      Number(selectedMonth.slice(0, 4)),
      Number(selectedMonth.slice(5)),
      0,
    ),
  ).getUTCDate();
  const elapsedDays = monthOffset === 0 ? Number(today.slice(-2)) : days;
  const periodLabel = new Date(
    `${selectedMonth}-01T12:00:00Z`,
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const inv = scope(state.invoices);
  const owed = inv
    .filter((i) => !["Draft", "Cancelled"].includes(i.status))
    .reduce((s, i) => s + i.amount - (i.paid || 0), 0);
  const payable = scope(state.bills).reduce(
    (s, i) => s + i.amount - (i.paid || 0),
    0,
  );
  const overdue = inv.filter((i) => i.status === "Overdue");
  const voiceDrafts = inv.filter(
    (i) => i.source === "Voice + AI" && i.status === "Draft",
  );
  const low = scope(state.items).filter((i) => (i.stock || 0) < 20);
  const chart = Array.from({ length: days }, (_, i) => {
    const date = `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
    const v = totals(tx.filter((r) => r.date === date));
    return {
      name: `${Number(selectedMonth.slice(5))}/${i + 1}`,
      Income: v.revenue,
      Spending: v.expenses,
      date,
    };
  });
  const currentCash = cashBalance(
    ledger.filter((r) => r.date.slice(0, 7) <= selectedMonth),
    branch,
  );
  const cash = chart.map((d, i) => ({
    ...d,
    cash:
      currentCash -
      chart.slice(i + 1).reduce((sum, a) => sum + a.Income - a.Spending, 0),
  }));
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "KHR" ? 0 : 2,
    }).format(value * (currency === "KHR" ? 4100 : 1));
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS AT A GLANCE"
        title="Dashboard"
        description="A little clarity. A lot of possibility. Here’s where you stand."
        actions={
          <>
            <select
              aria-label="Dashboard date range"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option>This month</option>
              <option>Last month</option>
            </select>
            <button
              className="button primary"
              onClick={() => create("transaction")}
            >
              <Plus size={16} />
              Add transaction
            </button>
          </>
        }
      />
      <nav className="dashboard-actions" aria-label="Dashboard quick actions">
        <button onClick={() => create("invoice")}>
          <FileText size={18} />
          <span>
            New invoice<small>Bill a customer</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button onClick={() => create("bill")}>
          <Receipt size={18} />
          <span>
            Add a bill<small>Track a supplier payment</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button onClick={() => go("imports")}>
          <Upload size={18} />
          <span>
            Import records<small>Bring your books up to date</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button onClick={() => go("reports")}>
          <TrendingUp size={18} />
          <span>
            View reports<small>Understand your performance</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </nav>
      <div className="overview-meta">
        <span>
          <span className="live-dot" />
          All systems up to date
        </span>
        <span>
          {periodLabel}
          <span className="meta-separator">/</span>
          {branch}
        </span>
      </div>
      <div className="kpi-grid">
        {[
          {
            label: "Total revenue",
            value: t.revenue,
            change: change(t.revenue, previous.revenue),
            up: t.revenue >= previous.revenue,
            path: "transactions?category=Sales",
            hint: "vs. previous period",
          },
          {
            label: "Total expenses",
            value: t.expenses,
            change: change(t.expenses, previous.expenses),
            up: t.expenses >= previous.expenses,
            path: "expenses",
            hint: "vs. previous period",
          },
          {
            label: "Net profit",
            value: t.profit,
            change: change(t.profit, previous.profit),
            up: t.profit >= previous.profit,
            path: "reports",
            hint: "vs. previous period",
          },
          {
            label: "Profit margin",
            value: t.margin,
            change: `${(t.margin - previous.margin).toFixed(1)} pts`,
            up: t.margin >= previous.margin,
            path: "reports",
            hint: "vs. previous period",
          },
        ].map((k, i) => (
          <MagicCard
            className={`kpi ${i === 2 ? "featured" : ""}`}
            key={k.label}
            onClick={() => go(k.path)}
          >
            <div className="kpi-label">
              {k.label}
              <ArrowUpRight size={16} />
            </div>
            <div className="kpi-value">
              <DashboardNumber
                value={k.value}
                currency={currency}
                percent={i === 3}
              />
            </div>
            <div className="kpi-bottom">
              <div>
                <span className="trend">
                  {k.up ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )}{" "}
                  {k.change}
                </span>
                <small>{k.hint}</small>
              </div>
            </div>
          </MagicCard>
        ))}
      </div>
      <div className="demo-data-caption">
        Monthly totals and comparisons reflect your ledger. Demo workspace date:{" "}
        {today}.
      </div>
      <div className="dashboard-charts">
        <section className="panel income-panel">
          <div className="section-heading">
            <div>
              <h2>Income vs. spending</h2>
              <p>A clear view of money in and money out</p>
            </div>
            <span className="chart-legend">
              <i />
              Income <i />
              Spending
            </span>
          </div>
          <div className="chart-totals">
            <strong>
              <Money value={t.revenue} currency={currency} />
            </strong>
            <span>total income this period</span>
          </div>
          <div className="main-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                barGap={6}
                margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) =>
                    currency === "KHR"
                      ? `${Math.round(v * 4.1)}k៛`
                      : `$${v / 1000}k`
                  }
                  width={55}
                />
                <Tooltip
                  formatter={(v) =>
                    currency === "KHR"
                      ? `៛${Math.round(Number(v) * 4100).toLocaleString()}`
                      : `$${Number(v).toLocaleString()}`
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar
                  dataKey="Income"
                  fill="#3930cb"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="Spending"
                  fill="#e2e8f0"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel-footer">
            {t.revenue >= t.expenses
              ? "Your income is covering operating costs."
              : "Spending exceeds income for this period."}
            <button onClick={() => go("reports")}>
              View report <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section className="panel cash-panel">
          <div className="section-heading">
            <div>
              <h2>Cash position</h2>
              <p>Room to grow, peace of mind</p>
            </div>
            <span className="tiny-icon">
              <Landmark size={17} />
            </span>
          </div>
          <div className="cash-value">
            <Money value={cash[cash.length - 1].cash} currency={currency} />
          </div>
          <span
            className={`badge ${currentCash >= 0 ? "positive" : "negative"}`}
          >
            <span className="status-dot" />
            {currentCash >= 0
              ? "Positive cash balance"
              : "Negative cash balance"}
          </span>
          <div className="cash-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cash}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3930cb" stopOpacity={0.17} />
                    <stop offset="100%" stopColor="#3930cb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#3930cb"
                  fill="url(#cashFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="cash-bottom">
            <span>
              Estimated runway
              <strong>
                {t.expenses > 0
                  ? `${Math.max(0, Math.round(currentCash / (t.expenses / elapsedDays)))} days`
                  : "No spending"}
              </strong>
            </span>
            <button className="text-button" onClick={() => go("accounts")}>
              View accounts <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>
      <div className="insight-strip">
        <div className="insight-icon">
          <Sparkles size={19} />
        </div>
        <div>
          <strong>A little insight for your next move</strong>
          <p>
            Inventory and ingredients make up{" "}
            {Math.round(
              (tx
                .filter((r) =>
                  ["Inventory", "Ingredients"].includes(r.category || ""),
                )
                .reduce((s, r) => s - Math.min(r.amount, 0), 0) /
                Math.max(t.expenses, 1)) *
                100,
            )}
            % of your spending. Review supplier costs to protect your margin.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            go("advisor?question=Why%20are%20inventory%20costs%20high%3F")
          }
        >
          Explore with AI <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>
                Recent transactions <span className="count">{tx.length}</span>
              </h2>
              <p>The latest movement in your business</p>
            </div>
            <button className="text-button" onClick={() => go("transactions")}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="recent-list">
            {tx.length === 0 && (
              <p className="muted pad">
                No transactions this month. Add a transaction to get started.
              </p>
            )}
            {[...tx]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((r) => (
                <button
                  key={r.id}
                  className="recent-row"
                  onClick={() => go(`transactions?search=${r.id}`)}
                >
                  <span
                    className={`transaction-icon ${r.amount > 0 ? "in" : "out"}`}
                  >
                    {r.amount > 0 ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <span className="recent-description">
                    <strong>{r.name}</strong>
                    <small>
                      {r.category} <span>·</span> {r.branch}
                    </small>
                  </span>
                  <span className="recent-date">
                    {r.date.slice(5).replace("-", "/")}
                    <small>{r.source}</small>
                  </span>
                  <span
                    className={`recent-amount ${r.amount > 0 ? "green" : ""}`}
                  >
                    {r.amount > 0 ? "+" : ""}
                    <Money value={r.amount} currency={currency} />
                    <small>Completed</small>
                  </span>
                </button>
              ))}
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="section-heading">
            <div>
              <h2>Needs your attention</h2>
              <p>A few things to keep moving</p>
            </div>
            <span className="count">
              {overdue.length + low.length + voiceDrafts.length + 1}
            </span>
          </div>
          {[
            ...(voiceDrafts.length
              ? [
                  {
                    icon: FileText,
                    title: `${voiceDrafts.length} voice ${voiceDrafts.length === 1 ? "invoice is" : "invoices are"} ready to send`,
                    sub: "Drafts are saved; send to add them to receivables",
                    path: "invoices?status=Draft&search=Voice",
                  },
                ]
              : []),
            {
              icon: FileText,
              title: `${overdue.length} overdue invoices`,
              sub: `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(overdue.reduce((s, r) => s + r.amount - (r.paid || 0), 0))} waiting to come in`,
              path: "invoices?status=Overdue",
            },
            {
              icon: Receipt,
              title: "Upcoming bill payments",
              sub: `${scope(state.bills).filter((b) => b.status !== "Paid").length} suppliers awaiting payment`,
              path: "bills",
            },
            {
              icon: Package,
              title: `${low.length} items running low`,
              sub: "Keep your shelves ready for business",
              path: "items?status=Low%20stock",
            },
            {
              icon: Landmark,
              title: `${Math.max(0, 2 - state.reconciled.length)} entries to reconcile`,
              sub: "Finish your September statement",
              path: "reconciliation",
            },
          ].map((a) => (
            <button
              className="attention-row"
              key={a.title}
              onClick={() => go(a.path)}
            >
              <span className="attention-icon">
                <a.icon size={17} />
              </span>
              <span>
                <strong>{a.title}</strong>
                <small>{a.sub}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
      </div>
      <div className="receivables-strip">
        <button onClick={() => go("invoices")}>
          <span>Money coming in</span>
          <strong>
            <Money value={owed} currency={currency} />
          </strong>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => go("bills")}>
          <span>Money going out</span>
          <strong>
            <Money value={payable} currency={currency} />
          </strong>
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => go("imports")}>
          <span>Latest import</span>
          <strong>
            {scope(state.imports)[0]?.name || "Import your first file"}
          </strong>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="workspace-footnote">
        <span className="brand-mark small">l</span> A more balanced business
        starts here.<span>Demo workspace · USD / KHR at ៛4,100</span>
      </div>
    </>
  );
}
