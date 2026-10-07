import { accountBase, branches, type RecordRow } from "./store";
export function accountBalance(name: string, rows: RecordRow[], scope: string) {
  return (
    (scope === "All branches"
      ? accountBase[name]
      : branches.includes(scope as (typeof branches)[number])
        ? accountBase[name] / branches.length
        : 0) +
    rows.filter((r) => r.account === name).reduce((sum, r) => sum + r.amount, 0)
  );
}
export function cashBalance(rows: RecordRow[], scope: string) {
  return Object.keys(accountBase).reduce(
    (sum, name) => sum + accountBalance(name, rows, scope),
    0,
  );
}
export function outstanding(rows: RecordRow[]) {
  return rows
    .filter((r) => !["Draft", "Cancelled"].includes(r.status))
    .reduce((sum, r) => sum + r.amount - (r.paid || 0), 0);
}
