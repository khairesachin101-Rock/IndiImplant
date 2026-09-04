import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { api } from "../api.js";
import { getSession } from "../session.js";

const PSI_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "designer_assigned", label: "Designer assigned" },
  { key: "quoted", label: "Quoted" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
];

const ENQUIRY_STEPS = [
  { key: "new", label: "New" },
  { key: "in_discussion", label: "In discussion" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
];

function StatusTracker({ steps, currentStatus }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  return (
    <div className="status-tracker">
      {steps.map((s, i) => (
        <div key={s.key} className={`status-step ${i <= currentIndex ? "done" : ""}`}>
          <span className="status-step-dot" />
          <span className="status-step-label">{s.label}</span>
          {i < steps.length - 1 && <span className="status-step-line" />}
        </div>
      ))}
      <style>{`
        .status-tracker {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
          background: var(--paper);
          overflow-x: auto;
        }
        .status-step {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .status-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--line);
          flex-shrink: 0;
        }
        .status-step.done .status-step-dot {
          background: var(--accent);
        }
        .status-step-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--muted);
          margin: 0 8px;
          white-space: nowrap;
        }
        .status-step.done .status-step-label {
          color: var(--ink);
        }
        .status-step-line {
          width: 28px;
          height: 1px;
          background: var(--line);
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
}

export default function PSICaseChat() {
  const { threadId, type } = useParams(); // type: 'psi' | 'enquiry'
  const threadType = type === "enquiry" ? "enquiry" : "psi";
  const session = getSession();
  const isCompany = session?.role === "company";
  const sender = isCompany ? "company" : "doctor";

  const [record, setRecord] = useState(null); // the psi_case or enquiry row
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [updating, setUpdating] = useState(false);
  const bottomRef = useRef(null);

  async function loadRecord() {
    try {
      const data = threadType === "psi" ? await api.getPsiCase(threadId) : await api.getEnquiry(threadId);
      setRecord(data);
    } catch {
      setRecord(null);
    }
  }

  useEffect(() => {
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, threadType]);

  useEffect(() => {
    let active = true;
    api
      .getMessages(threadId, threadType)
      .then((data) => {
        if (active) setMessages(data);
      })
      .catch(() => {});

    const unsubscribe = api.subscribeMessages(threadId, threadType, (msg) => {
      setMessages((m) => (m.some((existing) => existing.id === msg.id) ? m : [...m, msg]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [threadId, threadType]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = await api.sendMessage({ threadId, threadType, sender, text });
    setMessages((m) => [...m, msg]);
    setText("");
  }

  async function sendSystemMessage(msgText) {
    const msg = await api.sendMessage({ threadId, threadType, sender, text: msgText });
    setMessages((m) => [...m, msg]);
  }

  async function updateStatus(status) {
    setUpdating(true);
    try {
      if (threadType === "psi") {
        await api.updatePsiCase(threadId, { status });
      } else {
        await api.updateEnquiryStatus(threadId, status);
      }
      await loadRecord();
      await sendSystemMessage(`Status updated: ${status.replace("_", " ")}.`);
    } finally {
      setUpdating(false);
    }
  }

  async function sendQuotation() {
    if (!quoteAmount) return;
    if (threadType === "psi") {
      await api.updatePsiCase(threadId, { status: "quoted", quotation: Number(quoteAmount) });
    }
    const quoteText = `Quotation shared: ₹${Number(quoteAmount).toLocaleString("en-IN")}. Payment due 15 days after surgery via UPI / bank transfer / QR code.`;
    await sendSystemMessage(quoteText);
    await loadRecord();
    setQuoteAmount("");
  }

  const steps = threadType === "psi" ? PSI_STEPS : ENQUIRY_STEPS;
  const backLink = isCompany ? "/dashboard" : threadType === "psi" ? "/psi" : "/doctor";

  return (
    <div className="page">
      <Navbar />

      <div className="container chat-page">
        <div className="chat-crumb">
          <Link to={backLink}>← Back</Link>
        </div>

        <div className="chat-layout card">
          <div className="chat-header">
            <div>
              <span className="eyebrow">
                {threadType === "psi" ? "PSI Case" : "Order / Enquiry"} · {record?.doctorName || "…"}
              </span>
              <h3 style={{ marginTop: 4 }}>
                {threadType === "psi" ? "Case discussion" : record?.productName || "Discussion"}
              </h3>
            </div>
            {!isCompany && (
              <a href="tel:+919999999999" className="btn btn-outline btn-sm">
                📞 Call
              </a>
            )}
          </div>

          {record && <StatusTracker steps={steps} currentStatus={record.status} />}

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">
                No messages yet. {isCompany ? "Reply to the surgeon" : "Send a message"} to start
                the conversation.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.sender === sender ? "self" : "other"}`}
              >
                <p>{m.text}</p>
                <span className="chat-bubble-time">
                  {new Date(m.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {isCompany && (
            <div className="chat-quote-bar">
              {threadType === "psi" && (
                <>
                  <input
                    type="number"
                    placeholder="Quote amount (₹)"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                  />
                  <button className="btn btn-outline btn-sm" onClick={sendQuotation} disabled={updating}>
                    Share quotation
                  </button>
                  {record?.status === "submitted" && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => updateStatus("designer_assigned")}
                      disabled={updating}
                    >
                      Assign designer
                    </button>
                  )}
                </>
              )}
              {record?.status !== "confirmed" && record?.status !== "completed" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => updateStatus("confirmed")}
                  disabled={updating}
                >
                  Confirm {threadType === "psi" ? "case" : "order"}
                </button>
              )}
              {record?.status === "confirmed" && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => updateStatus("completed")}
                  disabled={updating}
                >
                  Mark completed
                </button>
              )}
            </div>
          )}

          <form className="chat-input-bar" onSubmit={send}>
            <input
              type="text"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit">
              Send
            </button>
          </form>
        </div>

        <div className="chat-payment-note card">
          <span className="eyebrow">Payment cycle</span>
          <p>
            Once confirmed, payment is due 15 days after surgery — payable via UPI, bank
            transfer, or QR code. A production build should hold payment in escrow via a
            licensed payment gateway (e.g. Razorpay Route) rather than peer-to-peer transfer.
          </p>
        </div>
      </div>

      <style>{`
        .chat-page {
          padding: 24px 24px 60px;
          max-width: 720px;
        }
        .chat-crumb {
          font-size: 13px;
          margin-bottom: 14px;
        }
        .chat-crumb a {
          color: var(--accent-deep);
          font-weight: 600;
        }
        .chat-layout {
          display: flex;
          flex-direction: column;
          min-height: 560px;
        }
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 420px;
        }
        .chat-empty {
          color: var(--muted);
          font-size: 13px;
          text-align: center;
          margin-top: 40px;
        }
        .chat-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13.5px;
        }
        .chat-bubble.self {
          align-self: flex-end;
          background: var(--accent-deep);
          color: var(--surface);
          border-bottom-right-radius: 2px;
        }
        .chat-bubble.other {
          align-self: flex-start;
          background: var(--paper);
          border: 1px solid var(--line);
          border-bottom-left-radius: 2px;
        }
        .chat-bubble-time {
          display: block;
          font-size: 10px;
          opacity: 0.65;
          margin-top: 4px;
        }
        .chat-quote-bar {
          display: flex;
          gap: 8px;
          padding: 10px 20px;
          border-top: 1px solid var(--line);
          background: var(--paper);
          flex-wrap: wrap;
        }
        .chat-quote-bar input {
          flex: 1;
          min-width: 140px;
          padding: 8px 10px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
        }
        .chat-input-bar {
          display: flex;
          gap: 8px;
          padding: 14px 20px;
          border-top: 1px solid var(--line);
        }
        .chat-input-bar input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
        }
        .chat-payment-note {
          margin-top: 18px;
          padding: 18px 20px;
        }
        .chat-payment-note p {
          font-size: 13px;
          color: var(--muted);
          margin-top: 6px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
