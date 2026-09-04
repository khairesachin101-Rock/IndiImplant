import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { refreshSessionFromAuth } from "../session.js";

const ROLES = [
  { id: "doctor", label: "Doctor / Surgeon" },
  { id: "company", label: "Manufacturer" },
  { id: "distributor", label: "Distributor" },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("doctor");
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    regNo: "",
    hospitalOrCompany: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const effectiveRole = role === "distributor" ? "doctor" : role; // distributor uses the doctor UI for now

      if (mode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });
        if (signUpError) throw signUpError;

        const userId = signUpData.user?.id;
        if (!userId) {
          // Email confirmation is likely required by your Supabase project
          // settings — the user must click the emailed link before a
          // session (and therefore a profile) can be created.
          setError(
            "Check your email to confirm your account, then log in. (Turn off email confirmation in Supabase → Authentication → Providers if you don't want this step yet.)"
          );
          setLoading(false);
          return;
        }

        let companyId = null;
        if (effectiveRole === "company") {
          const { data: company, error: companyError } = await supabase
            .from("companies")
            .insert({
              owner_id: userId,
              name: form.hospitalOrCompany || "New Manufacturer",
              logo_initial: (form.hospitalOrCompany || "N").charAt(0).toUpperCase(),
              phone: form.phone,
              psi_enabled: true,
            })
            .select()
            .single();
          if (companyError) throw companyError;
          companyId = company.id;
        }

        const { error: profileError } = await supabase.from("profiles").insert({
          id: userId,
          role: effectiveRole,
          name: form.name || (effectiveRole === "doctor" ? "Dr. Surgeon" : "Company Admin"),
          email: form.email,
          phone: form.phone,
          hospital_or_company: form.hospitalOrCompany,
          reg_no: form.regNo,
          company_id: companyId,
        });
        if (profileError) throw profileError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
      }

      const session = await refreshSessionFromAuth();
      if (!session) {
        throw new Error("Signed in, but couldn't load your profile. Try logging in again.");
      }
      navigate(session.role === "company" ? "/dashboard" : "/doctor");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-brand-mark">Ii</span>
          <div>
            <div className="login-brand-name">IndiaImplant</div>
            <div className="login-brand-tag">Catalogue &amp; PSI Connect for implant surgeons</div>
          </div>
        </div>

        <div className="login-role-tabs">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className={`login-role-tab ${role === r.id ? "active" : ""}`}
              onClick={() => setRole(r.id)}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="login-mode-tabs">
          <button
            className={`login-mode-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Log in
          </button>
          <button
            className={`login-mode-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "signup" && (
            <div className="field">
              <label>{role === "company" ? "Contact person name" : "Full name"}</label>
              <input value={form.name} onChange={(e) => handleField("name", e.target.value)} />
            </div>
          )}

          {mode === "signup" && role === "doctor" && (
            <div className="field">
              <label>Medical registration number</label>
              <input value={form.regNo} onChange={(e) => handleField("regNo", e.target.value)} />
            </div>
          )}

          {mode === "signup" && role === "company" && (
            <div className="field">
              <label>Company name</label>
              <input
                value={form.hospitalOrCompany}
                onChange={(e) => handleField("hospitalOrCompany", e.target.value)}
              />
            </div>
          )}

          {mode === "signup" && role === "doctor" && (
            <div className="field">
              <label>Hospital / Clinic</label>
              <input
                value={form.hospitalOrCompany}
                onChange={(e) => handleField("hospitalOrCompany", e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => handleField("email", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => handleField("password", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Phone number</label>
            <input value={form.phone} onChange={(e) => handleField("phone", e.target.value)} />
          </div>

          {error && <p className="modal-error" style={{ marginBottom: 14 }}>{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : `Create ${role} account`}
          </button>
        </form>

        <p className="login-note">
          Real accounts — your password is verified by Supabase Auth, and access to every
          record is enforced server-side by Row Level Security.
        </p>
      </div>

      <div className="login-side">
        <div className="login-side-content">
          <span className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
            For manufacturers &amp; distributors
          </span>
          <h2>List once. Reach every certified surgeon on the platform.</h2>
          <p>
            Catalogue listings, PSI case requests, and enquiry leads — all routed through one
            verified dashboard.
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .login-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          max-width: 460px;
          margin: 0 auto;
          width: 100%;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 36px;
        }
        .login-brand-mark {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 22px;
          background: var(--accent-deep);
          color: var(--surface);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .login-brand-name {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 19px;
        }
        .login-brand-tag {
          font-size: 12px;
          color: var(--muted);
        }
        .login-role-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 20px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 4px;
        }
        .login-role-tab {
          flex: 1;
          background: none;
          border: none;
          padding: 9px 8px;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 3px;
          color: var(--muted);
        }
        .login-role-tab.active {
          background: var(--ink);
          color: var(--surface);
        }
        .login-mode-tabs {
          display: flex;
          gap: 20px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 22px;
        }
        .login-mode-tab {
          background: none;
          border: none;
          padding: 0 0 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--muted);
          border-bottom: 2px solid transparent;
        }
        .login-mode-tab.active {
          color: var(--ink);
          border-bottom-color: var(--accent-warm);
        }
        .login-note {
          font-size: 12px;
          color: var(--muted);
          margin-top: 16px;
          text-align: center;
        }
        .login-side {
          background: linear-gradient(160deg, var(--ink), var(--accent-deep));
          display: flex;
          align-items: center;
          padding: 48px;
        }
        .login-side-content {
          max-width: 380px;
        }
        .login-side h2 {
          font-size: 30px;
          color: var(--surface);
          margin: 10px 0 14px;
          line-height: 1.25;
        }
        .login-side p {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
        }
        @media (max-width: 860px) {
          .login-page {
            grid-template-columns: 1fr;
          }
          .login-side {
            display: none;
          }
          .login-panel {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
}
