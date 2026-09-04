import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { api } from "../api.js";
import { getSession } from "../session.js";

export default function PSIConnect() {
  const navigate = useNavigate();
  const session = getSession();
  const [companies, setCompanies] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [mode, setMode] = useState(null); // 'company' | 'open' | null
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [caseNotes, setCaseNotes] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCompanies({ psiOnly: "true" }).then(setCompanies);
    if (session?.id) {
      api.getPsiCases({ doctorId: session.id }).then(setMyCases).catch(() => {});
    }
  }, [session?.id]);

  function openCaseForm(company) {
    setSelectedCompany(company);
    setMode("company");
  }

  function openOpenCaseForm() {
    setSelectedCompany(null);
    setMode("open");
  }

  async function submitCase(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let filePath = null;
      if (file) {
        filePath = await api.uploadPsiFile(file);
      }
      const psiCase = await api.createPsiCase({
        doctorName: session?.name,
        phone: session?.phone,
        companyId: selectedCompany?.id || null,
        caseNotes,
        openCase: mode === "open",
        filePath,
      });
      // Thread id for the real-time chat — scoped to this case.
      navigate(`/chat/psi/${psiCase.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <div className="container psi-page">
        <span className="eyebrow">Patient-specific implants</span>
        <h2 style={{ margin: "6px 0 6px" }}>PSI Connect</h2>
        <p className="psi-intro">
          Submit a case to a specific manufacturer, or post it openly and let certified PSI
          manufacturers quote you.
        </p>

        {myCases.length > 0 && (
          <div className="psi-my-cases">
            <h4 style={{ marginBottom: 12 }}>Your submitted cases</h4>
            {myCases.map((c) => (
              <Link key={c.id} to={`/chat/psi/${c.id}`} className="psi-case-row card">
                <div>
                  <div className="psi-case-row-title">
                    {c.companyName || "Open case — awaiting company"}
                  </div>
                  <div className="psi-case-row-sub">{c.caseNotes}</div>
                </div>
                <span className={`psi-case-status psi-case-status-${c.status}`}>
                  {c.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        )}

        {!mode && (
          <>
            <button className="btn btn-secondary" onClick={openOpenCaseForm} style={{ marginBottom: 28 }}>
              + Post an open case (no specific company)
            </button>

            <h4 style={{ marginBottom: 14 }}>Or connect with a specific PSI manufacturer</h4>
            <div className="psi-company-grid">
              {companies.map((c) => (
                <button key={c.id} className="psi-company-card card" onClick={() => openCaseForm(c)}>
                  <span className="psi-company-initial">{c.logoInitial}</span>
                  <div>
                    <div className="psi-company-name">{c.name}</div>
                    <div className="psi-company-loc">{c.location}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {mode && (
          <div className="psi-form card">
            <span className="eyebrow">
              {mode === "open" ? "Open case" : `Case for ${selectedCompany.name}`}
            </span>
            <h3 style={{ margin: "6px 0 18px" }}>
              {mode === "open" ? "Describe the case" : "Upload case details"}
            </h3>

            <form onSubmit={submitCase}>
              <div className="field">
                <label>Case notes (implant type, region, patient details reference)</label>
                <textarea
                  required
                  placeholder="E.g. Cranial defect, right parietal region, CT scan attached, planned surgery in 3 weeks…"
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="field">
                <label>Attach case file (CT scan / DICOM export)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && <span className="psi-file-name">Selected: {file.name}</span>}
                <span className="psi-file-note">
                  Uploaded to a private Supabase Storage bucket, accessible only to logged-in
                  users. Anonymise patient-identifiable details before upload — before handling
                  real patient scans, get a DPDP Act 2023 compliance review done (see README).
                </span>
              </div>

              {error && <p className="modal-error">{error}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit case"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .psi-page {
          padding: 28px 24px 60px;
          max-width: 760px;
        }
        .psi-intro {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 24px;
          max-width: 560px;
        }
        .psi-my-cases {
          margin-bottom: 28px;
        }
        .psi-case-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 8px;
        }
        .psi-case-row-title {
          font-weight: 600;
          font-size: 13.5px;
        }
        .psi-case-row-sub {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          max-width: 460px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .psi-case-status {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--surface);
          border: 1px solid var(--line);
          flex-shrink: 0;
        }
        .psi-case-status-confirmed, .psi-case-status-completed {
          background: rgba(31,122,108,0.1);
          border-color: var(--accent);
          color: var(--accent-deep);
        }
        .psi-company-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .psi-company-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          text-align: left;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
        }
        .psi-company-card:hover {
          border-color: var(--accent);
        }
        .psi-company-initial {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--accent-deep);
          color: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          flex-shrink: 0;
        }
        .psi-company-name {
          font-weight: 600;
          font-size: 14px;
        }
        .psi-company-loc {
          font-size: 12px;
          color: var(--muted);
        }
        .psi-form {
          padding: 26px;
        }
        .psi-file-name {
          font-size: 12px;
          color: var(--accent-deep);
          margin-top: 6px;
          display: block;
        }
        .psi-file-note {
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 6px;
          display: block;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
