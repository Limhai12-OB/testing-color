import {
  emptyInvoice,
  INVOICE_DEMO_DATE,
  type InvoiceDraft,
  type InvoiceLine,
} from "./invoice";
import type { RecordRow } from "./store";
export const voiceDemos = [
  {
    name: "Café order",
    hint: "Two items · USD · relative date",
    text: "Create an invoice for Dara Coffee for 20 iced lattes at $2 each and 10 croissants at $1.50 each, due next Friday.",
  },
  {
    name: "Catering in riel",
    hint: "KHR · service · seven days",
    text: "Invoice Sokha Mart 200,000 riel for catering services, due in seven days.",
  },
  {
    name: "A few details missing",
    hint: "Try the clarification experience",
    text: "Create an invoice for Vanna Shop for five coffee boxes.",
  },
  {
    name: "Existing records",
    hint: "Customer match · catalog price difference",
    text: "Create an invoice for Lotus Creative Co. in Phnom Penh Main for 10 Mondulkiri coffee beans at 12 dollars each, due October 25.",
  },
];
const words: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
export function numberWords(input: string) {
  return input
    .toLowerCase()
    .replace(/(?<=\d),(?=\d{3}\b)/g, "")
    .replace(/(\d+)\s+thousand\b/g, (_, value) => String(Number(value) * 1000))
    .replace(
      /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[ -]+(?:and[ -]+)?(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand))*\b/g,
      (phrase) => {
        let value = 0,
          total = 0;
        for (const w of phrase.split(/[ -]+/)) {
          if (w === "hundred") value = (value || 1) * 100;
          else if (w === "thousand") {
            total += (value || 1) * 1000;
            value = 0;
          } else value += words[w] || 0;
        }
        return String(total + value);
      },
    )
    .replace(/(\d+)\s+thousand\b/g, (_, v) => String(Number(v) * 1000))
    .replace(
      /(\d+)\s+dollars?\s+(\d{1,2})(?:\s+cents?)?/g,
      (_, d, c) => `${d}.${String(c).padStart(2, "0")} dollars`,
    );
}
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function resolveDueDate(
  text: string,
  anchor = INVOICE_DEMO_DATE,
): { date: string; explanation: string } {
  const normalized = numberWords(text);
  const match = normalized.match(/\bdue\s+(?:on\s+)?([^.;]+)/);
  if (!match) return { date: "", explanation: "" };
  const phrase = match[1].split(/,|\s+with\s+|\s+and\s+/)[0].trim();
  const base = new Date(anchor + "T12:00:00Z");
  let date = "";
  if (/tomorrow/.test(phrase)) {
    base.setUTCDate(base.getUTCDate() + 1);
    date = iso(base);
  } else if (/in (\d+) days?/.test(phrase)) {
    base.setUTCDate(base.getUTCDate() + Number(phrase.match(/in (\d+)/)![1]));
    date = iso(base);
  } else {
    const weekdays = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const day = weekdays.findIndex((d) => phrase.includes(d));
    if (day >= 0) {
      base.setUTCDate(
        base.getUTCDate() + ((day - base.getUTCDay() + 7) % 7 || 7),
      );
      date = iso(base);
    } else {
      const months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const m = phrase.match(
        /([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/,
      );
      const exact = phrase.match(/\d{4}-\d{2}-\d{2}/);
      if (exact) {
        const parsed = new Date(exact[0] + "T12:00:00Z");
        if (!isNaN(parsed.getTime()) && iso(parsed) === exact[0])
          date = exact[0];
      } else if (m && months.includes(m[1])) {
        const target = new Date(
          Date.UTC(
            Number(m[3] || base.getUTCFullYear()),
            months.indexOf(m[1]),
            Number(m[2]),
            12,
          ),
        );
        if (
          target.getUTCMonth() === months.indexOf(m[1]) &&
          target.getUTCDate() === Number(m[2])
        )
          date = iso(target);
      }
    }
  }
  return {
    date,
    explanation: date
      ? `Interpreted “${phrase}” as ${date}, relative to ${anchor}. Please check this date.`
      : `Could not resolve “${phrase}”. Choose the due date.`,
  };
}
export function extractInvoice(
  transcript: string,
  options: {
    role: string;
    activeBranch: string;
    scope: string;
    branches: string[];
    date?: string;
  },
): InvoiceDraft {
  const draft = emptyInvoice();
  draft.source = "Voice + AI";
  draft.transcript = transcript;
  draft.date = options.date || INVOICE_DEMO_DATE;
  const text = numberWords(transcript);
  const khr = /riel|៛|\bkhr\b/.test(text),
    usd = /\$|dollars?|\busd\b/.test(text);
  draft.currency = khr && !usd ? "KHR" : usd && !khr ? "USD" : "";
  if (khr && usd)
    draft.warnings.push(
      "Multiple currencies detected. Confirm the currency and all prices.",
    );
  const branch = options.branches.find((b) => text.includes(b.toLowerCase()));
  draft.branch =
    options.role === "Branch Manager"
      ? options.activeBranch
      : branch || (options.scope !== "All branches" ? options.scope : "");
  const name = transcript.match(
    /(?:create\s+(?:an?\s+)?invoice\s+for|invoice\s+for|invoice)\s+(.+?)(?=\s+for\s+|\s+in\s+|\s+(?:\d|\$)|,|$)/i,
  );
  draft.customerName = name?.[1].trim() || "";
  const { date, explanation } = resolveDueDate(transcript, draft.date);
  draft.due = date;
  draft.dueInterpretation = explanation;
  const body = text.split(
    /\bdue\b|\bdiscount\b|\bwith\s+\d+(?:\.\d+)?\s*%|\bnotes?:/,
  )[0];
  const lines: InvoiceLine[] = [];
  const pattern =
    /(?<![\w.])(\d+(?:\.\d+)?)\s+([^,]+?)\s+(?:at|for)\s*[$៛]?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd|riel|khr|៛)?\s*(?:each|per\s+\w+)?(?=\s+and\s+\d|,|[.]?\s*$)/g;
  for (const m of body.matchAll(pattern)) {
    let description = m[2].replace(/^boxes? of /, "").trim();
    lines.push({
      description: description.charAt(0).toUpperCase() + description.slice(1),
      quantity: Number(m[1]),
      price: Number(m[3]),
    });
  }
  if (!lines.length) {
    const service = body.match(
      /(?:\s|^)(\d+(?:\.\d+)?)\s*(?:dollars?|usd|riel|khr|៛)\s+for\s+(.+?)[.,]?\s*$/,
    );
    if (service)
      lines.push({
        description: service[2].trim(),
        quantity: 1,
        price: Number(service[1]),
      });
    else {
      const explicitTotal = body.match(
        /\bfor\s+(?:[$៛]\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollars?|usd|riel|khr|៛))(?=\s|[.,]|$)/,
      );
      const item = body.match(/\bfor\s+(\d+(?:\.\d+)?)\s+(.+?)[.,]?\s*$/);
      if (explicitTotal)
        lines.push({
          description: "",
          quantity: 1,
          price: Number(explicitTotal[1] || explicitTotal[2]),
        });
      else if (item)
        lines.push({
          description: item[2].trim(),
          quantity: Number(item[1]),
          price: "",
        });
      else {
        const total = body.match(
          /(?:\bfor\s+|\s)[$៛]?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd|riel|khr|៛)(?=\s|[.,]|$)/,
        );
        if (total)
          lines.push({ description: "", quantity: 1, price: Number(total[1]) });
      }
    }
  }
  draft.lineItems = lines.length
    ? lines
    : [{ description: "", quantity: "", price: "" }];
  const discount = text.match(
    /(?:discount(?: of)?\s*[$៛]?\s*)(\d+(?:\.\d+)?)(\s*%)?/,
  );
  if (discount) {
    if (discount[2])
      draft.discount = Number(
        (
          (lines.reduce((s, l) => s + Number(l.price) * Number(l.quantity), 0) *
            Number(discount[1])) /
          100
        ).toFixed(draft.currency === "KHR" ? 0 : 2),
      );
    else draft.discount = Number(discount[1]);
  }
  const tax = text.match(
    /(\d+(?:\.\d+)?)\s*%\s*tax|tax(?: of)?\s+(\d+(?:\.\d+)?)\s*%/,
  );
  if (tax) draft.taxRate = Number(tax[1] || tax[2]);
  else if (/\btax\b/.test(text))
    draft.warnings.push(
      "Tax was mentioned without a clear percentage. Confirm the tax rate.",
    );
  draft.note = transcript.match(/\bnotes?:\s*(.+)/i)?.[1] || "";
  if (!lines.length)
    draft.warnings.push(
      "Some item information was not understood. Your transcript is preserved; complete the fields below.",
    );
  return draft;
}
export function matchingRecords(name: string, records: RecordRow[]) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\b(lattes|croissants|coffees)\b/g, (w) => w.slice(0, -1))
      .trim();
  const query = normalize(name);
  if (!query) return [];
  const exact = records.filter((r) => normalize(r.name) === query);
  if (exact.length) return exact;
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  return records
    .filter((r) => words.some((w) => normalize(r.name).includes(w)))
    .slice(0, 4);
}
