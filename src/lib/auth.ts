export type UserRole = "OWNER" | "BRANCH_MANAGER";
export type Business = {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  logo?: string;
};
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  businessSetupComplete: boolean;
  assignedBranch?: "Phnom Penh Main" | "BKK1" | "Siem Reap";
  status: "ACTIVE" | "INACTIVE";
  business?: Business;
  credential?: string;
};
export type Challenge = {
  email: string;
  kind: "email" | "reset";
  expires: number;
  resendAt: number;
  verified?: boolean;
};
export type Invitation = {
  token: string;
  email: string;
  business: string;
  branch: NonNullable<AuthUser["assignedBranch"]>;
  invitedBy: string;
  expires: number;
  status: "valid" | "used" | "deactivated";
};
export type AuthState = {
  users: AuthUser[];
  session?: string;
  rememberSession?: boolean;
  pending?: string;
  challenge?: Challenge;
  invitations: Invitation[];
  intended?: string;
};
export const AUTH_KEY = "ledger-auth-demo-v1";
export const ownerOnly = ["forecasting", "branches", "team", "integrations"];
export const emailValid = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const passwordRules = (value: string) => [
  value.length >= 8,
  /[A-Z]/.test(value),
  /[a-z]/.test(value),
  /[0-9]/.test(value),
];
export const challengeFor = (
  email: string,
  kind: Challenge["kind"],
): Challenge => ({
  email,
  kind,
  expires: Date.now() + 600000,
  resendAt: Date.now() + 45000,
});
// Demo verifier only: no plaintext passwords are persisted. Replace this entire adapter with a real identity provider.
export async function credential(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ledger-demo:${value}`),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function seedAuth(): AuthState {
  const base = {
    emailVerified: true,
    businessSetupComplete: true,
    status: "ACTIVE" as const,
  };
  return {
    users: [
      {
        ...base,
        id: "owner",
        name: "Vanda Sok",
        email: "owner@example.com",
        role: "OWNER",
      },
      {
        ...base,
        id: "manager",
        name: "Dara Sok",
        email: "manager@example.com",
        role: "BRANCH_MANAGER",
        assignedBranch: "BKK1",
      },
      {
        ...base,
        id: "inactive",
        name: "Inactive account",
        email: "inactive@example.com",
        role: "BRANCH_MANAGER",
        assignedBranch: "BKK1",
        status: "INACTIVE",
      },
    ],
    invitations: ["demo", "expired", "used", "deactivated"].map((token) => ({
      token,
      email: "invited@example.com",
      business: "Juniper & Co.",
      branch: "BKK1",
      invitedBy: "Vanda Sok",
      expires: token === "expired" ? 0 : Date.now() + 604800000,
      status:
        token === "used"
          ? "used"
          : token === "deactivated"
            ? "deactivated"
            : "valid",
    })),
  };
}
export function destination(user: AuthUser, intended?: string) {
  if (!user.emailVerified) return "/verify-email";
  if (user.role === "OWNER" && !user.businessSetupComplete)
    return "/business-setup";
  if (
    intended &&
    /^\/(?!\/)[a-zA-Z0-9/_?=&%.\-]*$/.test(intended) &&
    ![
      "login",
      "register",
      "business-setup",
      "invite",
      "verify-email",
      "forgot-password",
      "reset-password",
      "verify-reset-code",
    ].includes(intended.split(/[/?]/)[1]) &&
    !(
      user.role === "BRANCH_MANAGER" &&
      ownerOnly.includes(intended.split(/[/?]/)[1])
    )
  )
    return intended;
  return "/dashboard";
}
export function invitationState(invitation?: Invitation) {
  return !invitation
    ? "invalid"
    : invitation.status !== "valid"
      ? invitation.status
      : invitation.expires < Date.now()
        ? "expired"
        : "valid";
}
