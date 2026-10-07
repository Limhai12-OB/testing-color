"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LandingReviews } from "./landing-reviews";
import { LandingWorkflow } from "./landing-workflow";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  FileText,
  Leaf,
  Mic,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Every dollar. Every riel.",
    text: "Bring income, expenses, and account balances together. Switch between USD and KHR as you work.",
  },
  {
    icon: FileText,
    title: "From invoice to income.",
    text: "Create invoices, follow payments, and keep an eye on what is overdue. Know what is coming in next.",
  },
  {
    icon: Building2,
    title: "One business. A full picture.",
    text: "See performance across your branches, or focus on one location with access tailored to your team.",
  },
];

export function LandingPage() {
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const elements = page.current?.querySelectorAll<HTMLElement>(
      ".landing-feature-grid article, .landing-workflow > div, .landing-cta",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("landing-reveal-pending");
            entry.target.classList.add("landing-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    elements?.forEach((element) => {
      element.classList.add("landing-reveal-pending");
      observer.observe(element);
    });
    const revealAll = () => {
      if (preference.matches) {
        observer.disconnect();
        elements?.forEach((element) =>
          element.classList.remove("landing-reveal-pending"),
        );
      }
    };
    preference.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", revealAll);
      elements?.forEach((element) =>
        element.classList.remove("landing-reveal-pending"),
      );
    };
  }, []);
  return (
    <div className="landing" ref={page}>
      <a className="landing-skip" href="#landing-main">
        Skip to content
      </a>
      <header className="landing-nav landing-wrap">
        <Link href="/" className="landing-brand" aria-label="Ledger home">
          <span>
            <Leaf size={22} />
          </span>
          ledger<span className="landing-brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#features">Why Ledger</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/login">
            Log in <ArrowUpRight size={14} />
          </Link>
        </nav>
        <Link className="landing-button landing-dark" href="/register">
          Get started <ArrowRight size={16} />
        </Link>
      </header>
      <main id="landing-main">
        <section className="landing-hero landing-wrap">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <i /> A LITTLE CLARITY GOES A LONG WAY
            </span>
            <h1>
              Your business,
              <br />
              in <em>balance.</em>
            </h1>
            <p>
              Less time chasing numbers. More time building what you love. Meet
              the financial workspace that brings your whole business together.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-dark" href="/register">
                Find your balance <ArrowRight size={17} />
              </Link>
              <a className="landing-text-link" href="#preview">
                Take a look inside <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="landing-checks">
              <span>
                <Check size={14} /> Built for Cambodian businesses
              </span>
              <span>
                <Check size={14} /> USD + KHR
              </span>
            </div>
          </div>
          <div className="landing-visual" id="preview">
            <div className="landing-orbit" aria-hidden="true" />
            <div className="landing-orbit-ring" aria-hidden="true" />
            <div className="landing-preview">
              <div className="landing-preview-top">
                <span>
                  <Leaf size={16} /> ledger.
                </span>
                <span>
                  Juniper & Co. <span className="landing-avatar">JC</span>
                </span>
              </div>
              <div className="landing-preview-body">
                <div className="landing-preview-heading">
                  <div>
                    <small>YOUR BUSINESS AT A GLANCE</small>
                    <h2>A clearer picture.</h2>
                  </div>
                  <span>October 2026</span>
                </div>
                <div className="landing-preview-stats">
                  <div>
                    <small>Total revenue</small>
                    <strong>
                      $24,850<span>.00</span>
                    </strong>
                    <span>Money coming in</span>
                  </div>
                  <div>
                    <small>Net profit</small>
                    <strong>
                      $8,420<span>.00</span>
                    </strong>
                    <span>A little room to grow</span>
                  </div>
                </div>
                <div className="landing-demo-chart">
                  <div>
                    <strong>Income vs. spending</strong>
                    <span>
                      <i /> Income <i /> Spending
                    </span>
                  </div>
                  <div
                    className="landing-bars"
                    role="img"
                    aria-label="Illustrative weekly income and spending chart"
                  >
                    {[42, 64, 54, 81, 68, 94, 85].map((height, i) => (
                      <div key={i}>
                        <div>
                          <i style={{ height: `${height}%` }} />
                          <i style={{ height: `${height * 0.58}%` }} />
                        </div>
                        <small>
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="landing-preview-note">
                  <span>
                    <Check size={13} /> Everything in one place.
                  </span>
                  <small>Illustrative demo data</small>
                </div>
              </div>
            </div>
            <div className="landing-floating">
              <span>
                <Mic size={21} />
              </span>
              <div>
                <strong>Say it. Invoice it.</strong>
                <small>Your voice, a head start on the paperwork.</small>
              </div>
              <span className="landing-wave" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <i key={bar} />
                ))}
              </span>
            </div>
            <span className="landing-visual-caption">
              A calmer way to keep your business moving.
            </span>
          </div>
        </section>
        <LandingReviews />
        <section className="landing-features landing-wrap" id="features">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              LESS FRICTION. MORE PERSPECTIVE.
            </span>
            <h2>
              Big-picture clarity.
              <br />
              Down-to-earth tools.
            </h2>
            <p>
              From your first sale to your next location, keep the everyday
              details connected.
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="landing-feature-icon">
                  <Icon size={24} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-workflow landing-wrap" id="how-it-works">
          <div>
            <span className="landing-eyebrow">
              A LITTLE STRUCTURE. A LOT OF POSSIBILITY.
            </span>
            <h2>
              Make room for
              <br />
              what comes next.
            </h2>
            <p>A simple rhythm for a more balanced business.</p>
            <Link className="landing-text-link" href="/register">
              Build your workspace <ArrowRight size={17} />
            </Link>
          </div>
          <LandingWorkflow />
        </section>
        <section className="landing-cta landing-wrap">
          <span className="landing-feature-icon">
            <BarChart3 size={26} />
          </span>
          <span className="landing-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            Good things grow
            <br />
            from a little balance.
          </h2>
          <Link className="landing-button landing-dark" href="/register">
            Get started with Ledger <ArrowRight size={17} />
          </Link>
          <p>
            Already have a workspace? <Link href="/login">Welcome back.</Link>
          </p>
        </section>
      </main>
      <footer className="landing-footer landing-wrap">
        <Link href="/" className="landing-brand">
          <Leaf size={21} /> ledger.
        </Link>
        <span>A more balanced business starts here.</span>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <Link href="/login">Log in</Link>
          <Link href="/register">Get started</Link>
        </nav>
      </footer>
    </div>
  );
}
