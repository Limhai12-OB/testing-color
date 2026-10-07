import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Workspace from "../src/components/workspace";
import { AuthProvider, useAuth } from "../src/components/auth-context";
import { useApp } from "../src/components/context";
import { AUTH_KEY, seedAuth } from "../src/lib/auth";
const nav = vi.hoisted(() => ({ path: "/dashboard", push: vi.fn() }));
vi.mock("next/navigation", () => {
  const params = new URLSearchParams();
  return {
    usePathname: () => nav.path,
    useSearchParams: () => params,
    useRouter: () => ({ push: nav.push }),
  };
});
vi.mock("../src/components/dashboard", () => ({
  Dashboard: () => {
    const a = useApp();
    return (
      <div>
        <h1>{a.state.settings.name}</h1>
        <p data-testid="scope">
          {a
            .scope(a.state.invoices)
            .map((i) => i.branch)
            .join(",")}
        </p>
      </div>
    );
  },
}));
function Ready() {
  const auth = useAuth();
  return auth.ready && auth.user ? <Workspace /> : <span>Signed out</span>;
}
function mount(role: "owner" | "manager", path = "/dashboard") {
  nav.path = path;
  const data = seedAuth();
  data.session = role;
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  return render(
    <AuthProvider>
      <Ready />
    </AuthProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  nav.push.mockClear();
});
afterEach(cleanup);
it("uses the manager identity, scopes data to BKK1, and removes owner navigation", async () => {
  mount("manager");
  await screen.findByRole("heading", { name: "Dara Sok" });
  expect(screen.queryByLabelText("Branch scope")).toBeNull();
  expect(screen.getByTestId("scope").textContent).not.toContain(
    "Phnom Penh Main",
  );
  expect(screen.getByTestId("scope").textContent).toContain("BKK1");
  for (const name of ["Branches", "Team", "Forecasting", "Integrations"])
    expect(screen.queryByRole("button", { name })).toBeNull();
});
it("blocks a direct owner-only route and keeps manager settings personal", async () => {
  mount("manager", "/forecasting");
  expect(
    await screen.findByText("This workspace belongs to the business owner"),
  ).toBeTruthy();
  cleanup();
  mount("manager", "/settings");
  await screen.findByRole("heading", { name: "Make yourself at home." });
  expect(screen.queryByRole("button", { name: "Business" })).toBeNull();
  expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe(
    "Dara Sok",
  );
});
it("shows an owner branch switcher and logs out from the real user menu", async () => {
  mount("owner");
  expect(await screen.findByLabelText("Branch scope")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Profile" }));
  expect(screen.getByRole("button", { name: "Logout" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem(AUTH_KEY)!).session).toBeUndefined(),
  );
  expect(nav.push).toHaveBeenCalledWith("/login");
});
it("creates an invitation from Team and exposes a usable invitation link", async () => {
  mount("owner", "/team");
  fireEvent.click(await screen.findByRole("button", { name: "Invite member" }));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "New Manager" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "new.manager@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Branch"), {
    target: { value: "Siem Reap" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send demo invitation" }));
  const saved = JSON.parse(localStorage.getItem(AUTH_KEY)!);
  const invitation = saved.invitations.find(
    (i: any) => i.email === "new.manager@example.com",
  );
  expect(invitation.branch).toBe("Siem Reap");
  expect(invitation.status).toBe("valid");
  fireEvent.click(await screen.findByText("New Manager"));
  expect(
    (screen.getByLabelText("Invitation link") as HTMLInputElement).value,
  ).toContain(`/invite/${invitation.token}`);
});
it("opens the dashboard from navigation and supports the legacy overview route", async () => {
  mount("owner", "/overview");
  await screen.findByRole("heading", { name: "Vanda Sok" });
  fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
  expect(nav.push).toHaveBeenCalledWith("/dashboard");
});
