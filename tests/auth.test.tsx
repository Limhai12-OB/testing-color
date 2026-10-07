import React, { useSyncExternalStore } from "react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/components/auth-context";
import { AuthRouter, OtpInput } from "../src/components/auth";
import {
  AUTH_KEY,
  credential,
  destination,
  invitationState,
  seedAuth,
  type AuthState,
} from "../src/lib/auth";
const navigation = vi.hoisted(() => ({
  path: "/login",
  listeners: new Set<() => void>(),
  push: (path: string) => {},
}));
vi.mock("next/navigation", () => {
  const router = {
    push: (p: string) => navigation.push(p),
    replace: (p: string) => navigation.push(p),
  };
  const params = new URLSearchParams();
  return {
    usePathname: () =>
      useSyncExternalStore(
        (fn) => {
          navigation.listeners.add(fn);
          return () => navigation.listeners.delete(fn);
        },
        () => navigation.path,
      ),
    useRouter: () => router,
    useSearchParams: () => params,
  };
});
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a
      {...props}
      href={href}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        navigation.push(href);
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("../src/components/workspace", () => ({
  default: () => {
    const auth = useAuth();
    return (
      <div>
        <h1>Dashboard for {auth.user?.name}</h1>
        <p>{auth.user?.assignedBranch}</p>
        <button
          onClick={() => auth.setData((d) => ({ ...d, session: undefined }))}
        >
          Logout
        </button>
      </div>
    );
  },
}));
let state: AuthState;
function Probe() {
  state = useAuth().data;
  return null;
}
function mount(path = "/login", data = seedAuth()) {
  navigation.path = path;
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  return render(
    <AuthProvider>
      <Probe />
      <AuthRouter />
    </AuthProvider>,
  );
}
const fill = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name, { exact: true }), {
    target: { value },
  });
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const route = (path: string) => act(() => navigation.push(path));
const reached = async (path: string) =>
  waitFor(() => expect(navigation.path).toBe(path), { timeout: 3000 });
const verify = async () => {
  fill("Digit 1", "123456");
  click("Verify code");
};
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
  sessionStorage.clear();
  navigation.push = (p) => {
    navigation.path = p;
    navigation.listeners.forEach((fn) => fn());
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("connected authentication journeys", () => {
  it("registers, rejects an invalid OTP, verifies, sets up a business, and persists the session", async () => {
    mount("/register");
    fill("Full name", "Test Owner");
    fill("Email address", "test.owner@example.com");
    fill("Password", "StrongPass8");
    fill("Confirm password", "StrongPass8");
    click("Create Account");
    await reached("/verify-email");
    expect(screen.getByText(/test.owner@example.com/)).toBeTruthy();
    fill("Digit 1", "999999");
    click("Verify code");
    await screen.findByText("The verification code is invalid or has expired.");
    expect(navigation.path).toBe("/verify-email");
    await verify();
    await reached("/business-setup");
    expect(state.users.find((u) => u.id === state.session)?.emailVerified).toBe(
      true,
    );
    fill("Business name", "Test Coffee");
    fill("Business phone number", "012345678");
    fill("Business address", "Street 123");
    click("Open my workspace");
    await reached("/dashboard");
    expect(await screen.findByText("Dashboard for Test Owner")).toBeTruthy();
    expect(
      state.users.find((u) => u.id === state.session)?.business?.name,
    ).toBe("Test Coffee");
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY)!);
    expect(
      saved.users.find((u: any) => u.email === "test.owner@example.com")
        .credential,
    ).not.toBe("StrongPass8");
    cleanup();
    mount("/dashboard", saved);
    expect(await screen.findByText("Dashboard for Test Owner")).toBeTruthy();
  });
  it("remembers a protected route and returns an owner after login", async () => {
    mount("/invoices/INV-001");
    await reached("/login");
    expect(state.intended).toBe("/invoices/INV-001");
    fill("Email address", "owner@example.com");
    fill("Password", "password123");
    click("Sign In");
    await reached("/invoices/INV-001");
  });
  it("rejects bad credentials and inactive accounts without exposing account existence", async () => {
    mount();
    fill("Email address", "unknown@example.com");
    fill("Password", "bad");
    click("Sign In");
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Email or password is incorrect.",
    );
    fill("Email address", "inactive@example.com");
    fill("Password", "password123");
    click("Sign In");
    expect(
      await screen.findByText(/Your account is currently inactive/),
    ).toBeTruthy();
    expect(state.session).toBeUndefined();
  });
  it("resets a password using a verified code and accepts only the new password", async () => {
    mount("/forgot-password");
    fill("Email address", "owner@example.com");
    click("Send Reset Code");
    await reached("/verify-reset-code");
    await verify();
    await reached("/reset-password");
    fill("New password", "ChangedPass9");
    fill("Confirm password", "ChangedPass9");
    click("Reset Password");
    await screen.findByText("Password updated successfully.");
    expect(state.users[0].credential).toBe(await credential("ChangedPass9"));
    route("/login");
    fill("Email address", "owner@example.com");
    fill("Password", "password123");
    click("Sign In");
    await screen.findByText("Email or password is incorrect.");
    fill("Password", "ChangedPass9");
    click("Sign In");
    await reached("/dashboard");
  });
  it("requires a reset grant and handles expired OTP and resend", async () => {
    const data = seedAuth();
    data.challenge = {
      email: "owner@example.com",
      kind: "reset",
      expires: 0,
      resendAt: 0,
    };
    mount("/reset-password", data);
    expect(
      await screen.findByText("Start a new request to continue securely."),
    ).toBeTruthy();
    route("/verify-reset-code");
    await verify();
    await screen.findByText("The verification code is invalid or has expired.");
    click("Resend Code");
    expect(state.challenge!.expires).toBeGreaterThan(Date.now());
    await verify();
    await reached("/reset-password");
  });
  it("accepts an invitation once and logs in to the assigned branch", async () => {
    mount("/invite/demo/setup");
    expect(
      (screen.getByLabelText("Email address") as HTMLInputElement).readOnly,
    ).toBe(true);
    fill("Full name", "Invited Manager");
    fill("Password", "ManagerPass1");
    fill("Confirm password", "ManagerPass1");
    click("Complete account setup");
    await reached("/login");
    fill("Email address", "invited@example.com");
    fill("Password", "ManagerPass1");
    click("Sign In");
    await reached("/dashboard");
    expect(await screen.findByText("BKK1")).toBeTruthy();
    expect(state.invitations[0].status).toBe("used");
    route("/invite/demo/setup");
    expect(
      await screen.findByText("This invitation has already been used."),
    ).toBeTruthy();
  });
  it("simulates Google registration and blocks uninvited managers", async () => {
    mount();
    click("Continue with Google");
    fireEvent.click(screen.getByRole("button", { name: /Uninvited manager/ }));
    await screen.findAllByText(
      "This email must be invited by a Business Owner before it can access the application.",
    );
    expect(state.users).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /Alex Morgan/ }));
    await reached("/business-setup");
    expect(state.users.find((u) => u.id === state.session)?.emailVerified).toBe(
      true,
    );
  });
  it("prevents setup bypass and never sends managers into business setup", async () => {
    const data = seedAuth();
    data.users[0].businessSetupComplete = false;
    data.session = "owner";
    mount("/dashboard", data);
    await reached("/business-setup");
    cleanup();
    data.session = "manager";
    mount("/business-setup", data);
    await reached("/dashboard");
  });
  it("keeps password validation inline and rejects duplicate emails", async () => {
    mount("/register");
    click("Create Account");
    expect(screen.getByText("Enter your full name.")).toBeTruthy();
    fill("Full name", "Another Owner");
    fill("Email address", "owner@example.com");
    fill("Password", "StrongPass8");
    fill("Confirm password", "StrongPass8");
    click("Create Account");
    expect(
      await screen.findByText(
        "This email is already registered. Sign in to continue.",
      ),
    ).toBeTruthy();
  });
});
describe("routing and invitation boundaries", () => {
  it("rejects external return URLs and owner-only destinations for managers", () => {
    const manager = seedAuth().users[1];
    for (const url of [
      "//evil.example",
      "javascript:alert(1)",
      "/team",
      "/forecasting?x=1",
      "/business-setup",
    ])
      expect(destination(manager, url)).toBe("/dashboard");
    expect(destination(manager, "/invoices/INV-001")).toBe("/invoices/INV-001");
  });
  it("distinguishes invitation errors", () => {
    const inv = seedAuth().invitations;
    expect(invitationState()).toBe("invalid");
    expect(invitationState(inv[1])).toBe("expired");
    expect(invitationState(inv[2])).toBe("used");
    expect(invitationState(inv[3])).toBe("deactivated");
  });
  it("supports OTP paste and arrow-key navigation", () => {
    let code = "";
    render(
      <OtpInput
        value=""
        change={(v) => {
          code = v;
        }}
      />,
    );
    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: { getData: () => "123456" },
    });
    expect(code).toBe("123456");
    expect(document.activeElement).toBe(screen.getByLabelText("Digit 6"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByLabelText("Digit 5"));
  });
});
it("shows the public landing page and connects its registration action", async () => {
  mount("/");
  expect(
    await screen.findByRole("heading", {
      name: /Your business,\s*in balance\./,
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "Find your balance" }));
  await waitFor(() => expect(navigation.path).toBe("/register"));
});
it("keeps the landing page public for signed-in users", async () => {
  const data = seedAuth();
  data.session = "owner";
  mount("/", data);
  expect(
    await screen.findByRole("heading", {
      name: /Your business,\s*in balance\./,
    }),
  ).toBeTruthy();
  await waitFor(() => expect(state.session).toBe("owner"));
  expect(navigation.path).toBe("/");
});

it.each([false, true])(
  "respects Remember Me (%s) when persisting login",
  async (remember) => {
    mount("/login");
    fill("Email address", "owner@example.com");
    fill("Password", "password123");
    if (remember)
      fireEvent.click(screen.getByRole("checkbox", { name: "Remember Me" }));
    click("Sign In");
    await reached("/dashboard");
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY)!);
      expect(saved.session).toBe(remember ? "owner" : undefined);
      expect(saved.rememberSession).toBe(remember);
      expect(sessionStorage.getItem(`${AUTH_KEY}-session`)).toBe("owner");
    });
    cleanup();
    sessionStorage.clear();
    mount("/dashboard", JSON.parse(localStorage.getItem(AUTH_KEY)!));
    await reached(remember ? "/dashboard" : "/login");
    if (remember)
      expect(await screen.findByText("Dashboard for Vanda Sok")).toBeTruthy();
  },
);
