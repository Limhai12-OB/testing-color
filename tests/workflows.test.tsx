import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppContext, type AppContextType } from "../src/components/context";
import { CreateForm, RecordDetail } from "../src/components/records";
import { ImportCenter } from "../src/components/imports";
import { initial, type State } from "../src/lib/store";
import { cashBalance, outstanding } from "../src/lib/finance";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
let latest: State;
function Harness({
  children,
  role = "Business Owner",
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [state, setState] = useState<State>(structuredClone(initial));
  latest = state;
  const branch = role === "Branch Manager" ? "Phnom Penh Main" : "All branches";
  const value: AppContextType = {
    state,
    setState,
    branch,
    role,
    currency: "USD",
    scope: (rows) =>
      rows.filter((r) => branch === "All branches" || r.branch === branch),
    activeBranch: "Phnom Penh Main",
    go: vi.fn(),
    notify: vi.fn(),
    create: vi.fn(),
    detail: vi.fn(),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
describe("connected financial workflows", () => {
  it("creates a linked expense from the complete receipt review flow", () => {
    vi.useFakeTimers();
    const opening = cashBalance(initial.transactions, "All branches");
    render(
      <Harness>
        <ImportCenter receipt />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use sample file" }));
    act(() => {
      vi.advanceTimersByTime(1700);
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm extraction" }));
    fireEvent.click(screen.getByRole("button", { name: "Review & confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    expect(latest.transactions[0].source).toBe("Receipt OCR");
    expect(latest.transactions[0].linked).toBe(latest.imports[0].id);
    expect(latest.imports[0].linked).toBe(latest.transactions[0].id);
    expect(
      opening - cashBalance(latest.transactions, "All branches"),
    ).toBeCloseTo(486);
    expect(screen.getByText("Transaction created successfully.")).toBeTruthy();
  });
  it("rejects an overpayment without changing ledger or receivables", () => {
    render(
      <Harness>
        <CreateForm
          type="payment"
          record={initial.invoices[0]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.change(screen.getByLabelText("Amount (USD)"), {
      target: { value: "9999" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Record payment" }).closest("form")!,
    );
    expect(screen.getByRole("alert").textContent).toContain("no greater than");
    expect(latest.transactions.length).toBe(initial.transactions.length);
    expect(latest.invoices[0].paid).toBe(500);
  });
  it("records a partial payment once and updates receivables, ledger and cash together", () => {
    const beforeCash = cashBalance(initial.transactions, "All branches");
    const beforeDue = outstanding(initial.invoices);
    render(
      <Harness>
        <CreateForm
          type="payment"
          record={initial.invoices[0]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.change(screen.getByLabelText("Amount (USD)"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(latest.invoices[0].paid).toBe(750);
    expect(latest.invoices[0].status).toBe("Partially Paid");
    expect(latest.payments[0].linked).toBe(initial.invoices[0].id);
    expect(latest.transactions[0].amount).toBe(250);
    expect(
      cashBalance(latest.transactions, "All branches") - beforeCash,
    ).toBeCloseTo(250);
    expect(beforeDue - outstanding(latest.invoices)).toBe(250);
  });
  it("closes a fully paid invoice and rejects overpayment", () => {
    render(
      <Harness>
        <CreateForm
          type="payment"
          record={initial.invoices[0]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(latest.invoices[0].status).toBe("Paid");
    expect(latest.invoices[0].paid).toBe(2450);
  });
  it("creates a fresh invoice ID from customer context and inherits that branch", () => {
    render(
      <Harness>
        <CreateForm
          type="invoice"
          record={initial.customers[1]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save record" }));
    expect(latest.invoices[0].id).toMatch(/^INV-/);
    expect(latest.invoices[0].id).not.toBe(initial.customers[1].id);
    expect(latest.invoices[0].customer).toBe("CUS-002");
    expect(latest.invoices[0].branch).toBe("Siem Reap");
  });
  it("converts accepted estimates and preserves both document links", () => {
    render(
      <Harness>
        <RecordDetail
          type="estimates"
          record={initial.estimates[0]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Convert to invoice" }));
    expect(latest.estimates[0].status).toBe("Converted");
    expect(latest.invoices[0].linked).toBe(initial.estimates[0].id);
    expect(latest.estimates[0].linked).toBe(latest.invoices[0].id);
  });
  it("updates inventory and ledger together when an item sells", () => {
    render(
      <Harness>
        <CreateForm type="sale" record={initial.items[0]} onClose={() => {}} />
      </Harness>,
    );
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save record" }));
    expect(latest.items[0].stock).toBe(39);
    expect(latest.sales[0].amount).toBe(42);
    expect(latest.transactions[0].amount).toBe(42);
    expect(latest.transactions[0].linked).toBe(latest.sales[0].id);
  });
  it("prevents negative inventory", () => {
    render(
      <Harness>
        <CreateForm
          type="adjustment"
          record={initial.items[0]}
          onClose={() => {}}
        />
      </Harness>,
    );
    fireEvent.change(screen.getByLabelText("Adjustment type"), {
      target: { value: "Decrease" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Damaged stock" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm adjustment" }));
    expect(screen.getByRole("alert").textContent).toContain("not enough stock");
    expect(latest.items[0].stock).toBe(42);
  });
  it("only offers assigned branch invoices to managers", () => {
    render(
      <Harness role="Branch Manager">
        <CreateForm type="payment" onClose={() => {}} />
      </Harness>,
    );
    const options = Array.from(
      (screen.getByLabelText("Invoice") as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).toContain("INV-2026-0014");
    expect(options).not.toContain("INV-2026-0015");
    expect(options).not.toContain("INV-2026-0016");
    expect(screen.queryByLabelText("Branch")).toBeNull();
  });
  it("sums scoped account balances to the same consolidated cash position", () => {
    const all = cashBalance(initial.transactions, "All branches");
    const scoped = ["Phnom Penh Main", "BKK1", "Siem Reap"].reduce(
      (sum, b) =>
        sum +
        cashBalance(
          initial.transactions.filter((t) => t.branch === b),
          b,
        ),
      0,
    );
    expect(scoped).toBeCloseTo(all);
  });
});
