"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Wallet,
  CheckCheck,
  Users,
  FileCheck,
  FileText,
  CreditCard,
  Receipt,
  Package,
  ShoppingBag,
  ListRestart,
  Sparkles,
  ChartNoAxesCombined,
  TrendingUp,
  Building2,
  UserRound,
  Upload,
  Blocks,
  Bell,
  Settings as SettingsIcon,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ArrowUpRight,
  X,
  Check,
  ArrowRight,
  CircleHelp,
  LogOut,
} from "lucide-react";
import {
  branches,
  useStore,
  type RecordRow,
  type Collection,
} from "@/lib/store";
import { AppContext } from "./context";
import { useAuth } from "./auth-context";
import { Modal, PageHeader, Badge, Empty } from "./ui";
import { Dashboard } from "./dashboard";
import { Records, CreateForm, RecordDetail } from "./records";
import { ImportCenter, Reconciliation } from "./imports";
import { Advisor, Reports, Forecast } from "./intelligence";
import { Banking, Branches, Integrations, Settings } from "./organization";
import { VoiceInvoice } from "./voice-invoice";
const groups = [
  { label: "WORKSPACE", items: [["Dashboard", "dashboard", LayoutDashboard]] },
  {
    label: "MONEY",
    items: [
      ["Transactions", "transactions", ArrowLeftRight],
      ["Banking", "banking", Landmark],
      ["Accounts", "accounts", Wallet],
      ["Reconciliation", "reconciliation", CheckCheck],
    ],
  },
  {
    label: "SALES",
    items: [
      ["Customers", "customers", Users],
      ["Estimates", "estimates", FileCheck],
      ["Invoices", "invoices", FileText],
      ["Payments", "payments", CreditCard],
    ],
  },
  {
    label: "PURCHASES",
    items: [
      ["Bills", "bills", Receipt],
      ["Expenses", "expenses", Wallet],
    ],
  },
  {
    label: "INVENTORY",
    items: [
      ["Items", "items", Package],
      ["Sales", "sales", ShoppingBag],
      ["Stock adjustments", "adjustments", ListRestart],
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      ["AI advisor", "advisor", Sparkles],
      ["Monthly reports", "reports", ChartNoAxesCombined],
      ["Forecasting", "forecasting", TrendingUp],
    ],
  },
  {
    label: "ORGANIZATION",
    items: [
      ["Branches", "branches", Building2],
      ["Team", "team", UserRound],
    ],
  },
  {
    label: "CONNECTIONS",
    items: [
      ["Import center", "imports", Upload],
      ["Integrations", "integrations", Blocks],
    ],
  },
];
const ownerOnly = ["forecasting", "branches", "team", "integrations"];
const quick = [
  ["Create Invoice by Voice", "voice-invoice"],
  ["New transaction", "transaction"],
  ["New invoice", "invoice"],
  ["New bill", "bill"],
  ["New customer", "customer"],
  ["New estimate", "estimate"],
  ["Record payment", "payment"],
  ["Upload receipt", "receipt"],
  ["Import statement", "import"],
  ["Stock adjustment", "adjustment"],
];
export default function Workspace() {
  const auth = useAuth();
  const user = auth.user!;
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const [state, setState] = useStore();
  const [selectedBranch, setBranch] = useState("All branches");
  const branch =
    user.role === "BRANCH_MANAGER"
      ? user.assignedBranch || "BKK1"
      : selectedBranch;
  const [currency, setCurrency] = useState(user.business?.currency || "USD");
  const role = user.role === "OWNER" ? "Business Owner" : "Branch Manager";
  useEffect(() => {
    setState((s) => ({
      ...s,
      team: s.team.map((member) => {
        const account = auth.data.users.find((u) => u.email === member.email);
        return account
          ? {
              ...member,
              name: account.name,
              status: account.status === "ACTIVE" ? "Active" : "Inactive",
              branch: account.assignedBranch || member.branch,
            }
          : member;
      }),
      settings: {
        ...s.settings,
        name: user.name,
        email: user.email,
        business: user.business?.name || s.settings.business,
      },
    }));
  }, [user.name, user.email, user.business, auth.data.users, setState]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([
    "PURCHASES",
    "INVENTORY",
    "ORGANIZATION",
    "CONNECTIONS",
  ]);
  const [command, setCommand] = useState(false);
  const [q, setQ] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("All");
  const [form, setForm] = useState<{ type: string; record?: RecordRow } | null>(
    null,
  );
  const [detail, setDetail] = useState<{
    type: string;
    record: RecordRow;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [help, setHelp] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page =
    pathname === "/overview"
      ? "dashboard"
      : pathname.split("/")[1] || "dashboard";
  const activeBranch =
    role === "Branch Manager"
      ? user.assignedBranch || "BKK1"
      : state.locations.some((l) => l.name === branch)
        ? (branch as (typeof branches)[number])
        : "Phnom Penh Main";
  const scope = (rows: RecordRow[]) =>
    rows.filter((r) => branch === "All branches" || r.branch === branch);
  const go = (path: string) => {
    router.push("/" + path.replace(/^\//, ""));
    setMobile(false);
    setCommand(false);
    setNotifications(false);
    setQuickOpen(false);
    setDetail(null);
  };
  const notify = (message: string) => setToast(message);
  const create = (type: string, record?: RecordRow) => {
    setQuickOpen(false);
    setCommand(false);
    if (type === "voice-invoice") {
      go("invoices/voice");
      return;
    }
    if (type === "receipt") {
      go("receipts");
      return;
    }
    if (type === "import") {
      go("imports");
      return;
    }
    if (type === "edit-invoice") {
      go(`invoices/edit?record=${record?.id}`);
      return;
    }
    if (["invoice", "estimate"].includes(type)) {
      setForm(null);
      go(
        `${type === "invoice" ? "invoices" : "estimates"}/new${record?.id ? `?customer=${record.id}` : ""}`,
      );
      return;
    }
    setForm({ type, record });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((c) => !c);
      }
      if (e.key === "Escape") {
        setProfileOpen(false);
        setQuickOpen(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const b = params.get("branch");
    if (
      role === "Business Owner" &&
      b &&
      state.locations.some((l) => l.name === b)
    )
      setBranch(b);
  }, [params, role]);
  const switchRole = (value: string) => {
    const account = auth.data.users.find(
      (u) => u.id === (value === "Business Owner" ? "owner" : "manager"),
    );
    if (account) auth.setData((d) => ({ ...d, session: account.id }));
    setBranch(value === "Branch Manager" ? "Phnom Penh Main" : "All branches");
    setDetail(null);
    setForm(null);
    if (value === "Branch Manager" && ownerOnly.includes(page)) go("dashboard");
  };
  const overdue = scope(state.invoices).filter(
    (i) => i.status === "Overdue",
  ).length;
  const notices = [
    ...scope(state.invoices)
      .filter((i) => i.source === "Voice + AI" && i.status === "Draft")
      .slice(0, 3)
      .map((i) => ({
        id: `voice-${i.id}`,
        title: `${i.id} is ready to send`,
        description: `Voice invoice for ${i.name}. Review and send when ready.`,
        category: "Financial",
        path: `invoices?search=${i.id}`,
        icon: FileText,
      })),
    {
      id: "n1",
      title: `${overdue} invoices are overdue`,
      description: "A friendly follow-up can keep cash moving.",
      category: "Financial",
      path: "invoices?status=Overdue",
      icon: FileText,
    },
    {
      id: "n2",
      title: "Supplier payments are coming up",
      description: "Review your bills and plan the week ahead.",
      category: "Financial",
      path: "bills",
      icon: Receipt,
    },
    {
      id: "n3",
      title: `${scope(state.items).filter((i) => (i.stock || 0) < 20).length} items are running low`,
      description: "Keep your best sellers ready for tomorrow.",
      category: "Inventory",
      path: "items?status=Low%20stock",
      icon: Package,
    },
    {
      id: "n4",
      title: "Your statement needs a final review",
      description: "Match remaining entries to complete the report.",
      category: "Financial",
      path: "reconciliation",
      icon: Landmark,
    },
    {
      id: "n5",
      title: "Monthly report is ready",
      description: "See the story behind your September numbers.",
      category: "System",
      path: "reports",
      icon: ChartNoAxesCombined,
    },
    {
      id: "n6",
      title: "Receipt extraction ready to review",
      description: "Confirm a sample receipt and post the expense.",
      category: "System",
      path: "receipts",
      icon: Receipt,
    },
  ];
  const results = (
    ["transactions", "customers", "invoices", "bills", "items"] as Collection[]
  ).flatMap((type) =>
    scope(state[type])
      .filter(
        (r) =>
          q.length > 0 &&
          `${r.name} ${r.id}`.toLowerCase().includes(q.toLowerCase()),
      )
      .slice(0, 4)
      .map((r) => ({ type, record: r })),
  );
  const closeForm = useCallback(() => setForm(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const protectedPage = role === "Branch Manager" && ownerOnly.includes(page);
  const isNew = pathname.endsWith("/new") || pathname.endsWith("/edit");
  const editingInvoice = pathname.endsWith("/edit");
  const content = protectedPage ? (
    <Empty
      title="This workspace belongs to the business owner"
      description="Your branch’s day-to-day tools are available in the navigation."
      action={
        <button className="button primary" onClick={() => go("dashboard")}>
          Go to dashboard
        </button>
      }
    />
  ) : pathname === "/invoices/voice" ? (
    <VoiceInvoice />
  ) : isNew && ["invoices", "estimates"].includes(page) ? (
    <>
      <PageHeader
        eyebrow={`${page.toUpperCase()} / NEW`}
        title={`${editingInvoice ? "Edit" : "Create"} ${page === "invoices" ? "invoice" : "estimate"}`}
        description="Start a connected document, from customer to payment."
      />
      <section className="panel document-form">
        <CreateForm
          key={pathname}
          type={
            editingInvoice
              ? "edit-invoice"
              : page === "invoices"
                ? "invoice"
                : "estimate"
          }
          record={
            editingInvoice
              ? scope(state.invoices).find((i) => i.id === params.get("record"))
              : scope(state.customers).find(
                  (c) => c.id === params.get("customer"),
                )
          }
          onClose={() => go(page)}
        />
      </section>
    </>
  ) : page === "dashboard" ? (
    <Dashboard />
  ) : [
      "transactions",
      "expenses",
      "invoices",
      "estimates",
      "bills",
      "payments",
      "customers",
      "items",
      "sales",
      "adjustments",
      "team",
    ].includes(page) ? (
    <Records key={page} type={page as Collection} />
  ) : page === "banking" || page === "accounts" ? (
    <Banking />
  ) : page === "imports" || page === "receipts" ? (
    <ImportCenter key={page} receipt={page === "receipts"} />
  ) : page === "reconciliation" ? (
    <Reconciliation />
  ) : page === "advisor" ? (
    <Advisor />
  ) : page === "reports" ? (
    <Reports />
  ) : page === "forecasting" ? (
    <Forecast />
  ) : page === "branches" ? (
    <Branches />
  ) : page === "integrations" ? (
    <Integrations />
  ) : page === "settings" ? (
    <Settings />
  ) : (
    <Empty
      title="Let’s get you back to your workspace"
      description="This page isn’t part of the demo workspace."
      action={
        <button className="button primary" onClick={() => go("dashboard")}>
          Open dashboard
        </button>
      }
    />
  );
  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        branch,
        currency,
        role,
        scope,
        go,
        notify,
        create,
        detail: (type, record) => setDetail({ type, record }),
        activeBranch,
      }}
    >
      <div
        className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {mobile && (
          <button
            aria-label="Close navigation"
            className="mobile-backdrop"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className="sidebar">
          <div className="brand-row">
            <button
              className="wordmark"
              onClick={() => go("dashboard")}
              aria-label="Ledger home"
            >
              <span className="brand-mark">l</span>
              <span className="brand-name">
                ledger<span className="brand-dot">.</span>
              </span>
            </button>
            <button
              className="icon-button sidebar-collapse"
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
          <div className="business-switch">
            <span className="business-avatar">
              {user.business?.logo ? (
                <img
                  src={user.business.logo}
                  alt="Business logo"
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              ) : (
                state.settings.business[0]
              )}
            </span>
            <div>
              <strong>{state.settings.business}</strong>
              <small>Business workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <button className="sidebar-search" onClick={() => setCommand(true)}>
            <Search size={15} />
            <span>Quick search</span>
            <kbd>⌘ K</kbd>
          </button>
          <nav className="main-nav">
            {groups.map((g) => {
              const items = g.items.filter(
                (i) =>
                  role === "Business Owner" ||
                  !ownerOnly.includes(String(i[1])),
              );
              if (!items.length) return null;
              const closed =
                closedGroups.includes(g.label) &&
                !items.some((i) => i[1] === page);
              return (
                <div className="nav-group" key={g.label}>
                  <button
                    className="nav-group-heading"
                    onClick={() =>
                      setClosedGroups((s) =>
                        s.includes(g.label)
                          ? s.filter((x) => x !== g.label)
                          : [...s, g.label],
                      )
                    }
                  >
                    <span>{g.label}</span>
                    {closed ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                  {(!closed || collapsed) &&
                    items.map(([label, path, Icon]) => {
                      const I = Icon as typeof LayoutDashboard;
                      return (
                        <button
                          key={String(path)}
                          title={String(label)}
                          className={`nav-item ${page === path ? "active" : ""}`}
                          onClick={() => go(String(path))}
                        >
                          <I size={17} strokeWidth={1.7} />
                          <span>{String(label)}</span>
                          {path === "invoices" && overdue > 0 && (
                            <small className="nav-count">{overdue}</small>
                          )}
                          {path === "advisor" && (
                            <small className="ai-pill">AI</small>
                          )}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => go("settings")}
              title="Settings"
            >
              <SettingsIcon size={17} />
              <span>Settings</span>
            </button>
            <button
              className="nav-item"
              onClick={() => setHelp(true)}
              title="Help & getting started"
            >
              <CircleHelp size={17} />
              <span>Help & getting started</span>
              <ArrowUpRight size={13} />
            </button>
            <button
              className="profile-button"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <span className="avatar">{initials}</span>
              <span>
                <strong>{state.settings.name}</strong>
                <small>{role}</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="top-header">
            <div className="header-left">
              <button
                className="icon-button mobile-menu"
                onClick={() => setMobile(true)}
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
              <span className="header-breadcrumb">
                Workspace <ChevronRight size={13} />
                <strong>
                  {String(
                    groups
                      .flatMap((g) => g.items)
                      .find((i) => i[1] === page)?.[0] ||
                      page[0].toUpperCase() + page.slice(1),
                  )}
                </strong>
              </span>
            </div>
            <div className="header-controls">
              <div className="branch-control">
                <Building2 size={15} />
                {role === "Business Owner" ? (
                  <select
                    aria-label="Branch scope"
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setDetail(null);
                    }}
                  >
                    <option>All branches</option>
                    {state.locations
                      .filter((l) => l.active)
                      .map((l) => (
                        <option key={l.name}>{l.name}</option>
                      ))}
                  </select>
                ) : (
                  <span>{branch}</span>
                )}
              </div>
              <span className="header-divider" />
              <select
                className="currency-control"
                aria-label="Display currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option>USD</option>
                <option>KHR</option>
                <option value="Dual">USD + KHR</option>
              </select>
              <button
                className="icon-button header-search"
                onClick={() => setCommand(true)}
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setNotifications(true)}
              >
                <Bell size={18} />
                {state.read.length < notices.length && <i />}
              </button>
              <div className="popover-anchor">
                <button
                  className="header-create"
                  aria-label="Quick create"
                  aria-expanded={quickOpen}
                  onClick={() => setQuickOpen(!quickOpen)}
                >
                  <Plus size={19} />
                </button>
                {quickOpen && (
                  <>
                    <button
                      className="popover-dismiss"
                      aria-label="Close quick create"
                      onClick={() => setQuickOpen(false)}
                    />
                    <div className="popover quick-menu">
                      <small>CREATE SOMETHING</small>
                      {quick.map(([label, type]) => (
                        <button key={type} onClick={() => create(type)}>
                          <Plus size={14} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                className="avatar header-avatar"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-label="Profile"
              >
                {initials}
              </button>
            </div>
            {profileOpen && (
              <>
                <button
                  className="popover-dismiss"
                  aria-label="Close profile menu"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="user-menu">
                  <strong>{user.name}</strong>
                  <small>
                    {role}
                    {user.assignedBranch ? ` - ${user.assignedBranch}` : ""}
                  </small>
                  <button
                    onClick={() => {
                      go("settings");
                      setProfileOpen(false);
                    }}
                  >
                    <UserRound size={16} />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      go("settings");
                      setProfileOpen(false);
                    }}
                  >
                    <SettingsIcon size={16} />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      auth.setData((d) => ({
                        ...d,
                        session: undefined,
                        intended: undefined,
                      }));
                      auth.toast("Signed out successfully.");
                      router.push("/login");
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                  {process.env.NODE_ENV === "development" && (
                    <details className="auth-demo">
                      <summary>Developer - Demo Mode</summary>
                      <select
                        aria-label="Demo role"
                        value={role}
                        onChange={(e) => switchRole(e.target.value)}
                      >
                        <option>Business Owner</option>
                        <option>Branch Manager</option>
                      </select>
                    </details>
                  )}
                </div>
              </>
            )}
          </header>
          <main id="main-content" className="main-content" key={pathname}>
            {content}
          </main>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {form && (
        <Modal
          title={
            form.type === "payment" || form.type === "bill-payment"
              ? "Record payment"
              : form.type === "adjustment"
                ? "Adjust stock"
                : form.type === "invite"
                  ? "Invite branch manager"
                  : `New ${form.type}`
          }
          onClose={closeForm}
        >
          <CreateForm
            key={form.type}
            type={form.type}
            record={form.record}
            onClose={closeForm}
          />
        </Modal>
      )}
      {detail && (
        <Modal title="Record details" drawer onClose={closeDetail}>
          <RecordDetail
            type={detail.type}
            record={detail.record}
            onClose={closeDetail}
          />
        </Modal>
      )}
      {command && (
        <Modal
          title="Search your workspace"
          wide
          onClose={() => setCommand(false)}
        >
          <div className="command-search">
            <Search size={21} />
            <input
              autoFocus
              aria-label="Search everything"
              placeholder="Search records or find an action…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="command-results">
            {results.length > 0 && <small>RECORDS</small>}
            {results.map(({ type, record: r }) => (
              <button key={r.id} onClick={() => go(`${type}?search=${r.id}`)}>
                <FileText size={17} />
                <span>
                  <strong>{r.name}</strong>
                  <small>
                    {r.id} · {r.branch}
                  </small>
                </span>
                <Badge>{type}</Badge>
                <ArrowRight size={15} />
              </button>
            ))}
            {q &&
              state.locations
                .map((l) => l.name)
                .filter((b) => b.toLowerCase().includes(q.toLowerCase()))
                .map((b) =>
                  role === "Business Owner" ? (
                    <button
                      key={b}
                      onClick={() => {
                        setBranch(b);
                        go("dashboard");
                      }}
                    >
                      <Building2 size={17} />
                      {b}
                      <ArrowRight size={15} />
                    </button>
                  ) : null,
                )}
            <small>QUICK ACTIONS</small>
            {quick
              .filter(([l]) => !q || l.toLowerCase().includes(q.toLowerCase()))
              .map(([label, type]) => (
                <button key={type} onClick={() => create(type)}>
                  <Plus size={17} />
                  <span>{label}</span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
            {(!q || "ask ai".includes(q.toLowerCase())) && (
              <button onClick={() => go("advisor")}>
                <Sparkles size={17} />
                <span>Ask AI advisor</span>
                <ArrowUpRight size={15} />
              </button>
            )}
            {q &&
              !results.length &&
              !quick.some(([l]) =>
                l.toLowerCase().includes(q.toLowerCase()),
              ) && (
                <p className="muted pad">
                  No matching records. Try a customer name, invoice number, or
                  action.
                </p>
              )}
          </div>
          <footer className="command-footer">
            Search is scoped to {branch}. <span>Ctrl / ⌘ + K to open</span>
          </footer>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Your notifications"
          drawer
          onClose={() => setNotifications(false)}
        >
          <div className="notification-top">
            <p className="muted">A few things worth knowing.</p>
            <button
              className="text-button"
              onClick={() => {
                setState((s) => ({ ...s, read: notices.map((n) => n.id) }));
                notify("All notifications marked read");
              }}
            >
              Mark all read <CheckCheck size={15} />
            </button>
          </div>
          <div className="tabs">
            {["All", "Financial", "Inventory", "System"].map((c) => (
              <button
                key={c}
                className={notificationFilter === c ? "active" : ""}
                onClick={() => setNotificationFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {notices
            .filter(
              (n) =>
                notificationFilter === "All" ||
                n.category === notificationFilter,
            )
            .map((n) => (
              <button
                className={`notification-row ${state.read.includes(n.id) ? "read" : ""}`}
                key={n.id}
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    read: [...new Set([...s.read, n.id])],
                  }));
                  go(n.path);
                }}
              >
                <span className="tiny-icon">
                  <n.icon size={18} />
                </span>
                <span>
                  <strong>{n.title}</strong>
                  <p>{n.description}</p>
                  <small>{n.category} · Today</small>
                  <span className="notification-cta">
                    Review now <ArrowRight size={13} />
                  </span>
                </span>
                {!state.read.includes(n.id) && <i className="unread-dot" />}
              </button>
            ))}
        </Modal>
      )}
      {help && (
        <Modal title="Welcome to Ledger" onClose={() => setHelp(false)}>
          <div className="pad help-content">
            <p>
              A connected financial demo for Juniper & Co. Your changes are
              saved in this browser.
            </p>
            <ol>
              <li>Use the header to change branch or currency.</li>
              <li>
                Try an accepted estimate → convert to invoice → send → record a
                payment.
              </li>
              <li>
                Upload a sample receipt in Import center and follow it into your
                ledger.
              </li>
              <li>
                Use Developer Demo Mode in your profile menu to explore
                restricted access.
              </li>
              <li>
                Open forecasting and move the sliders to compare a scenario.
              </li>
            </ol>
            <p>
              Press <kbd>Ctrl / ⌘ K</kbd> to jump to records and actions.
            </p>
            <button className="button primary" onClick={() => setHelp(false)}>
              Let’s get started <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
