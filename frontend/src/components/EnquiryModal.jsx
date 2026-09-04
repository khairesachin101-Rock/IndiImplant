import React, { useState } from "react";
import { api } from "../api.js";
import { getSession } from "../session.js";

export default function EnquiryModal({ product, type, onClose }) {
  const session = getSession();
  const [form, setForm] = useState({
    doctorName: session?.name || "",
    phone: session?.phone || "",
    hospital: "",
    message:
      type === "order"
        ? `I would like to place an order for ${product.name}.`
        : `I have a query regarding ${product.name}.`,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createEnquiry({
        ...form,
        productId: product.id,
        type,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {submitted ? (
          <div className="modal-success">
            <h3>{type === "order" ? "Order request sent" : "Enquiry sent"}</h3>
            <p>
              {product.companyName} has received your {type === "order" ? "order" : "enquiry"} for{" "}
              <strong>{product.name}</strong>. They will reach out to confirm details.
            </p>
            <button className="btn btn-secondary btn-block" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <span className="eyebrow">{type === "order" ? "Order now" : "Send enquiry"}</span>
            <h3 style={{ marginTop: 6, marginBottom: 16 }}>{product.name}</h3>

            <div className="field">
              <label>Your name</label>
              <input
                required
                value={form.doctorName}
                onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Hospital / Clinic</label>
              <input
                value={form.hospital}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            {error && <p className="modal-error">{error}</p>}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Sending…" : type === "order" ? "Confirm order request" : "Send enquiry"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(14, 27, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          width: 100%;
          max-width: 420px;
          padding: 28px;
          position: relative;
          box-shadow: var(--shadow-md);
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          font-size: 15px;
          color: var(--muted);
        }
        .modal-error {
          color: var(--danger);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .modal-success h3 {
          margin-bottom: 10px;
        }
        .modal-success p {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
