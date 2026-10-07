"use client";
import { useOptionalAuth } from "./auth-context";
import { useEffect, useState } from "react";
import {
  Landmark,
  ArrowUpRight,
  Plus,
  MapPin,
  Users,
  RefreshCw,
  Link2,
  Check,
  LoaderCircle,
  Building2,
  Shield,
  User,
  Bell,
  Palette,
  Tag,
  CreditCard,
} from "lucide-react";
import { useApp } from "./context";
import { PageHeader, Money, Badge, Modal, Timeline } from "./ui";
import { accountBalance } from "@/lib/finance";
import { accountBase, branches, totals } from "@/lib/store";
export function Banking() {
  const a = useApp();
  return (
    <>
      <PageHeader
        title="Your money, all in one place."
        description="Connected accounts, clear balances, and books that add up."
        actions={
          <button className="button primary" onClick={() => a.go("imports")}>
            <Plus size={16} />
            Import statement
          </button>
        }
      />
      <div className="account-grid">
        {Object.entries(accountBase).map(([name, balance], i) => {
          const tx = a
            .scope(a.state.transactions)
            .filter((t) => t.account === name);
          const current = accountBalance(name, tx, a.branch);
          return (
            <section
              className={`account-card ${i === 0 ? "primary-account" : ""}`}
              key={name}
            >
              <div>
                <span className="bank-logo">{["ABA", "AC", "W", "₭"][i]}</span>
                <Badge>Active</Badge>
              </div>
              <small>
                {i === 3 ? "CASH ACCOUNT" : "BUSINESS ACCOUNT · USD"}
              </small>
              <h2>{name}</h2>
              <strong>
                <Money value={current} currency={a.currency} />
              </strong>
              <div className="account-meta">
                <span>{a.branch}</span>
                <span>•••• {["8042", "6190", "2083", "0001"][i]}</span>
              </div>
              <footer>
                <span>Last reconciled · Sep 30</span>
                <button onClick={() => a.go("reconciliation")}>
                  Reconcile <ArrowUpRight size={15} />
                </button>
              </footer>
            </section>
          );
        })}
      </div>
      <div className="section-heading spaced">
        <div>
          <h2>Statement history</h2>
          <p>Your imports and their reconciliation status</p>
        </div>
        <button className="text-button" onClick={() => a.go("imports")}>
          View import center <ArrowUpRight size={15} />
        </button>
      </div>
      <section className="panel">
        {a
          .scope(a.state.imports)
          .filter((i) => i.source === "Bank Statement")
          .map((i) => (
            <button
              className="statement-row"
              key={i.id}
              onClick={() => a.go("reconciliation")}
            >
              <span className="tiny-icon">
                <Landmark size={20} />
              </span>
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.branch} · {i.amount} entries
                </small>
              </div>
              <Badge>{i.status}</Badge>
              <ArrowUpRight size={17} />
            </button>
          ))}
      </section>
      <div className="note-box">
        Account balances combine demo opening balances and all posted
        transactions in your active branch scope.
      </div>
    </>
  );
}
export function Branches() {
  const a = useApp();
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <>
      <PageHeader
        title={selected || "One business. Every location."}
        description={
          selected
            ? "A closer look at the people, performance, and potential of this branch."
            : "Keep each branch connected to the bigger picture."
        }
        actions={
          selected ? (
            <>
              <button
                className="button secondary"
                onClick={() => setSelected("")}
              >
                All branches
              </button>
              <button
                className="button secondary"
                onClick={() => setConfirm(true)}
              >
                Deactivate branch
              </button>
            </>
          ) : (
            <button className="button primary" onClick={() => setEditing(true)}>
              <Plus size={16} />
              New branch
            </button>
          )
        }
      />
      {!selected ? (
        <div className="branch-grid">
          {a.state.locations.map((location, i) => {
            const b = location.name;
            const tx = a.state.transactions.filter((t) => t.branch === b);
            const t = totals(tx);
            return (
              <button
                className="branch-card"
                key={b}
                onClick={() => setSelected(b)}
              >
                <div className={`branch-illustration branch-${i}`}>
                  <Building2 size={58} strokeWidth={1} />
                  <span>{["01", "02", "03"][i]}</span>
                </div>
                <div className="branch-card-body">
                  <div>
                    <h2>{b}</h2>
                    <Badge>{location.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p>
                    <MapPin size={13} />
                    {location.address}
                  </p>
                  <div className="branch-stats">
                    <span>
                      Revenue
                      <strong>
                        <Money value={t.revenue} currency={a.currency} />
                      </strong>
                    </span>
                    <span>
                      Transactions<strong>{tx.length}</strong>
                    </span>
                  </div>
                  <footer>
                    <span className="avatar small">
                      {["SC", "DH", "SL"][i]}
                    </span>
                    {a.state.team.find((m) => m.branch === b)?.name ||
                      "Unassigned"}
                    <ArrowUpRight size={16} />
                  </footer>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="tabs">
            {[
              "Overview",
              "Financial",
              "Inventory",
              "Customers",
              "Team",
              "Activity",
            ].map((t) => (
              <button
                key={t}
                className={t === tab ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Overview" ? (
            <div className="summary-band">
              <div>
                <span>Revenue</span>
                <strong>
                  <Money
                    value={
                      totals(
                        a.state.transactions.filter(
                          (t) => t.branch === selected,
                        ),
                      ).revenue
                    }
                    currency={a.currency}
                  />
                </strong>
              </div>
              <div>
                <span>Manager</span>
                <strong>
                  {a.state.team.find((t) => t.branch === selected)?.name ||
                    "Unassigned"}
                </strong>
              </div>
              <div>
                <span>Stock alerts</span>
                <strong>
                  {
                    a.state.items.filter(
                      (i) => i.branch === selected && (i.stock || 0) < 20,
                    ).length
                  }
                </strong>
              </div>
            </div>
          ) : tab === "Activity" ? (
            <Timeline
              events={[
                "Branch opened",
                "Manager assigned",
                "Latest statement imported",
                "Daily sales posted",
              ]}
            />
          ) : (
            <div className="panel">
              {a.state[
                tab === "Financial"
                  ? "transactions"
                  : tab === "Inventory"
                    ? "items"
                    : tab === "Customers"
                      ? "customers"
                      : "team"
              ]
                .filter((r) => r.branch === selected)
                .map((r) => (
                  <button
                    className="linked-row"
                    key={r.id}
                    onClick={() =>
                      a.detail(
                        tab === "Financial"
                          ? "transactions"
                          : tab === "Inventory"
                            ? "items"
                            : tab === "Customers"
                              ? "customers"
                              : "team",
                        r,
                      )
                    }
                  >
                    {r.name}
                    <span>
                      {tab === "Inventory" ? (
                        `${r.stock} units`
                      ) : tab === "Team" ? (
                        r.email
                      ) : (
                        <Money value={r.amount} currency={a.currency} />
                      )}
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            </div>
          )}
        </>
      )}
      {editing && (
        <Modal title="Create branch" onClose={() => setEditing(false)}>
          <form
            className="record-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                a.state.locations.some(
                  (l) =>
                    l.name.toLowerCase() === branchName.trim().toLowerCase(),
                )
              ) {
                a.notify("A branch with that name already exists");
                return;
              }
              a.setState((s) => ({
                ...s,
                locations: [
                  ...s.locations,
                  {
                    name: branchName.trim() as typeof a.activeBranch,
                    address,
                    active: true,
                  },
                ],
              }));
              setEditing(false);
              setBranchName("");
              setAddress("");
              a.notify("Branch created. Assign a manager from Team.");
            }}
          >
            <label>
              Branch name
              <input
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
            </label>
            <label>
              Location
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <div className="form-footer">
              <button className="button primary">Create branch</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal title="Deactivate branch?" onClose={() => setConfirm(false)}>
          <div className="pad">
            <p>
              New records can no longer be assigned to {selected}. Existing
              financial records remain available in All branches.
            </p>
            <div className="form-footer">
              <button
                className="button secondary"
                onClick={() => setConfirm(false)}
              >
                Keep active
              </button>
              <button
                className="button danger"
                onClick={() => {
                  a.setState((s) => ({
                    ...s,
                    locations: s.locations.map((l) =>
                      l.name === selected ? { ...l, active: false } : l,
                    ),
                  }));
                  setConfirm(false);
                  setSelected("");
                  a.notify("Branch deactivated. Historical records preserved.");
                }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Integrations() {
  const a = useApp();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const current = a.state.connections.find((c) => c.name === selected);
  const change = (name: string, status: string) => {
    a.setState((s) => ({
      ...s,
      connections: s.connections.map((c) =>
        c.name === name
          ? { ...c, status, sync: status === "Connected" ? "Just now" : c.sync }
          : c,
      ),
    }));
    a.notify(
      `${name} ${status === "Connected" ? "connected in demo mode" : "disconnected"}`,
    );
  };
  const sync = (name: string) => {
    setBusy(name);
    setTimeout(() => {
      a.setState((s) => ({
        ...s,
        connections: s.connections.map((c) =>
          c.name === name ? { ...c, status: "Connected", sync: "Just now" } : c,
        ),
      }));
      setBusy("");
      a.notify(`${name} demo sync complete. No new records found.`);
    }, 1200);
  };
  return (
    <>
      <PageHeader
        title="A connected business runs better."
        description="Bring your sales, banking and operations into one workspace."
      />
      <div className="notice neutral-notice">
        <Link2 size={19} />
        <div>
          <strong>Explore your connected workflow</strong>
          <p>
            Connections are simulated. No credentials or external accounts are
            needed.
          </p>
        </div>
      </div>
      <div className="integration-grid">
        {a.state.connections.map((c, i) => (
          <section className="integration-card" key={c.name}>
            <div className="integration-top">
              <span className={`integration-logo integration-${i}`}>
                {c.name.slice(0, 2)}
              </span>
              <Badge>{c.status}</Badge>
            </div>
            <h2>{c.name}</h2>
            <p>
              {
                [
                  "Orders, sales and inventory in sync.",
                  "Invoice and payment collection.",
                  "Bank statements and payments.",
                  "Your banking activity, connected.",
                  "Wallet payments and transfers.",
                  "Business alerts where you work.",
                  "Connect your business account.",
                ][i]
              }
            </p>
            <footer>
              <span>
                {c.status === "Connected"
                  ? `Synced ${c.sync.toLowerCase()}`
                  : "Set up your connection"}
              </span>
              <button
                className="button secondary compact"
                onClick={() => setSelected(c.name)}
              >
                {c.status === "Connected" ? "Manage" : "Connect"}
                <ArrowUpRight size={13} />
              </button>
            </footer>
          </section>
        ))}
      </div>
      {current && (
        <Modal
          title={`${current.name} connection`}
          onClose={() => setSelected("")}
        >
          <div className="record-form">
            <Badge>{current.status}</Badge>
            <dl className="detail-grid">
              <div>
                <dt>Connected account</dt>
                <dd>
                  {current.status === "Connected"
                    ? "juniper-demo-account"
                    : "Not connected"}
                </dd>
              </div>
              <div>
                <dt>Last sync</dt>
                <dd>{current.sync}</dd>
              </div>
            </dl>
            <label>
              Map to branch
              <select
                value={current.branch}
                onChange={(e) => {
                  const branch = e.target.value as typeof current.branch;
                  a.setState((s) => ({
                    ...s,
                    connections: s.connections.map((c) =>
                      c.name === current.name ? { ...c, branch } : c,
                    ),
                  }));
                }}
              >
                {a.state.locations
                  .filter((l) => l.active)
                  .map((l) => (
                    <option key={l.name}>{l.name}</option>
                  ))}
              </select>
            </label>
            <div className="form-footer">
              {current.status === "Connected" ? (
                <>
                  <button
                    className="button quiet"
                    onClick={() => setConfirm(true)}
                  >
                    Disconnect
                  </button>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={() => sync(current.name)}
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Sync now
                  </button>
                </>
              ) : (
                <button
                  className="button primary"
                  onClick={() => change(current.name, "Connected")}
                >
                  <Link2 size={16} />
                  Connect demo account
                </button>
              )}
            </div>
            {confirm && (
              <div className="inline-error">
                <p>
                  Disconnecting stops future demo syncs. Imported records remain
                  in your ledger.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setConfirm(false)}
                >
                  Keep connected
                </button>{" "}
                <button
                  className="button danger"
                  onClick={() => {
                    change(current.name, "Not Connected");
                    setConfirm(false);
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
export function Settings() {
  const a = useApp();
  const auth = useOptionalAuth();
  const user = auth?.data.users.find((u) => u.id === auth.data.session);
  const [tab, setTab] = useState("Profile");
  const [name, setName] = useState(user?.name || a.state.settings.name);
  const [email, setEmail] = useState(user?.email || a.state.settings.email);
  const [business, setBusiness] = useState(a.state.settings.business);
  const [threshold, setThreshold] = useState(a.state.settings.threshold);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    email: true,
    inventory: true,
    financial: true,
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ledger-preferences");
      if (saved) setPreferences(JSON.parse(saved));
    } catch {
      /* Keep defaults if browser storage is unavailable. */
    }
  }, []);
  const tabs =
    a.role === "Business Owner"
      ? [
          "Profile",
          "Business",
          "Branches",
          "Accounts",
          "Categories",
          "Notifications",
          "Integrations",
          "Security",
          "Appearance",
        ]
      : ["Profile", "Notifications", "Security", "Appearance"];
  return (
    <>
      <PageHeader
        title="Make yourself at home."
        description="A workspace that fits your business and the way you work."
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map((t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              onClick={() => {
                if (["Branches", "Accounts", "Integrations"].includes(t))
                  a.go(t.toLowerCase());
                else setTab(t);
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <section className="panel settings-panel">
          <h2>{tab}</h2>
          <p className="muted">
            {tab === "Profile"
              ? "Your personal information and workspace identity."
              : tab === "Business"
                ? "The details that define your business."
                : "Manage your workspace preferences."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              auth?.setData((d) => ({
                ...d,
                users: d.users.map((u) =>
                  u.id === d.session
                    ? {
                        ...u,
                        name: name.trim(),
                        business: u.business
                          ? { ...u.business, name: business }
                          : u.business,
                      }
                    : u,
                ),
              }));
              a.setState((s) => ({
                ...s,
                settings: { name, email, business, threshold },
              }));
              localStorage.setItem(
                "ledger-preferences",
                JSON.stringify(preferences),
              );
              a.notify("Settings saved");
            }}
          >
            {tab === "Profile" ? (
              <>
                <div className="profile-banner">
                  <span className="avatar large">
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <p>{a.role}</p>
                  </div>
                </div>
                <label className="field">
                  Full name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Email address
                  <input
                    type="email"
                    required
                    value={email}
                    readOnly={!!user}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </>
            ) : tab === "Business" ? (
              <>
                <label className="field">
                  Business name
                  <input
                    required
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                  />
                </label>
                <label className="field">
                  Cash safety threshold (USD)
                  <input
                    type="number"
                    min="0"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  />
                </label>
                <div className="note-box">
                  Base currency: {user?.business?.currency || "USD"}
                  <br />
                  Display exchange rate: USD 1 = KHR 4,100
                </div>
              </>
            ) : tab === "Notifications" ? (
              ["email", "inventory", "financial"].map((p) => (
                <label className="toggle-row" key={p}>
                  <span>{p[0].toUpperCase() + p.slice(1)} notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences[p]}
                    onChange={(e) =>
                      setPreferences((s) => ({ ...s, [p]: e.target.checked }))
                    }
                  />
                </label>
              ))
            ) : tab === "Categories" ? (
              <div>
                {[
                  "Sales",
                  "Ingredients",
                  "Inventory",
                  "Utilities",
                  "Packaging",
                  "Rent",
                  "Other",
                ].map((c) => (
                  <div className="linked-row" key={c}>
                    <Tag size={15} />
                    {c}
                    <Badge>Active</Badge>
                  </div>
                ))}
              </div>
            ) : tab === "Security" ? (
              <div className="note-box">
                <Shield size={24} />
                <h3>Your sign-in</h3>
                <p>
                  This prototype keeps your demo session in this browser. Google
                  sign-in, verification codes, and password recovery are
                  simulated. Use sample information only.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    auth?.setData((d) => ({ ...d, session: undefined }));
                    a.go("forgot-password");
                  }}
                >
                  Reset demo password
                </button>
              </div>
            ) : (
              <>
                <label className="field">
                  Table density
                  <select
                    onChange={(e) => {
                      document.documentElement.dataset.density = e.target.value;
                    }}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <p className="note-box">
                  Light appearance · Designed for clear financial data and
                  accessible contrast.
                </p>
              </>
            )}
            {!["Categories", "Security"].includes(tab) && (
              <div className="form-footer">
                <button className="button primary">
                  <Check size={16} />
                  Save changes
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
