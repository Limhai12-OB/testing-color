"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./auth-context";
import {
  challengeFor,
  credential,
  destination,
  emailValid,
  invitationState,
  passwordRules,
  type AuthUser,
  type Business,
} from "@/lib/auth";
import { Modal } from "./ui";
import Workspace from "./workspace";
import { LandingPage } from "./landing";
const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/verify-reset-code",
  "/reset-password",
  "/business-setup",
];
export function AuthRouter() {
  const auth = useAuth();
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const isPublic = publicPaths.includes(path) || path.startsWith("/invite/");
  let redirect = "";
  if (auth.ready) {
    if (!isPublic && (!auth.user || auth.user.status !== "ACTIVE"))
      redirect = "/login";
    else if (auth.user && auth.user.status === "ACTIVE") {
      const next = destination(auth.user, auth.data.intended);
      if (
        ["/login", "/register"].includes(path) ||
        (!isPublic && ["/verify-email", "/business-setup"].includes(next))
      )
        redirect = next;
      if (
        path === "/business-setup" &&
        (auth.user.role !== "OWNER" || auth.user.businessSetupComplete)
      )
        redirect = "/dashboard";
    }
    if (path === "/business-setup" && !auth.user) redirect = "/login";
    if (path === "/business-setup" && auth.user && !auth.user.emailVerified)
      redirect = "/verify-email";
  }
  useEffect(() => {
    if (!redirect) return;
    if (!isPublic)
      auth.setData((d) => ({
        ...d,
        intended: path + (params.size ? `?${params}` : ""),
      }));
    router.replace(redirect);
  }, [redirect, path, isPublic, params, router, auth.setData]);
  if (path === "/") return <LandingPage />;
  if (!auth.ready || redirect)
    return (
      <div className="initial-loading">
        <LoaderCircle className="spin" size={22} /> Opening Ledger...
      </div>
    );
  return isPublic ? <AuthPage key={path} /> : <Workspace />;
}
export function AuthInput({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = props.id || props.name || label.replace(/\s/g, "-");
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small id={`${id}-error`} className="auth-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function PasswordInput({
  label = "Password",
  value,
  onChange,
  rules = false,
  error,
  autoComplete = "new-password",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  rules?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  const [visible, show] = useState(false);
  const [focused, focus] = useState(false);
  const checks = passwordRules(value);
  return (
    <div className="password-field">
      <AuthInput
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => focus(true)}
        onBlur={() => focus(false)}
        autoComplete={autoComplete}
        error={error}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        onClick={() => show(!visible)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      {rules && (focused || value) && (
        <div className="password-rules">
          <div className="strength-bars">
            {checks.map((ok, i) => (
              <i key={i} className={ok ? "met" : ""} />
            ))}
          </div>
          <small>
            {checks.every(Boolean)
              ? "Strong password"
              : "Use 8+ characters, uppercase, lowercase, and a number."}
          </small>
        </div>
      )}
    </div>
  );
}
export function OtpInput({
  value,
  change,
  error,
}: {
  value: string;
  change: (v: string) => void;
  error?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div>
      <div
        className="otp-fields"
        role="group"
        aria-label="Six-digit verification code"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!error}
            aria-describedby={error ? "otp-error" : undefined}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={value[i]?.trim() || ""}
            maxLength={6}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => {
              e.preventDefault();
              const code = e.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);
              change(code);
              refs.current[Math.min(code.length, 5)]?.focus();
            }}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (digits.length > 1) {
                change(digits.slice(0, 6));
                refs.current[5]?.focus();
              } else {
                const next = value.padEnd(6, " ").split("");
                next[i] = digits || " ";
                change(next.join("").trimEnd());
                if (digits) refs.current[i + 1]?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
              if (e.key === "Backspace" && !value[i]?.trim())
                refs.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
      {error && (
        <p className="auth-error" id="otp-error">
          {error}
        </p>
      )}
    </div>
  );
}
function AuthPage() {
  const { data, setData, user, toast } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const pending = data.users.find((u) => u.id === data.pending);
  const token = path.split("/")[2];
  const invitation = data.invitations.find((i) => i.token === token);
  const inviteStatus = invitationState(invitation);
  const setupInvite = path.endsWith("/setup");
  const register = path === "/register";
  const login = path === "/login";
  const reset = path === "/reset-password";
  const otp = ["/verify-email", "/verify-reset-code"].includes(path);
  const business = path === "/business-setup";
  const [values, setValues] = useState<Record<string, string>>({
    email: invitation?.email || (register ? pending?.email : "") || "",
    name: register ? pending?.name || "" : "",
    businessEmail: user?.email || "",
    country: "Cambodia",
    currency: "USD",
  });
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!otp) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [otp]);
  const field = (
    key: string,
    label: string,
    type = "text",
    autoComplete?: string,
  ) => (
    <AuthInput
      name={key}
      label={label}
      type={type}
      autoComplete={autoComplete}
      value={values[key] || ""}
      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      error={errors[key]}
    />
  );
  const enter = (account: AuthUser) => {
    setData((d) => ({
      ...d,
      session: account.id,
      rememberSession: remember,
      intended: account.businessSetupComplete ? undefined : d.intended,
    }));
    router.push(destination(account, data.intended));
  };
  const run = async (action: () => Promise<void> | void) => {
    setBusy(true);
    setErrors({});
    try {
      await new Promise((r) => setTimeout(r, 500));
      await action();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: Record<string, string> = {};
    if (register || login || path === "/forgot-password") {
      if (!emailValid(values.email.trim()))
        errs.email = "Enter a valid email address.";
    }
    if (register || setupInvite) {
      if (values.name.trim().length < 2) errs.name = "Enter your full name.";
    }
    if (register || reset || setupInvite) {
      if (!passwordRules(password).every(Boolean))
        errs.password =
          "Use 8+ characters, uppercase, lowercase, and a number.";
      if (password !== confirm) errs.confirm = "Passwords do not match.";
    }
    if (login && !password) errs.password = "Enter your password.";
    if (otp && !/^\d{6}$/.test(code)) errs.code = "Enter all six digits.";
    if (business) {
      for (const key of [
        "businessName",
        "businessEmail",
        "phone",
        "address",
        "country",
        "currency",
      ])
        if (!values[key]?.trim()) errs[key] = "This field is required.";
      if (!emailValid(values.businessEmail))
        errs.businessEmail = "Enter a valid business email.";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    void run(async () => {
      const email = values.email.trim().toLowerCase();
      if (login) {
        const account = data.users.find((u) => u.email === email);
        const valid =
          account &&
          (account.credential
            ? account.credential === (await credential(password))
            : ["owner", "manager", "inactive"].includes(account.id) &&
              password === "password123");
        if (!valid)
          return setErrors({ form: "Email or password is incorrect." });
        if (account.status === "INACTIVE")
          return setErrors({
            form: "Your account is currently inactive. Please contact your Business Owner.",
          });
        if (!account.emailVerified) {
          setData((d) => ({
            ...d,
            pending: account.id,
            challenge: challengeFor(email, "email"),
          }));
          router.push("/verify-email");
          return;
        }
        enter(account);
      } else if (register) {
        if (data.users.some((u) => u.email === email && u.id !== data.pending))
          return setErrors({
            email: "This email is already registered. Sign in to continue.",
          });
        const account: AuthUser = {
          id: pending?.id || crypto.randomUUID(),
          name: values.name.trim(),
          email,
          credential: await credential(password),
          role: "OWNER",
          status: "ACTIVE",
          emailVerified: false,
          businessSetupComplete: false,
        };
        setData((d) => ({
          ...d,
          users: [...d.users.filter((u) => u.id !== account.id), account],
          pending: account.id,
          challenge: challengeFor(email, "email"),
        }));
        router.push("/verify-email");
      } else if (path === "/forgot-password") {
        setData((d) => ({ ...d, challenge: challengeFor(email, "reset") }));
        router.push("/verify-reset-code");
      } else if (otp) {
        const c = data.challenge;
        const kind = path === "/verify-email" ? "email" : "reset";
        if (
          !c ||
          c.kind !== kind ||
          c.expires < Date.now() ||
          code !== "123456"
        )
          return setErrors({
            code: "The verification code is invalid or has expired.",
          });
        if (kind === "email" && pending) {
          setData((d) => ({
            ...d,
            users: d.users.map((u) =>
              u.id === pending.id ? { ...u, emailVerified: true } : u,
            ),
            session: pending.id,
            pending: undefined,
            challenge: undefined,
          }));
          toast("Email verified.");
          router.push("/business-setup");
        } else {
          setData((d) => ({ ...d, challenge: { ...c, verified: true } }));
          router.push("/reset-password");
        }
      } else if (reset) {
        if (
          !data.challenge?.verified ||
          data.challenge.kind !== "reset" ||
          data.challenge.expires < Date.now()
        )
          return setErrors({
            form: "Your reset session has expired. Request a new code.",
          });
        const hash = await credential(password);
        setData((d) => ({
          ...d,
          users: d.users.map((u) =>
            u.email === d.challenge?.email ? { ...u, credential: hash } : u,
          ),
          session: undefined,
          challenge: undefined,
        }));
        setSuccess(true);
        toast("Password updated.");
      } else if (business && user) {
        const details: Business = {
          name: values.businessName.trim(),
          email: values.businessEmail,
          phone: values.phone,
          address: values.address,
          country: values.country,
          currency: values.currency,
          logo: values.logo,
        };
        setData((d) => ({
          ...d,
          users: d.users.map((u) =>
            u.id === user.id
              ? { ...u, businessSetupComplete: true, business: details }
              : u,
          ),
        }));
        router.push(
          destination({ ...user, businessSetupComplete: true }, data.intended),
        );
      } else if (setupInvite && invitation) {
        if (invitationState(invitation) !== "valid")
          return setErrors({ form: "This invitation is no longer available." });
        if (data.users.some((u) => u.email === invitation.email))
          return setErrors({
            form: "An account already exists for this invitation. Please sign in.",
          });
        const account: AuthUser = {
          id: crypto.randomUUID(),
          name: values.name.trim(),
          email: invitation.email,
          credential: await credential(password),
          role: "BRANCH_MANAGER",
          assignedBranch: invitation.branch,
          emailVerified: true,
          businessSetupComplete: true,
          status: "ACTIVE",
        };
        setData((d) => ({
          ...d,
          users: [...d.users, account],
          session: undefined,
          intended: undefined,
          invitations: d.invitations.map((i) =>
            i.token === token ? { ...i, status: "used" } : i,
          ),
        }));
        toast("Invitation accepted. Sign in to your assigned branch.");
        router.push("/login");
      }
    });
  };
  const googleAccount = (id: string) =>
    void run(() => {
      if (id === "unknown")
        return setErrors({
          form: "This email must be invited by a Business Owner before it can access the application.",
        });
      let account = data.users.find((u) => u.id === id);
      if (!account) {
        account = data.users.find((u) => u.email === "new.owner@gmail.com");
        if (!account) {
          account = {
            id: crypto.randomUUID(),
            name: "Alex Morgan",
            email: "new.owner@gmail.com",
            role: "OWNER",
            status: "ACTIVE",
            emailVerified: true,
            businessSetupComplete: false,
          };
          setData((d) => ({ ...d, users: [...d.users, account!] }));
        }
      }
      if (account.status === "INACTIVE")
        return setErrors({
          form: "Your account is currently inactive. Please contact your Business Owner.",
        });
      setGoogle(false);
      enter(account);
    });
  const titles: Record<string, [string, string]> = {
    "/login": ["Welcome back.", "Your business, right where you left it."],
    "/register": [
      "A better balance starts here.",
      "Create your Business Owner account.",
    ],
    "/verify-email": [
      "Verify your email",
      `Enter the code sent to ${data.challenge?.email || "your email"}.`,
    ],
    "/forgot-password": [
      "Forgot your password?",
      "We'll help you get back to your workspace.",
    ],
    "/verify-reset-code": [
      "Check your inbox",
      `We sent a verification code to ${data.challenge?.email || "your email"}.`,
    ],
    "/reset-password": [
      "Choose a new password",
      "Make it strong. Make it yours.",
    ],
    "/business-setup": [
      "Let's meet your business.",
      "A few details to make Ledger your own.",
    ],
  };
  const [title, description] = titles[path] || [
    setupInvite ? "Set up your account" : "You're invited.",
    "Your next chapter starts with a connected team.",
  ];
  const challenge = data.challenge;
  const correctChallenge =
    challenge?.kind === (path === "/verify-email" ? "email" : "reset");
  const seconds = Math.max(
    0,
    Math.ceil(((challenge?.resendAt || 0) - now) / 1000),
  );
  return (
    <div className={`auth-shell ${login ? "login-shell" : ""}`}>
      <aside className="auth-story" aria-label="LedgerVision overview">
        <div className="auth-story-content">
          <h1>
            Effortlessly manage your
            <br />
            team and operations.
          </h1>
          <p>Log in to access your CRM dashboard and manage your team.</p>
        </div>
        <div className="login-dashboard" aria-label="Sample sales dashboard">
          <div className="login-metrics">
            <div className="login-metric">
              <span>TOTAL SALES</span>
              <small>Total earnings from sales</small>
              <strong>$189,374</strong>
              <em>
                ? 12% <span>from last month</span>
              </em>
            </div>
            <div className="login-metric">
              <span>Chat Performance</span>
              <strong>00:01:30</strong>
              <svg viewBox="0 0 140 54" aria-hidden="true">
                <path
                  d="M3 40 Q25 18 46 35 T85 28 T116 15 T137 35"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </div>
          <div className="login-profit">
            <div>
              <span>Total Profit</span>
              <strong>$25,684</strong>
            </div>
            <em>? 8%</em>
            <span>
              Avg. Order Value: <b>$120.50</b>
            </span>
          </div>
          <div className="login-transactions">
            <header>
              <b>Product Transaction</b>
              <span>View All</span>
            </header>
            {[
              ["Apple iPad Gen 10", "12 Feb, 2025", "$549", "Delivered"],
              ["Apple iPhone 13", "13 Feb, 2025", "$799", "Pending"],
              ["Apple MacBook Air M2", "14 Feb, 2025", "$1,199", "Delivered"],
            ].map(([name, date, price, status]) => (
              <div key={name}>
                <span>{name}</span>
                <span>{date}</span>
                <b>{price}</b>
                <em className={status === "Pending" ? "pending" : ""}>
                  {status}
                </em>
              </div>
            ))}
          </div>
          <div className="login-categories">
            <header>
              <b>Sales Categories</b>
              <span>Monthly ?</span>
            </header>
            <div className="login-gauge">
              <svg viewBox="0 0 150 85" aria-hidden="true">
                <path
                  d="M15 72 A60 60 0 0 1 135 72"
                  fill="none"
                  stroke="#e0e7ff"
                  strokeWidth="13"
                  strokeLinecap="round"
                />
                <path
                  d="M68 12 A60 60 0 0 1 135 72"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="13"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                Total Sales<strong>6,248 Units</strong>
              </span>
            </div>
            <ul>
              <li>
                Smartphones <b>3,648 Unit</b>
              </li>
              <li>
                Laptops &amp; PC <b>1,750 Unit</b>
              </li>
              <li>
                Accessories <b>850 Unit</b>
              </li>
            </ul>
          </div>
        </div>
      </aside>
      <main className="auth-main">
        <Link href="/" className="auth-mobile-brand">
          <LoaderCircle size={28} aria-hidden="true" /> LedgerVision
        </Link>
        {path === "/" ? (
          <section className="auth-card landing-card">
            <span className="auth-eyebrow">MEET YOUR FINANCIAL WORKSPACE</span>
            <h1>
              Your business.
              <br />A clearer view.
            </h1>
            <p>
              From the first sale to your next branch, keep your finances moving
              forward with Ledger.
            </p>
            <div className="landing-actions">
              <Link className="button primary" href="/register">
                Get Started <ArrowRight size={17} />
              </Link>
              <Link className="button secondary" href="/login">
                Sign In
              </Link>
            </div>
            <div className="auth-note">
              <ShieldCheck size={20} />
              <span>
                One connected home for your cash flow, invoices, and team.
              </span>
            </div>
          </section>
        ) : (
          <section className={`auth-card ${business ? "auth-wide" : ""}`}>
            {business && (
              <div className="auth-progress">
                <span>
                  <Check size={14} /> Account
                </span>
                <span>
                  <Check size={14} /> Email
                </span>
                <b>3 - Business</b>
              </div>
            )}
            <header>
              <span className="auth-eyebrow">
                {business
                  ? "MAKE IT YOURS"
                  : path.startsWith("/invite/")
                    ? "TEAM INVITATION"
                    : "WELCOME TO LEDGER"}
              </span>
              <h1>{login ? "Welcome Back" : title}</h1>
              <p>
                {login
                  ? "Enter your email and password to access your account."
                  : description}
              </p>
            </header>
            {path.startsWith("/invite/") && inviteStatus !== "valid" ? (
              <div className="auth-note">
                <div>
                  <h2>
                    {
                      (
                        {
                          expired: "This invitation has expired.",
                          used: "This invitation has already been used.",
                          invalid: "This invitation is invalid.",
                          deactivated: "This account has been deactivated.",
                        } as Record<string, string>
                      )[inviteStatus]
                    }
                  </h2>
                  <p>
                    Contact the Business Owner to request{" "}
                    {inviteStatus === "deactivated"
                      ? "access"
                      : "a new invitation"}
                    .
                  </p>
                  <Link href="/login">Back to Sign In</Link>
                </div>
              </div>
            ) : success ? (
              <div className="auth-success">
                <ShieldCheck size={36} />
                <h2>Password updated successfully.</h2>
                <Link className="button primary" href="/login">
                  Back to Sign In
                </Link>
              </div>
            ) : (otp && (!challenge || !correctChallenge)) ||
              (reset &&
                (!challenge?.verified || challenge.kind !== "reset")) ? (
              <div className="auth-note">
                <div>
                  <p>Start a new request to continue securely.</p>
                  <Link
                    href={
                      path === "/verify-email"
                        ? "/register"
                        : "/forgot-password"
                    }
                  >
                    Request a code <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {invitation && (
                  <div className="invitation-details">
                    <strong>{invitation.business}</strong>
                    <span>Branch Manager - Invitation active</span>
                    <dl>
                      <div>
                        <dt>Assigned branch</dt>
                        <dd>{invitation.branch}</dd>
                      </div>
                      <div>
                        <dt>Invited email</dt>
                        <dd>{invitation.email}</dd>
                      </div>
                      <div>
                        <dt>Invited by</dt>
                        <dd>{invitation.invitedBy}</dd>
                      </div>
                    </dl>
                    {setupInvite && (
                      <small>
                        This branch is assigned by the Business Owner.
                      </small>
                    )}
                  </div>
                )}
                {path.startsWith("/invite/") && !setupInvite ? (
                  <Link
                    className="button primary auth-submit"
                    href={`/invite/${token}/setup`}
                  >
                    Accept Invitation <ArrowRight size={16} />
                  </Link>
                ) : (
                  <>
                    <form
                      noValidate
                      onSubmit={submit}
                      className="auth-form"
                      aria-busy={busy}
                    >
                      {(register || setupInvite) &&
                        field("name", "Full name", "text", "name")}
                      {(login || register || path === "/forgot-password") &&
                        field("email", "Email address", "email", "email")}
                      {setupInvite && (
                        <AuthInput
                          label="Email address"
                          value={invitation?.email || ""}
                          readOnly
                          autoComplete="email"
                        />
                      )}
                      {(login || register || reset || setupInvite) && (
                        <PasswordInput
                          value={password}
                          onChange={setPassword}
                          rules={!login}
                          error={errors.password}
                          autoComplete={
                            login ? "current-password" : "new-password"
                          }
                          label={reset ? "New password" : "Password"}
                        />
                      )}
                      {(register || reset || setupInvite) && (
                        <PasswordInput
                          label="Confirm password"
                          value={confirm}
                          onChange={setConfirm}
                          error={errors.confirm}
                        />
                      )}
                      {login && (
                        <div className="login-options">
                          <label>
                            <input
                              type="checkbox"
                              checked={remember}
                              onChange={(event) =>
                                setRemember(event.target.checked)
                              }
                            />
                            Remember Me
                          </label>
                          <Link className="auth-forgot" href="/forgot-password">
                            Forgot password?
                          </Link>
                        </div>
                      )}
                      {otp && (
                        <>
                          <OtpInput
                            value={code}
                            change={setCode}
                            error={errors.code}
                          />
                          <div className="auth-resend">
                            <span>
                              {challenge && now > challenge.expires
                                ? "Code expired"
                                : "Code valid for 10 minutes"}
                            </span>
                            <button
                              type="button"
                              disabled={seconds > 0 || busy}
                              onClick={() => {
                                if (challenge) {
                                  setData((d) => ({
                                    ...d,
                                    challenge: challengeFor(
                                      challenge.email,
                                      challenge.kind,
                                    ),
                                  }));
                                  setCode("");
                                  setErrors({});
                                  toast("Verification code resent.");
                                }
                              }}
                            >
                              {seconds
                                ? `Resend code in ${seconds}s`
                                : "Resend Code"}
                            </button>
                          </div>
                          <Link
                            href={
                              path === "/verify-email"
                                ? "/register"
                                : "/forgot-password"
                            }
                          >
                            Change email
                          </Link>
                          <details className="auth-demo">
                            <summary>Demo helper</summary>
                            <p>
                              No email is sent. Use code <b>123456</b>.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setData((d) => ({
                                  ...d,
                                  challenge: d.challenge
                                    ? {
                                        ...d.challenge,
                                        expires: 0,
                                        resendAt: 0,
                                      }
                                    : undefined,
                                }))
                              }
                            >
                              Simulate expired code
                            </button>
                          </details>
                        </>
                      )}
                      {business && (
                        <>
                          <div className="auth-grid">
                            {field(
                              "businessName",
                              "Business name",
                              "text",
                              "organization",
                            )}
                            {field(
                              "businessEmail",
                              "Business email",
                              "email",
                              "email",
                            )}
                            {field(
                              "phone",
                              "Business phone number",
                              "tel",
                              "tel",
                            )}
                            {field(
                              "address",
                              "Business address",
                              "text",
                              "street-address",
                            )}
                            {field(
                              "country",
                              "Country",
                              "text",
                              "country-name",
                            )}
                            <label className="auth-field">
                              <span>Base currency</span>
                              <select
                                value={values.currency}
                                onChange={(e) =>
                                  setValues((v) => ({
                                    ...v,
                                    currency: e.target.value,
                                  }))
                                }
                              >
                                <option value="USD">USD - US Dollar</option>
                                <option value="KHR">
                                  KHR - Cambodian Riel
                                </option>
                              </select>
                            </label>
                          </div>
                          <label className="auth-field">
                            <span>
                              Business logo{" "}
                              <small>
                                (optional - PNG or JPEG, up to 1 MB)
                              </small>
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                if (
                                  f.size > 1000000 ||
                                  !["image/png", "image/jpeg"].includes(f.type)
                                ) {
                                  setErrors({
                                    logo: "Choose a PNG or JPEG under 1 MB.",
                                  });
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setValues((v) => ({
                                    ...v,
                                    logo: String(reader.result),
                                  }));
                                  setErrors({});
                                };
                                reader.readAsDataURL(f);
                              }}
                            />
                            {errors.logo && (
                              <small className="auth-error">
                                {errors.logo}
                              </small>
                            )}
                            {values.logo && (
                              <img
                                className="auth-logo-preview"
                                src={values.logo}
                                alt="Business logo preview"
                              />
                            )}
                          </label>
                        </>
                      )}
                      {errors.form && (
                        <p className="auth-error auth-error-box" role="alert">
                          {errors.form}
                        </p>
                      )}
                      <button
                        className="button primary auth-submit"
                        disabled={busy}
                      >
                        {busy ? (
                          <>
                            <LoaderCircle className="spin" size={17} />
                            {login
                              ? "Signing in..."
                              : otp
                                ? "Verifying..."
                                : business
                                  ? "Setting up your business..."
                                  : reset
                                    ? "Resetting password..."
                                    : path === "/forgot-password"
                                      ? "Sending verification code..."
                                      : "Creating your account..."}
                          </>
                        ) : (
                          <>
                            {login
                              ? "Sign In"
                              : register
                                ? "Create Account"
                                : otp
                                  ? "Verify code"
                                  : business
                                    ? "Open my workspace"
                                    : reset
                                      ? "Reset Password"
                                      : setupInvite
                                        ? "Complete account setup"
                                        : "Send Reset Code"}
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    </form>
                    {(login || register) && (
                      <>
                        <div className="auth-divider">
                          <span>OR LOGIN WITH</span>
                        </div>
                        <button
                          className="button secondary auth-social"
                          onClick={() => {
                            setErrors({});
                            setGoogle(true);
                          }}
                        >
                          <span className="google-g" aria-hidden="true">
                            G
                          </span>
                          Continue with Google
                        </button>
                      </>
                    )}
                  </>
                )}
                {register && (
                  <p className="auth-note">
                    Branch Managers cannot register directly. They must use an
                    invitation from their Business Owner.
                  </p>
                )}
                {(login || register) && (
                  <p className="auth-bottom">
                    {login
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <Link href={login ? "/register" : "/login"}>
                      {login ? "Create Account" : "Sign In"}
                    </Link>
                    {login && <small>For Business Owners only</small>}
                  </p>
                )}
                {path === "/forgot-password" && (
                  <p className="auth-bottom">
                    <Link href="/login">Back to Sign In</Link>
                  </p>
                )}
                {login && (
                  <details className="auth-demo">
                    <summary>Explore the demo</summary>
                    <p>
                      Owner: owner@example.com
                      <br />
                      Manager: manager@example.com
                      <br />
                      Inactive: inactive@example.com
                      <br />
                      Password: password123
                    </p>
                    <p>
                      <Link href="/invite/demo">Try an invitation</Link> -{" "}
                      <Link href="/invite/expired">Expired</Link> -{" "}
                      <Link href="/invite/used">Used</Link> -{" "}
                      <Link href="/invite/deactivated">Deactivated</Link>
                    </p>
                    <small>
                      Use sample information only. This prototype stores demo
                      data in this browser.
                    </small>
                  </details>
                )}
              </>
            )}
          </section>
        )}
        <footer className="auth-footer">
          <span>Copyright ? {new Date().getFullYear()} LedgerVision.</span>
        </footer>
      </main>
      {google && (
        <Modal
          title="Choose a demo Google account"
          onClose={() => setGoogle(false)}
        >
          <div className="auth-google-options">
            <p>This is a simulation. No Google account is connected.</p>
            {[
              ["owner", "Vanda Sok", "Existing Business Owner"],
              ["manager", "Dara Sok", "Invited Branch Manager - BKK1"],
              ["new", "Alex Morgan", "New Business Owner"],
              [
                "unknown",
                "Uninvited manager",
                "Test invitation-required access",
              ],
            ].map(([id, name, note]) => (
              <button
                className="button secondary"
                key={id}
                disabled={busy}
                onClick={() => googleAccount(id)}
              >
                <span className="avatar">{name[0]}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{note}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {errors.form && (
              <p className="auth-error" role="alert">
                {errors.form}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
