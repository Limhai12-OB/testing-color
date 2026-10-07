# Ledger — connected financial workspace

A frontend-only financial management prototype for a Cambodian SME, built with Next.js App Router, TypeScript, Tailwind CSS, Lucide icons and Recharts.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production run, use `npm run build` followed by `npm start`.

## Explore the connected workflows

- **Estimates → invoices → payments:** Open an accepted estimate, convert it to an invoice, simulate sending it, and record a partial or full payment. The document balance, payment history, account ledger, receivables and cash position update together.
- **Receipt → expense:** Open receipt capture from the header’s `+` menu. Use a sample or select a local file, review extraction, confirm the category, and create the linked transaction.
- **Statement → reconciliation → report:** Open Import center, map sample columns, resolve the missing category and confirm. In Banking / Reconciliation, review statement matches and finish reconciliation to update report completeness.
- **Inventory → sales → ledger:** Open an item, record a sale or adjustment, and inspect its stock history. Sales update stock and create a ledger transaction.
- **Planning:** Change forecasting sliders, rent and branch assumptions. The projected cash and runway recalculate. Save scenarios or set a target budget.
- **Organization:** Create a branch, invite a demo manager, change assignments, and inspect each branch workspace.

The profile menu has a development-only **Demo Mode** role switch. Branch Managers are scoped to their assigned branch (BKK1 for the seeded manager); owner-only navigation and routes are guarded. The header provides owner branch switching and USD / KHR / dual-currency controls. `Ctrl/Cmd + K` opens search and quick actions.

## Implementation

### Voice to Invoice

Open **Invoices → Create with Voice**, or **Quick Create / Ctrl+K → Create Invoice by Voice**. The direct route is `/invoices/voice`.

1. Choose a demo recording: café order, KHR catering, missing information, or an existing customer/catalog example.
2. Start a simulated recording, allow the demo microphone permission, and stop to review the transcript. You can also type a transcript. The browser microphone is never activated.
3. Extract the invoice, choose its branch and customer, correct missing information and optionally add a customer without leaving the draft. Catalog suggestions never overwrite a spoken price without your choice.
4. Preview and create the ordinary invoice draft. Send it, record payments, and follow it through customer history, notifications, dashboard receivables and reports.

Voice and manual invoices use `invoice-shared.tsx` and `lib/invoice.ts` for fields, document preview, totals, validation and saved record structure. `lib/voice.ts` is a deterministic mock extractor, not a speech recognizer or general-purpose AI. Natural dates are resolved against the visibly labeled demo date **October 6, 2026**. The original and reviewed transcripts are retained on the invoice. Drafts appear in dashboard attention immediately; they become receivables when sent. KHR invoices retain native amounts while using the same USD-normalized ledger.

- `src/components/workspace.tsx`: application shell, navigation, role and branch context, command menu, notifications and quick create.
- `src/lib/store.ts`: seeded records and browser-local persistence.
- `src/lib/finance.ts`: shared account, cash and receivable calculations.
- `src/components/records.tsx`: reusable record screens, forms, details and connected financial mutations.
- Other feature components implement dashboard, imports, reconciliation, intelligence and organization.
- `src/components/ui.tsx`: accessible modal/drawer, tables, badges, money display, timeline and empty states.
- `src/app/globals.css`: design tokens, responsive layouts, print styles and reduced-motion support.

## Demo boundaries

All data is fictional. State persists in this browser under `ledger-demo-v1`. Remove that key from browser storage to restore seed data. No backend, authentication, external sync, messages, or real financial transactions are performed.

Uploads remain local; OCR and file detection deliberately use sample records instead of parsing the uploaded file. AI responses and forecasting are deterministic frontend simulations. Currency amounts are normalized to USD internally and displayed using an illustrative fixed rate of **USD 1 = KHR 4,100**. Historical KPI comparisons are labeled illustrative. July and August report previews explicitly reuse available sample records. PDF export opens the browser print dialog; select **Save as PDF**.

Opening balances are seeded for the three original branches. New branches start with no opening balance. Reconciliation connects existing entries without posting them twice.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

The component tests cover payment propagation, full settlement, estimate conversion, fresh invoice IDs, branch inheritance, inventory changes, insufficient stock and manager scope. Browser screenshot review was unavailable in the implementation environment; responsive layouts still need a visual pass in your browser.


## Authentication demo

Start at `/`. Authentication uses the existing catch-all routing convention, with a shared client provider above the workspace. All flows are frontend simulations, including Google selection, OTP, invitations, and password recovery. Use sample information only; this is not a production security boundary.

- Owner: `owner@example.com` / `password123`.
- Manager (BKK1): `manager@example.com` / `password123`.
- Inactive-account example: `inactive@example.com` / `password123`.
- Verification and reset code: `123456` (10-minute expiry, 45-second resend cooldown).
- Invitation examples: `/invite/demo`, `/invite/expired`, `/invite/used`, `/invite/deactivated`, and any unknown token for the invalid state.

Register an owner, verify the code, and complete business setup before the dashboard opens. New Google owners skip email verification and still require setup. Forgot Password leads through code verification and updates the demo password. The profile menu provides personal settings and Logout. Protected links remember the intended destination and check role permissions on return.

Owners can create invitations from Team > Invite member. Open the new member's details to copy the invitation URL. Invitations are stored in this browser, so use the same browser to test them; no email is delivered and links are not transferable to another device. Account setup consumes the invitation. Team deactivation and reassignment update authentication access and branch context.

`src/lib/auth.ts` defines demo identities, validation, challenges, invitations, and destination rules. `src/components/auth-context.tsx` persists the session and shared flow state in `ledger-auth-demo-v1`. Demo passwords are stored only as hash verifiers, never plaintext; these verifiers are not suitable for production authentication. Replace the demo adapter and client guards with the real identity provider and server authorization when a backend is introduced. Existing financial sample data remains shared in `ledger-demo-v1`.

For a clean authentication demo, remove only `ledger-auth-demo-v1` from browser local storage and reload. Financial sample data is preserved.

Checks: `npm run typecheck`, `npm test`, and `npm run build`. Authentication tests cover connected journeys, OTP keyboard/paste behavior, recovery, session persistence, permissions, real workspace navigation, and logout.
# testing-color
