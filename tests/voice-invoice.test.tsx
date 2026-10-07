import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  extractInvoice,
  numberWords,
  resolveDueDate,
  voiceDemos,
  matchingRecords,
} from "../src/lib/voice";
import {
  emptyInvoice,
  invoiceRecord,
  invoiceTotals,
  draftFromRecord,
  validateInvoice,
} from "../src/lib/invoice";
import { initial, type State } from "../src/lib/store";
import { outstanding, cashBalance } from "../src/lib/finance";
import { AppContext, type AppContextType } from "../src/components/context";
import { VoiceInvoice } from "../src/components/voice-invoice";
import { CreateForm } from "../src/components/records";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
const options = {
  role: "Business Owner",
  activeBranch: "Phnom Penh Main",
  scope: "All branches",
  branches: ["Phnom Penh Main", "BKK1", "Siem Reap"],
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("simulated invoice extraction", () => {
  it("extracts the two spoken line items, amount and next-Friday date without inventing a branch", () => {
    const d = extractInvoice(voiceDemos[0].text, options);
    expect(d.customerName).toBe("Dara Coffee");
    expect(d.lineItems).toEqual([
      { description: "Iced lattes", quantity: 20, price: 2 },
      { description: "Croissants", quantity: 10, price: 1.5 },
    ]);
    expect(invoiceTotals(d).total).toBe(55);
    expect(d.currency).toBe("USD");
    expect(d.due).toBe("2026-10-09");
    expect(d.branch).toBe("");
  });
  it("extracts a KHR service and preserves riel exactly through persistence and editing", () => {
    const d = extractInvoice(voiceDemos[1].text, options);
    expect(d.customerName).toBe("Sokha Mart");
    expect(d.lineItems[0]).toEqual({
      description: "catering services",
      quantity: 1,
      price: 200000,
    });
    expect(d.currency).toBe("KHR");
    expect(d.due).toBe("2026-10-13");
    d.branch = initial.customers[0].branch;
    d.customer = initial.customers[0].id;
    const record = invoiceRecord(d, initial.customers[0], "Vanda");
    expect(Math.round(record.amount * 4100)).toBe(200000);
    expect(invoiceTotals(draftFromRecord(record)).total).toBe(200000);
  });
  it("keeps missing fields blank rather than guessing", () => {
    const d = extractInvoice(voiceDemos[2].text, options);
    expect(d.lineItems[0]).toEqual({
      description: "coffee boxes",
      quantity: 5,
      price: "",
    });
    expect(d.currency).toBe("");
    expect(d.due).toBe("");
    expect(d.customer).toBe("");
    expect(
      validateInvoice(d, initial.customers, options.branches).length,
    ).toBeGreaterThan(3);
  });
  it.each([
    ["due tomorrow", "2026-10-07"],
    ["due in 7 days", "2026-10-13"],
    ["due October 25", "2026-10-25"],
    ["due next Friday", "2026-10-09"],
  ])("resolves %s with an explicit reference date", (text, date) => {
    expect(resolveDueDate(text).date).toBe(date);
    expect(resolveDueDate(text).explanation).toContain("2026-10-06");
  });
  it("rejects impossible dates", () => {
    expect(resolveDueDate("due February 30").date).toBe("");
  });
  it("recognizes spoken number words, dollar cents, riel words and the riel symbol", () => {
    expect(
      numberWords(
        "twenty iced lattes at two dollars and ten croissants at one dollar fifty each",
      ),
    ).toContain("1.50 dollars");
    for (const spoken of [
      "200 thousand riel",
      "200,000៛",
      "two hundred thousand riel",
    ]) {
      const d = extractInvoice(`Create an invoice for ${spoken}.`, options);
      expect(d.currency).toBe("KHR");
      expect(d.lineItems[0].price).toBe(200000);
      expect(d.lineItems[0].description).toBe("");
    }
  });
  it("uses an explicitly spoken branch, while managers remain assigned and cannot match other branches", () => {
    const text =
      "Create an invoice for BKK Studio in BKK1 for 5 coffees at 2 dollars each, due tomorrow.";
    expect(extractInvoice(text, options).branch).toBe("BKK1");
    expect(extractInvoice(text, options).lineItems[0].quantity).toBe(5);
    expect(
      extractInvoice(text, {
        ...options,
        role: "Branch Manager",
        branches: ["Phnom Penh Main"],
      }).branch,
    ).toBe("Phnom Penh Main");
    expect(
      matchingRecords(
        "BKK Studio",
        initial.customers.filter((c) => c.branch === "Phnom Penh Main"),
      ),
    ).toHaveLength(0);
  });
  it("recalculates corrected quantities, discount and tax using the shared invoice math", () => {
    const d = extractInvoice(voiceDemos[0].text, options);
    d.lineItems[0].quantity = 12;
    d.discount = 4;
    d.taxRate = 10;
    expect(invoiceTotals(d)).toEqual({
      subtotal: 39,
      discount: 4,
      tax: 3.5,
      total: 38.5,
    });
  });
  it("requires explicit currency confirmation when units conflict", () => {
    const d = extractInvoice(
      "Create an invoice for Lotus for 2 coffees at $2 each and 1 cake at 5000 riel each, due tomorrow.",
      options,
    );
    expect(d.currency).toBe("");
    expect(d.warnings).toContain(
      "Multiple currencies detected. Confirm the currency and all prices.",
    );
  });
});
let latest: State;
function Harness({
  children,
  role = "Business Owner",
  seed = initial,
}: {
  children: React.ReactNode;
  role?: string;
  seed?: State;
}) {
  const [state, setState] = useState(structuredClone(seed));
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
function typeAndExtract(text: string) {
  fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
  fireEvent.change(screen.getByLabelText("Edit transcript"), {
    target: { value: text },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continue · extract invoice" }),
  );
  act(() => vi.advanceTimersByTime(1200));
}
describe("voice invoice journey", () => {
  it("reprocesses edited words without retaining stale prices and saves the original transcript", () => {
    vi.useFakeTimers();
    render(
      <Harness>
        <VoiceInvoice />
      </Harness>,
    );
    typeAndExtract(voiceDemos[3].text);
    expect(
      (screen.getByLabelText("Item 1 unit price") as HTMLInputElement).value,
    ).toBe("12");
    fireEvent.click(
      screen.getByRole("button", { name: "Use item · keep price" }),
    );
    expect(
      (screen.getByLabelText("Item 1 unit price") as HTMLInputElement).value,
    ).toBe("12");
    fireEvent.click(screen.getByRole("button", { name: "Edit transcript" }));
    const updated = voiceDemos[3].text
      .replace("10 Mondulkiri", "2 Mondulkiri")
      .replace("12 dollars", "15 dollars");
    fireEvent.change(screen.getByLabelText("Edit transcript"), {
      target: { value: updated },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Reprocess transcript" }),
    );
    act(() => vi.advanceTimersByTime(1200));
    expect(
      (screen.getByLabelText("Item 1 quantity") as HTMLInputElement).value,
    ).toBe("2");
    expect(
      (screen.getByLabelText("Item 1 unit price") as HTMLInputElement).value,
    ).toBe("15");
    fireEvent.click(screen.getByRole("button", { name: "Use customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(latest.invoices[0].amount).toBe(30);
    expect(latest.invoices[0].transcript).toBe(updated);
    expect(latest.invoices[0].originalTranscript).toBe(voiceDemos[3].text);
  });
  it("requires review, adds an unmatched customer without losing the draft, and creates one ordinary invoice", () => {
    vi.useFakeTimers();
    render(
      <Harness>
        <VoiceInvoice />
      </Harness>,
    );
    typeAndExtract(voiceDemos[0].text);
    expect(latest.invoices).toHaveLength(initial.invoices.length);
    fireEvent.change(screen.getByLabelText("Invoice branch"), {
      target: { value: "Phnom Penh Main" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create new customer" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      (within(dialog).getByLabelText("Name") as HTMLInputElement).value,
    ).toBe("Dara Coffee");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add customer & return" }),
    );
    expect(
      (screen.getByLabelText("Item 1 quantity") as HTMLInputElement).value,
    ).toBe("20");
    fireEvent.change(screen.getByLabelText("Item 1 quantity"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview invoice" }));
    expect(latest.invoices).toHaveLength(initial.invoices.length);
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(latest.invoices).toHaveLength(initial.invoices.length + 1);
    const invoice = latest.invoices[0];
    expect(invoice.amount).toBe(39);
    expect(invoice.source).toBe("Voice + AI");
    expect(invoice.status).toBe("Draft");
    expect(invoice.customer).toBe(latest.customers[0].id);
    expect(invoice.transcript).toBe(voiceDemos[0].text);
    expect(latest.transactions.length).toBe(initial.transactions.length);
    const before = outstanding(initial.invoices);
    fireEvent.click(
      screen.getByRole("button", { name: "Send invoice · demo" }),
    );
    expect(latest.invoices[0].status).toBe("Sent");
    expect(outstanding(latest.invoices) - before).toBe(39);
    expect(screen.getByRole("button", { name: "View invoice" })).toBeTruthy();
  });
  it("supports simulated permission denial and retry without requesting a real microphone", () => {
    vi.useFakeTimers();
    render(
      <Harness>
        <VoiceInvoice />
      </Harness>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Start demo recording" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simulate denied" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "currently blocked",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Allow microphone · demo" }),
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("timer").textContent).toBe("00:02");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Stop recording" })[1],
    );
    act(() => vi.advanceTimersByTime(900));
    expect(
      (screen.getByLabelText("Edit transcript") as HTMLTextAreaElement).value,
    ).toBe(voiceDemos[0].text);
  });
  it("restricts manager review controls and lets them resolve missing fields without restarting", () => {
    vi.useFakeTimers();
    render(
      <Harness role="Branch Manager">
        <VoiceInvoice />
      </Harness>,
    );
    typeAndExtract(voiceDemos[2].text);
    expect(screen.queryByLabelText("Invoice branch")).toBeNull();
    const customerOptions = (
      screen.getByLabelText("Customer") as HTMLSelectElement
    ).options;
    expect(
      Array.from(customerOptions).some((o) => o.text.includes("BKK Studio")),
    ).toBe(false);
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: "CUS-001" },
    });
    fireEvent.change(screen.getByLabelText("Invoice currency"), {
      target: { value: "USD" },
    });
    fireEvent.change(screen.getByLabelText("Item 1 unit price"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(latest.invoices[0].amount).toBe(60);
    expect(latest.invoices[0].branch).toBe("Phnom Penh Main");
  });
  it("settles a voice KHR invoice through the existing payment form without conversion drift", () => {
    const d = extractInvoice(voiceDemos[1].text, options);
    d.branch = initial.customers[0].branch;
    d.customer = initial.customers[0].id;
    const invoice = {
      ...invoiceRecord(d, initial.customers[0], "Vanda"),
      status: "Sent",
    };
    const seed = { ...initial, invoices: [invoice, ...initial.invoices] };
    render(
      <Harness seed={seed}>
        <CreateForm type="payment" record={invoice} onClose={() => {}} />
      </Harness>,
    );
    expect(
      Number((screen.getByLabelText("Amount (KHR)") as HTMLInputElement).value),
    ).toBe(200000);
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(latest.invoices[0].status).toBe("Paid");
    expect(latest.transactions[0].linked).toBe(invoice.id);
    expect(
      Math.round(
        (cashBalance(latest.transactions, "All branches") -
          cashBalance(initial.transactions, "All branches")) *
          4100,
      ),
    ).toBe(200000);
  });
});
