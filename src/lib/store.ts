"use client";
import { useEffect, useState } from "react";
export type Branch = "Phnom Penh Main" | "BKK1" | "Siem Reap";
export const branches: Branch[] = ["Phnom Penh Main", "BKK1", "Siem Reap"];
export type RecordRow = {
  id: string;
  name: string;
  branch: Branch;
  amount: number;
  status: string;
  date: string;
  paid?: number;
  due?: string;
  category?: string;
  account?: string;
  source?: string;
  customer?: string;
  email?: string;
  phone?: string;
  stock?: number;
  cost?: number;
  sku?: string;
  linked?: string;
  currency?: string;
  note?: string;
  activity?: string[];
  transcript?: string;
  originalTranscript?: string;
  subtotal?: number;
  discount?: number;
  taxRate?: number;
  tax?: number;
  lineItems?: { description: string; quantity: number; price: number }[];
};
export type Collection =
  | "transactions"
  | "invoices"
  | "estimates"
  | "payments"
  | "bills"
  | "customers"
  | "items"
  | "sales"
  | "adjustments"
  | "imports"
  | "team";
export type State = { [K in Collection]: RecordRow[] } & {
  locations: { name: Branch; address: string; active: boolean }[];
  connections: { name: string; status: string; branch: Branch; sync: string }[];
  read: string[];
  reconciled: string[];
  scenarios: { name: string; cash: number }[];
  settings: {
    business: string;
    name: string;
    email: string;
    threshold: number;
  };
};
const row = (
  id: string,
  name: string,
  amount: number,
  branch: Branch,
  status: string,
  extra: Partial<RecordRow> = {},
): RecordRow => ({
  id,
  name,
  amount,
  branch,
  status,
  date: "2026-10-05",
  ...extra,
});
export const initial: State = {
  transactions: Array.from({ length: 48 }, (_, i) =>
    row(
      `TX-${1048 - i}`,
      [
        "Weekend café sales",
        "Mekong Fresh Supply",
        "Catering · Lotus Co.",
        "Khmer Coffee Roasters",
        "Retail sales · Shopify",
        "Electricité du Cambodge",
        "Packaging supplies",
        "Morning counter sales",
      ][i % 8],
      [1280, -486, 2450, -325, 860, -128, -94, 640][i % 8] *
        (1 - Math.floor(i / 8) * 0.055),
      branches[i % 3],
      "Completed",
      {
        date: `2026-${i < 30 ? "10" : "09"}-${String(i < 30 ? 5 - (i % 5) : 28 - (i % 8)).padStart(2, "0")}`,
        category: [
          "Sales",
          "Ingredients",
          "Catering",
          "Inventory",
          "Sales",
          "Utilities",
          "Packaging",
          "Sales",
        ][i % 8],
        source: [
          "POS",
          "Receipt OCR",
          "Manual",
          "Bank Import",
          "Shopify",
          "Bank Import",
          "Manual",
          "POS",
        ][i % 8],
        account: ["ABA Business", "ACLEDA Business", "Main Cash Till"][i % 3],
        currency: i % 9 === 0 ? "KHR" : "USD",
        activity: ["Created by Vanda Sok", "Posted to account ledger"],
      },
    ),
  ),
  invoices: [
    row("INV-2026-0014", "Lotus Creative Co.", 2450, branches[0], "Overdue", {
      paid: 500,
      due: "2026-10-02",
      customer: "CUS-001",
    }),
    row("INV-2026-0015", "Raffles Grand Hotel", 3800, branches[2], "Sent", {
      paid: 0,
      due: "2026-10-12",
      customer: "CUS-002",
    }),
    row("INV-2026-0016", "BKK Studio", 1250, branches[1], "Partially Paid", {
      paid: 650,
      due: "2026-10-08",
      customer: "CUS-003",
    }),
    row("INV-2026-0017", "Sokha Events", 860, branches[0], "Overdue", {
      paid: 0,
      due: "2026-10-03",
      customer: "CUS-004",
    }),
    row("INV-2026-0018", "The Little Red Fox", 420, branches[2], "Paid", {
      paid: 420,
      due: "2026-10-01",
      customer: "CUS-005",
    }),
    row("INV-2026-0019", "BKK Studio", 720, branches[1], "Draft", {
      paid: 0,
      due: "2026-10-20",
      customer: "CUS-003",
    }),
  ],
  estimates: [
    row("EST-2026-0041", "Lotus Creative Co.", 3200, branches[0], "Accepted", {
      customer: "CUS-001",
    }),
    row("EST-2026-0042", "Raffles Grand Hotel", 5600, branches[2], "Sent", {
      customer: "CUS-002",
    }),
    row("EST-2026-0043", "BKK Studio", 1850, branches[1], "Draft", {
      customer: "CUS-003",
    }),
  ],
  payments: [
    row("PAY-1001", "Lotus Creative Co.", 500, branches[0], "Completed", {
      linked: "INV-2026-0014",
      account: "ABA Business",
    }),
    row("PAY-1002", "BKK Studio", 650, branches[1], "Completed", {
      linked: "INV-2026-0016",
      account: "ABA Business",
    }),
    row("PAY-1003", "The Little Red Fox", 420, branches[2], "Completed", {
      linked: "INV-2026-0018",
      account: "ACLEDA Business",
    }),
  ],
  bills: [
    row("BILL-2001", "Mekong Fresh Supply", 1280, branches[0], "Due today", {
      paid: 0,
      due: "2026-10-05",
      category: "Ingredients",
    }),
    row(
      "BILL-2002",
      "Khmer Coffee Roasters",
      840,
      branches[1],
      "Due this week",
      { paid: 0, due: "2026-10-08", category: "Inventory" },
    ),
    row("BILL-2003", "Siem Reap Properties", 1800, branches[2], "Later", {
      paid: 0,
      due: "2026-10-20",
      category: "Rent",
    }),
  ],
  customers: [
    "Lotus Creative Co.",
    "Raffles Grand Hotel",
    "BKK Studio",
    "Sokha Events",
    "The Little Red Fox",
  ].map((n, i) =>
    row(
      `CUS-00${i + 1}`,
      n,
      [12450, 28600, 8900, 5420, 3280][i],
      branches[[0, 2, 1, 0, 2][i]],
      "Active",
      {
        email: [
          "dara@lotus.example",
          "accounts@raffles.example",
          "hello@bkkstudio.example",
          "sokha@events.example",
          "hello@redfox.example",
        ][i],
        phone: `+855 12 345 60${i}`,
      },
    ),
  ),
  items: [
    "Mondulkiri coffee beans",
    "Oat milk · 1 L",
    "Kampot pepper",
    "Takeaway cups · 12 oz",
    "Palm sugar",
    "House blend · 250 g",
  ].flatMap((n, i) =>
    branches.map((b, j) =>
      row(
        `ITM-${i + 1}-${j}`,
        n,
        [14, 3.5, 8, 0.18, 2.8, 9.5][i],
        b,
        i === 1 || i === 3 ? "Low stock" : "In stock",
        {
          stock: [42, 8, 65, 12, 88, 34][i] + j * 3,
          cost: [7, 2, 4, 0.09, 1.2, 4.5][i],
          sku: `SKU-0${i + 1}`,
          category: [
            "Coffee",
            "Dairy",
            "Ingredients",
            "Packaging",
            "Ingredients",
            "Coffee",
          ][i],
        },
      ),
    ),
  ),
  sales: [
    row(
      "SALE-1001",
      "Counter sale · House blend",
      95,
      branches[0],
      "Completed",
      { linked: "ITM-6-0", source: "POS", note: "10 units" },
    ),
    row(
      "SALE-1002",
      "Shopify · Coffee subscription",
      140,
      branches[1],
      "Completed",
      { linked: "ITM-1-1", source: "Shopify", note: "10 units" },
    ),
  ],
  adjustments: [],
  imports: [
    row("IMP-101", "ABA_September_2026.csv", 103, branches[0], "Needs Review", {
      source: "Bank Statement",
      note: "2 unmatched entries",
    }),
    row("IMP-102", "October_inventory.xlsx", 24, branches[1], "Completed", {
      source: "Items",
    }),
    row("IMP-103", "Receipt_Mekong_Fresh.jpg", 1, branches[0], "Completed", {
      source: "Receipts",
      linked: "TX-1047",
    }),
  ],
  team: [
    row("USR-1", "Sophea Chan", 0, branches[0], "Active", {
      email: "sophea@juniper.example",
      note: "Active 12 minutes ago",
    }),
    row("USR-2", "Dara Sok", 0, branches[1], "Active", {
      email: "manager@example.com",
      note: "Active 1 hour ago",
    }),
    row("USR-3", "Sreyneang Lim", 0, branches[2], "Pending Invitation", {
      email: "sreyneang@juniper.example",
      note: "Invited yesterday",
    }),
  ],
  locations: branches.map((name, i) => ({
    name,
    address: [
      "Street 240, Daun Penh",
      "Street 51, Boeung Keng Kang",
      "Wat Bo Road, Siem Reap",
    ][i],
    active: true,
  })),
  connections: [
    "Shopify",
    "WeBill365",
    "ABA",
    "ACLEDA",
    "Wing",
    "Telegram",
    "Google",
  ].map((name, i) => ({
    name,
    status:
      i === 0 || i === 2
        ? "Connected"
        : i === 1
          ? "Needs Attention"
          : "Not Connected",
    branch: branches[i % 3],
    sync: i === 0 || i === 2 ? "Today, 09:42" : "Never",
  })),
  read: [],
  reconciled: [],
  scenarios: [],
  settings: {
    business: "Juniper & Co.",
    name: "Vanda Sok",
    email: "vanda@juniper.example",
    threshold: 2000,
  },
};
export function useStore() {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ledger-demo-v1");
      if (saved) setState({ ...initial, ...JSON.parse(saved) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("ledger-demo-v1", JSON.stringify(state));
  }, [state, ready]);
  return [state, setState] as const;
}
export const id = (prefix: string) =>
  `${prefix}-${Date.now().toString().slice(-8)}`;
export const today = "2026-10-05";
export const accountBase: Record<string, number> = {
  "ABA Business": 28460,
  "ACLEDA Business": 16200,
  "Wing Wallet": 2480,
  "Main Cash Till": 1860,
};
export function totals(rows: RecordRow[]) {
  const revenue = rows
    .filter((r) => r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);
  const expenses = -rows
    .filter((r) => r.amount < 0)
    .reduce((s, r) => s + r.amount, 0);
  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    margin: revenue ? ((revenue - expenses) / revenue) * 100 : 0,
  };
}
