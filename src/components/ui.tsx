"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  X,
  Check,
  Inbox,
} from "lucide-react";
import type { RecordRow } from "@/lib/store";
export function Badge({ children }: { children: React.ReactNode }) {
  const s = String(children);
  return (
    <span
      className={`badge ${/^(Paid|Completed|Connected|Active|Accepted|In stock|Matched|Reviewed|Reconciled)$/.test(s) ? "positive" : /Overdue|Review|Low stock|Attention|Due|Unmatched|Discrepancy/.test(s) ? "warning" : "neutral"}`}
    >
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
export function Money({
  value,
  currency = "USD",
}: {
  value: number;
  currency?: string;
}) {
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
  const khr = `៛${Math.round(value * 4100).toLocaleString()}`;
  return (
    <span className="money">
      {currency === "KHR" ? khr : usd}
      {currency === "Dual" && <small>{khr}</small>}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    ref.current?.querySelector<HTMLElement>("input,button")?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = old;
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className={`overlay ${drawer ? "drawer-overlay" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${drawer ? "drawer" : "modal"} ${wide ? "wide" : ""}`}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Timeline({ events }: { events: string[] }) {
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <div key={i}>
          <span className="timeline-dot" />
          <div>
            <p>{e}</p>
            <small>
              {e.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "Oct 5, 2026"} · Demo
              activity
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export type Column = {
  key: string;
  label: string;
  render?: (r: RecordRow) => React.ReactNode;
  numeric?: boolean;
};
export function DataTable({
  rows,
  columns,
  onRow,
  search: controlledSearch,
  onSearch,
  status,
  onStatus,
  extra,
  bulkAction,
}: {
  rows: RecordRow[];
  columns: Column[];
  onRow?: (r: RecordRow) => void;
  search?: string;
  onSearch?: (s: string) => void;
  status?: string;
  onStatus?: (s: string) => void;
  extra?: React.ReactNode;
  bulkAction?: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(columns.map((c) => c.key));
  const [showColumns, setShowColumns] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const query = controlledSearch ?? q;
  const filtered = rows
    .filter(
      (r) =>
        Object.values(r)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!status ||
          status === "All statuses" ||
          r.status.toLowerCase() === status.toLowerCase()),
    )
    .sort((a, b) => {
      const av = a[sort as keyof RecordRow] ?? "",
        bv = b[sort as keyof RecordRow] ?? "";
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))) * (asc ? 1 : -1)
      );
    });
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);
  const shown = columns.filter((c) => visible.includes(c.key));
  return (
    <div className="table-section">
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search records"
            placeholder="Search records…"
            value={query}
            onChange={(e) => {
              (onSearch ?? setQ)(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <div className="filter-actions">
          {onStatus && (
            <select
              aria-label="Filter status"
              value={status || "All statuses"}
              onChange={(e) => {
                onStatus(e.target.value);
                setPage(0);
              }}
            >
              {[
                "All statuses",
                ...new Set(rows.map((r) => r.status)),
                ...(status &&
                status !== "All statuses" &&
                !rows.some((r) => r.status === status)
                  ? [status]
                  : []),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {extra}
          <div className="popover-anchor">
            <button
              className="button secondary"
              onClick={() => setShowColumns(!showColumns)}
            >
              <SlidersHorizontal size={15} />
              <span>Columns</span>
            </button>
            {showColumns && (
              <div className="popover column-menu">
                {columns.map((c) => (
                  <label key={c.key}>
                    <input
                      type="checkbox"
                      checked={visible.includes(c.key)}
                      onChange={() =>
                        setVisible((v) =>
                          v.includes(c.key)
                            ? v.length > 1
                              ? v.filter((k) => k !== c.key)
                              : v
                            : [...v, c.key],
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="selection-bar">
          {selected.length} selected{" "}
          <button
            onClick={() => {
              bulkAction?.(selected);
              setSelected([]);
            }}
          >
            Mark reviewed <Check size={14} />
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {bulkAction && (
                <th>
                  <input
                    aria-label="Select all shown"
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((r) => r.id) : [],
                      )
                    }
                  />
                </th>
              )}
              {shown.map((c) => (
                <th key={c.key} className={c.numeric ? "numeric" : ""}>
                  <button
                    onClick={() => {
                      setSort(c.key);
                      setAsc(sort === c.key ? !asc : true);
                    }}
                  >
                    {c.label}
                    {sort === c.key ? (
                      asc ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown size={12} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(current * 8, current * 8 + 8).map((r) => (
              <tr key={r.id}>
                {bulkAction && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, r.id]
                            : s.filter((x) => x !== r.id),
                        )
                      }
                    />
                  </td>
                )}
                {shown.map((c, i) => (
                  <td
                    key={c.key}
                    data-label={c.label}
                    className={c.numeric ? "numeric" : ""}
                  >
                    {i === 0 && onRow ? (
                      <button className="row-link" onClick={() => onRow(r)}>
                        {c.render
                          ? c.render(r)
                          : String(r[c.key as keyof RecordRow] ?? "—")}
                      </button>
                    ) : c.render ? (
                      c.render(r)
                    ) : (
                      String(r[c.key as keyof RecordRow] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <Empty
          title="No matching records"
          description="Try another search or clear your filters to see more records."
        />
      )}
      <div className="table-footer">
        <span>
          {filtered.length
            ? `${current * 8 + 1}–${Math.min((current + 1) * 8, filtered.length)}`
            : "0"}{" "}
          of {filtered.length} records
        </span>
        <div>
          <button
            className="icon-button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {current + 1} of {pages}
          </span>
          <button
            className="icon-button"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
