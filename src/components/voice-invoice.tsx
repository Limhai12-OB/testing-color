"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  FileText,
  RotateCcw,
  ShieldCheck,
  LoaderCircle,
  Pencil,
  AlertCircle,
  Send,
  Plus,
} from "lucide-react";
import { useApp } from "./context";
import { Badge, Modal, Money, PageHeader } from "./ui";
import { InvoiceDocument, InvoiceFields } from "./invoice-shared";
import {
  emptyInvoice,
  invoiceRecord,
  invoiceTotals,
  validateInvoice,
  INVOICE_DEMO_DATE,
  type InvoiceDraft,
} from "@/lib/invoice";
import { extractInvoice, voiceDemos } from "@/lib/voice";
import { id, type RecordRow } from "@/lib/store";

type Phase =
  | "idle"
  | "listening"
  | "transcribing"
  | "transcript"
  | "extracting"
  | "review"
  | "preview"
  | "success";
export function VoiceInvoice() {
  const a = useApp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [demo, setDemo] = useState(0);
  const [permission, setPermission] = useState<
    "unknown" | "prompt" | "allowed" | "denied"
  >("unknown");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState<InvoiceDraft>(emptyInvoice);
  const [transcriptDrawer, setTranscriptDrawer] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState("");
  const [reservedId, setReservedId] = useState("");
  const submitted = useRef(false);
  const sourceText = voiceDemos[demo].text;
  const allowed =
    a.role === "Branch Manager"
      ? [a.activeBranch]
      : a.state.locations.filter((l) => l.active).map((l) => l.name);
  const effectiveDraft = {
    ...draft,
    branch: a.role === "Branch Manager" ? a.activeBranch : draft.branch,
  };
  const missing = validateInvoice(effectiveDraft, a.state.customers, allowed);
  const customer = a.state.customers.find(
    (c) =>
      c.id === effectiveDraft.customer && c.branch === effectiveDraft.branch,
  );
  const created = a.state.invoices.find((i) => i.id === createdId);
  const total = invoiceTotals(effectiveDraft);
  const stepIndex =
    phase === "idle" || phase === "listening"
      ? 0
      : ["transcribing", "transcript", "extracting"].includes(phase)
        ? 1
        : phase === "review"
          ? 2
          : phase === "preview"
            ? 3
            : 4;
  useEffect(() => {
    if (phase !== "listening") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase === "listening") {
      const words = sourceText.split(" ");
      setTranscript(
        words.slice(0, Math.min(words.length, 3 + seconds * 4)).join(" "),
      );
    }
  }, [seconds, phase, sourceText]);
  useEffect(() => {
    if (phase === "listening" && seconds >= 12) {
      setOriginal(sourceText);
      setTranscript(sourceText);
      setPhase("transcribing");
    }
  }, [seconds, phase, sourceText]);
  useEffect(() => {
    if (phase !== "transcribing" && phase !== "extracting") return;
    const timer = setTimeout(
      () => {
        if (phase === "transcribing") setPhase("transcript");
        else {
          const next = extractInvoice(transcript, {
            role: a.role,
            activeBranch: a.activeBranch,
            scope: a.branch,
            branches: allowed,
            date: INVOICE_DEMO_DATE,
          });
          setDraft({ ...next, originalTranscript: original || transcript });
          setErrors([]);
          setPhase("review");
        }
      },
      phase === "transcribing" ? 900 : 1200,
    );
    return () => clearTimeout(timer);
  }, [phase, transcript, a.role, a.activeBranch, a.branch]);
  const roleScope = useRef(`${a.role}:${a.branch}`);
  useEffect(() => {
    const current = `${a.role}:${a.branch}`;
    if (roleScope.current === current) return;
    roleScope.current = current;
    setDraft((d) => ({
      ...d,
      customer: "",
      branch:
        a.role === "Branch Manager"
          ? a.activeBranch
          : a.branch === "All branches"
            ? ""
            : a.branch,
    }));
    setErrors([]);
    if (phase === "success") {
      submitted.current = false;
      setCreatedId("");
      setDraft(emptyInvoice());
      setTranscript("");
      setOriginal("");
      setPhase("idle");
    } else if (["review", "preview"].includes(phase)) setPhase("review");
  }, [a.role, a.branch, a.activeBranch, phase]);
  const start = () => {
    setErrors([]);
    setSeconds(0);
    setPhase("listening");
  };
  const record = () => {
    if (permission !== "allowed") setPermission("prompt");
    else start();
  };
  const process = () => {
    if (!transcript.trim()) {
      setErrors([
        "We couldn’t understand the recording. Try a demo recording or type what you want to invoice.",
      ]);
      return;
    }
    setTranscriptDrawer(false);
    setOriginal((value) => value || transcript);
    setErrors([]);
    setPhase("extracting");
  };
  const preview = () => {
    if (draft.transcript !== transcript) {
      setErrors([
        "Your transcript changed. Reprocess it before previewing so the invoice matches your words.",
      ]);
      setTranscriptDrawer(true);
      return;
    }
    if (missing.length) {
      setErrors(missing);
      return;
    }
    setReservedId(id("INV"));
    setPhase("preview");
    setErrors([]);
  };
  const create = () => {
    const issues = validateInvoice(effectiveDraft, a.state.customers, allowed);
    if (issues.length || !customer) {
      setErrors(issues);
      setPhase("review");
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    const invoice = invoiceRecord(
      effectiveDraft,
      customer,
      a.state.settings.name,
      undefined,
      reservedId,
    );
    a.setState((s) => ({ ...s, invoices: [invoice, ...s.invoices] }));
    setCreatedId(invoice.id);
    setPhase("success");
    a.notify(
      "Voice invoice created as a draft. Ready for your normal invoice workflow.",
    );
  };
  const restart = () => {
    submitted.current = false;
    setPhase("idle");
    setSeconds(0);
    setTranscript("");
    setOriginal("");
    setDraft(emptyInvoice());
    setCreatedId("");
    setErrors([]);
  };
  return (
    <div className="voice-workspace">
      <PageHeader
        eyebrow="SALES / INVOICES / VOICE ASSISTANT"
        title="Create Invoice by Voice"
        description="Tell us who you’re billing, what they purchased, quantities, prices, and when payment is due."
        actions={
          <button className="button secondary" onClick={() => a.go("invoices")}>
            <ArrowLeft size={15} />
            Back to invoices
          </button>
        }
      />
      <div className="voice-context-bar">
        <span>
          <ShieldCheck size={14} />
          Simulated voice · no microphone or audio upload required
        </span>
        <span>Demo date · October 6, 2026</span>
      </div>
      <div className="voice-progress" aria-label="Invoice creation progress">
        {["Speak", "Transcribe", "Review", "Preview", "Created"].map(
          (label, i) => (
            <div
              key={label}
              className={
                i === stepIndex ? "current" : i < stepIndex ? "done" : ""
              }
              aria-current={i === stepIndex ? "step" : undefined}
            >
              <span>{i < stepIndex ? <Check size={13} /> : i + 1}</span>
              {label}
            </div>
          ),
        )}
      </div>
      {errors.length > 0 && (
        <div className="inline-error" role="alert">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
      {[
        "idle",
        "listening",
        "transcribing",
        "transcript",
        "extracting",
      ].includes(phase) && (
        <div className="voice-capture-layout">
          <section className="panel voice-capture">
            <div className="voice-panel-heading">
              <span className="voice-assistant-label">
                <Sparkles size={15} />
                VOICE ASSISTANT
              </span>
              <Badge>
                {phase === "idle"
                  ? "Ready when you are"
                  : phase === "listening"
                    ? "Listening"
                    : phase === "transcript"
                      ? "Transcription Ready"
                      : "Processing"}
              </Badge>
            </div>
            {phase === "idle" || phase === "listening" ? (
              <>
                <div
                  className={`microphone-stage ${phase === "listening" ? "listening" : ""}`}
                >
                  <button
                    className="microphone-button"
                    aria-label={
                      phase === "listening"
                        ? "Stop recording"
                        : "Start recording"
                    }
                    onClick={() => {
                      if (phase === "listening") {
                        setTranscript(sourceText);
                        setOriginal(sourceText);
                        setPhase("transcribing");
                      } else record();
                    }}
                  >
                    {phase === "listening" ? (
                      <Square size={27} fill="currentColor" />
                    ) : (
                      <Mic size={34} strokeWidth={1.6} />
                    )}
                  </button>
                  <h2>
                    {phase === "listening"
                      ? "Listening…"
                      : "An invoice starts with a conversation."}
                  </h2>
                  <p>
                    {phase === "listening"
                      ? "Your selected demo is being transcribed live."
                      : "Tap the microphone to try a simulated recording."}
                  </p>
                  <div className="voice-waveform" aria-hidden="true">
                    {[
                      9, 16, 25, 13, 31, 43, 22, 35, 53, 30, 42, 21, 49, 32, 19,
                      39, 24, 14, 28, 11, 18,
                    ].map((h, i) => (
                      <i
                        key={i}
                        style={{
                          height: phase === "listening" ? h : 5,
                          animationDelay: `${i * 0.07}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="recording-timer"
                    role="timer"
                    aria-label="Recording duration"
                  >
                    00:{String(seconds).padStart(2, "0")}
                  </span>
                </div>
                {permission === "denied" && (
                  <div className="voice-permission-error" role="alert">
                    <AlertCircle size={20} />
                    <div>
                      <strong>Microphone access is currently blocked.</strong>
                      <p>
                        This is a simulated permission state. In a real session,
                        enable access in browser settings or create the invoice
                        manually.
                      </p>
                      <div className="page-actions">
                        <button
                          className="button secondary"
                          onClick={() => setPermission("prompt")}
                        >
                          Try again
                        </button>
                        <button
                          className="text-button"
                          onClick={() => a.create("invoice")}
                        >
                          Create manually <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="live-transcript">
                  <small>
                    {phase === "listening" ? "YOU’RE SAYING" : "TRY SAYING"}
                  </small>
                  <p>{phase === "listening" ? transcript : sourceText}</p>
                </div>
                <div className="voice-action-bar">
                  <button
                    className="button quiet"
                    onClick={() => a.go("invoices")}
                  >
                    Cancel
                  </button>
                  {phase === "listening" ? (
                    <button
                      className="button primary"
                      onClick={() => {
                        setTranscript(sourceText);
                        setOriginal(sourceText);
                        setPhase("transcribing");
                      }}
                    >
                      <Square size={14} />
                      Stop recording
                    </button>
                  ) : (
                    <>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setTranscript("");
                          setPhase("transcript");
                        }}
                      >
                        Type instead
                      </button>
                      <button className="button primary" onClick={record}>
                        <Mic size={16} />
                        Start demo recording
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : phase === "transcript" ? (
              <div className="voice-transcript-ready">
                <span className="success-icon">
                  <Check size={27} />
                </span>
                <h2>Here’s what we heard.</h2>
                <p>
                  Read it through. You can change any words before we prepare
                  the invoice.
                </p>
                <label className="field">
                  Edit transcript
                  <textarea
                    aria-label="Edit transcript"
                    rows={6}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Create an invoice for…"
                  />
                </label>
                <div className="voice-action-bar">
                  <button
                    className="button secondary"
                    onClick={() => setPhase("idle")}
                  >
                    <RotateCcw size={14} />
                    Record again
                  </button>
                  <button className="button primary" onClick={process}>
                    Continue · extract invoice <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="processing voice-processing" role="status">
                <span className="voice-processing-icon">
                  <Sparkles size={30} />
                </span>
                <LoaderCircle size={20} className="spin" />
                <h2>
                  {phase === "transcribing"
                    ? "Turning your words into text…"
                    : "Understanding your invoice…"}
                </h2>
                <p>
                  {phase === "transcribing"
                    ? "Keeping your transcript visible and editable."
                    : "Looking for the customer, items, prices and due date."}
                </p>
                <div className="progress-track">
                  <span />
                </div>
                <div className="live-transcript">
                  <small>YOUR TRANSCRIPT</small>
                  <p>{transcript}</p>
                </div>
              </div>
            )}
          </section>
          <aside className="voice-demo-panel">
            <span className="eyebrow">TRY A CONVERSATION</span>
            <h2>Pick a demo recording</h2>
            <p>
              Choose a realistic request, or type your own transcript.
              Extraction is simulated and always needs your review.
            </p>
            <div className="voice-demo-list">
              {voiceDemos.map((d, i) => (
                <button
                  key={d.name}
                  className={demo === i ? "selected" : ""}
                  disabled={phase !== "idle"}
                  onClick={() => setDemo(i)}
                >
                  <span className="demo-radio">{demo === i && <i />}</span>
                  <span>
                    <strong>{d.name}</strong>
                    <small>{d.hint}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="voice-help-note">
              <FileText size={20} />
              <strong>Your words. Your final say.</strong>
              <p>
                Nothing is saved as an invoice until you review the details,
                preview the document, and confirm.
              </p>
            </div>
            <button
              className="text-button"
              disabled={phase !== "idle"}
              onClick={() => setPermission("denied")}
            >
              Demo: microphone blocked
            </button>
          </aside>
        </div>
      )}
      {phase === "review" && (
        <>
          <div
            className={`voice-review-banner ${missing.length ? "needs-review" : "ready"}`}
          >
            <span className="insight-icon">
              {missing.length ? <Sparkles size={21} /> : <Check size={21} />}
            </span>
            <div>
              <h2>
                {missing.length
                  ? "Almost ready. Let’s fill in the gaps."
                  : "Everything is in place."}
              </h2>
              <p>
                {missing.length
                  ? `${missing.length} ${missing.length === 1 ? "detail needs" : "details need"} your attention. You can fix them below without recording again.`
                  : "Review the invoice preview before creating your draft."}
              </p>
            </div>
            <Badge>
              {missing.length ? "Review Required" : "Ready to Create"}
            </Badge>
          </div>
          <div className="voice-review-layout">
            <section className="panel voice-form-panel">
              <InvoiceFields
                voice
                draft={effectiveDraft}
                onChange={(d) => {
                  setDraft(d);
                  setErrors([]);
                }}
              />
              <div className="voice-action-bar sticky-voice-actions">
                <button
                  className="button secondary"
                  onClick={() => setTranscriptDrawer(true)}
                >
                  <Pencil size={14} />
                  Edit transcript
                </button>
                <button className="button primary" onClick={preview}>
                  <FileText size={16} />
                  Preview invoice <ArrowRight size={15} />
                </button>
              </div>
            </section>
            <aside className="voice-review-summary">
              <div className="voice-summary-head">
                <Sparkles size={18} />
                <h2>Voice assistant summary</h2>
              </div>
              <div className="voice-summary-status">
                <Check size={15} />
                <span>Invoice information extracted</span>
              </div>
              <small className="eyebrow">REVIEWED TRANSCRIPT</small>
              <blockquote>{transcript}</blockquote>
              <button
                className="text-button"
                onClick={() => setTranscriptDrawer(true)}
              >
                Open transcript <ArrowRight size={14} />
              </button>
              <hr />
              <small className="eyebrow">EXTRACTION CHECKLIST</small>
              {[
                {
                  label: "Customer",
                  value: customer?.name || draft.customerName || "Not detected",
                  okay: !!customer,
                },
                {
                  label: "Items",
                  value: `${draft.lineItems.length} detected`,
                  okay: draft.lineItems.every(
                    (l) =>
                      l.price !== "" &&
                      Number(l.price) > 0 &&
                      l.description.trim() &&
                      Number(l.quantity) > 0,
                  ),
                },
                {
                  label: "Due date",
                  value: draft.due || "Not provided",
                  okay: !!draft.due && draft.due >= draft.date,
                },
                {
                  label: "Currency",
                  value: draft.currency || "Not detected",
                  okay: !!draft.currency,
                },
                {
                  label: "Branch",
                  value: effectiveDraft.branch || "Choose a branch",
                  okay: !!effectiveDraft.branch,
                },
              ].map((check) => (
                <div className="extraction-check" key={check.label}>
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.value}</small>
                  </span>
                  <Badge>{check.okay ? "Confirmed" : "Missing"}</Badge>
                </div>
              ))}
              {draft.warnings.map((w) => (
                <p className="voice-extraction-warning" key={w}>
                  <AlertCircle size={14} />
                  {w}
                </p>
              ))}
              {draft.dueInterpretation && (
                <p className="voice-extraction-warning">
                  <AlertCircle size={14} />
                  {draft.dueInterpretation}
                </p>
              )}
              <div className="voice-summary-total">
                <small>DRAFT TOTAL</small>
                <strong>
                  {draft.currency ? (
                    <Money
                      value={
                        total.total / (draft.currency === "KHR" ? 4100 : 1)
                      }
                      currency={draft.currency}
                    />
                  ) : (
                    `${total.total.toFixed(2)} · select currency`
                  )}
                </strong>
              </div>
              <p className="demo-note">
                No customer balance or account ledger is changed until you
                create and progress this invoice.
              </p>
            </aside>
          </div>
        </>
      )}
      {phase === "preview" && customer && (
        <div className="voice-preview-layout">
          <div>
            <div className="preview-caption">
              <span>
                <FileText size={16} />
                Invoice preview
              </span>
              <Badge>Ready to Create</Badge>
            </div>
            <InvoiceDocument
              record={invoiceRecord(
                effectiveDraft,
                customer,
                a.state.settings.name,
                undefined,
                reservedId,
              )}
            />
          </div>
          <aside className="panel voice-preview-confirmation">
            <span className="large-icon">
              <ShieldCheck size={25} />
            </span>
            <h2>One final look.</h2>
            <p>
              Check the customer, currency, line items and due date. This
              creates a draft in your regular invoice workflow.
            </p>
            <div className="connection-flow">
              <span>Voice</span>
              <ArrowRight size={14} />
              <span>Invoice draft</span>
            </div>
            <p className="demo-note">
              Send when you’re ready. Sending adds the balance to receivables;
              payments update the ledger.
            </p>
            <div className="voice-action-bar sticky-voice-actions">
              <button
                className="button secondary"
                onClick={() => setPhase("review")}
              >
                <ArrowLeft size={15} />
                Back to review
              </button>
              <button className="button primary" onClick={create}>
                <Check size={16} />
                Create invoice
              </button>
            </div>
          </aside>
        </div>
      )}
      {phase === "success" && created && (
        <section className="panel voice-success">
          <span className="success-icon">
            <Check size={32} />
          </span>
          <span className="eyebrow">WORDS INTO WORK</span>
          <h2>Invoice created.</h2>
          <p>
            {created.id} · {created.name}
          </p>
          <strong className="voice-success-amount">
            <Money value={created.amount} currency={created.currency} />
          </strong>
          <p>
            Due {created.due} · {created.branch}
          </p>
          <Badge>{created.status}</Badge>
          <div className="connection-flow">
            <span>
              <Mic size={14} />
              Voice + AI
            </span>
            <ArrowRight size={15} />
            <span>
              <FileText size={14} />
              Your invoice workflow
            </span>
          </div>
          <div className="page-actions">
            <button
              className="button primary"
              onClick={() => a.detail("invoices", created)}
            >
              View invoice <ArrowRight size={15} />
            </button>
            {created.status === "Draft" && (
              <button
                className="button secondary"
                onClick={() => {
                  a.setState((s) => ({
                    ...s,
                    invoices: s.invoices.map((i) =>
                      i.id === created.id
                        ? {
                            ...i,
                            status: "Sent",
                            activity: [
                              ...(i.activity || []),
                              `${draft.date} · Invoice sent (simulated)`,
                            ],
                          }
                        : i,
                    ),
                  }));
                  a.notify(
                    "Invoice marked sent. Receivables and reports updated.",
                  );
                }}
              >
                <Send size={15} />
                Send invoice · demo
              </button>
            )}
            <button className="button secondary" onClick={restart}>
              <Mic size={15} />
              Create another by voice
            </button>
            <button className="text-button" onClick={() => a.go("invoices")}>
              Go to invoices
            </button>
          </div>
          <div className="voice-success-footnote">
            <Check size={14} />
            Saved to invoices and customer history · Original source retained
          </div>
        </section>
      )}
      {permission === "prompt" && (
        <Modal
          title="Microphone permission · demo"
          onClose={() => setPermission("unknown")}
        >
          <div className="voice-permission-prompt">
            <span className="large-icon">
              <Mic size={28} />
            </span>
            <h2>Your voice is a starting point.</h2>
            <p>
              Microphone access is required in a live voice session. This
              prototype simulates permission and speech; it does not activate
              your microphone.
            </p>
            <div className="page-actions">
              <button
                className="button secondary"
                onClick={() => setPermission("denied")}
              >
                Simulate denied
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setPermission("allowed");
                  start();
                }}
              >
                <Mic size={15} />
                Allow microphone · demo
              </button>
            </div>
          </div>
        </Modal>
      )}
      {transcriptDrawer && (
        <Modal
          title="Voice transcript"
          drawer
          onClose={() => setTranscriptDrawer(false)}
        >
          <div className="record-form">
            <p className="form-intro">
              Reprocessing replaces extracted fields. Review any manual
              corrections again before creating.
            </p>
            {original && original !== transcript && (
              <details>
                <summary>Original simulated recording</summary>
                <blockquote className="original-transcript">
                  {original}
                </blockquote>
              </details>
            )}
            <label>
              Edit transcript
              <textarea
                aria-label="Edit transcript"
                rows={8}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </label>
            <div className="form-footer">
              <button
                className="button secondary"
                onClick={() => {
                  setTranscriptDrawer(false);
                  setPhase("idle");
                }}
              >
                <RotateCcw size={14} />
                Record again
              </button>
              <button className="button primary" onClick={process}>
                <Sparkles size={15} />
                Reprocess transcript
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
