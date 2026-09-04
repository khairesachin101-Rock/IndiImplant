import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { api } from "../api.js";
import { getSession } from "../session.js";

export default function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [company, setCompany] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCompany(companyId).then(setCompany);
  }, [companyId]);

  async function connect() {
    setError("");
    setConnecting(true);
    try {
      const enquiry = await api.createEnquiry({
        doctorName: session?.name,
        phone: session?.phone,
        message: `Started a conversation with ${company.name}.`,
        type: "enquiry",
        companyId: company.id,
        companyName: company.name,
      });
      navigate(`/chat/enquiry/${enquiry.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }

  if (!company) {
    return (
      <div className="page">
        <Navbar />
        <div className="container" style={{ padding: 40 }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />

      <div className="container company-profile">
        <div className="company-profile-header card">
          <span className="company-profile-initial">{company.logoInitial}</span>
          <div style={{ flex: 1 }}>
            <h2>{company.name}</h2>
            <p className="company-profile-loc">{company.location}</p>
            {company.cdscoLicense && (
              <span className="badge badge-certified" style={{ marginTop: 8, display: "inline-flex" }}>
                CDSCO {company.cdscoLicense}
              </span>
            )}
          </div>
          <div>
            <button className="btn btn-primary" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "💬 Connect / Chat with this company"}
            </button>
            {error && <p className="modal-error" style={{ marginTop: 8 }}>{error}</p>}
          </div>
        </div>

        <p className="company-profile-about">{company.about || "No description added yet."}</p>

        <h3 style={{ margin: "24px 0 14px" }}>Products from {company.name}</h3>
        {company.products.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            No products listed yet — but you can still connect and chat with this manufacturer above.
          </p>
        ) : (
          <div className="company-profile-grid">
            {company.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .company-profile {
          padding: 28px 24px 60px;
        }
        .company-profile-header {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 24px;
          flex-wrap: wrap;
        }
        .company-profile-initial {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--accent-deep);
          color: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .company-profile-loc {
          font-size: 13px;
          color: var(--muted);
          margin-top: 2px;
        }
        .company-profile-about {
          font-size: 14px;
          color: var(--muted);
          max-width: 640px;
          margin-top: 20px;
          line-height: 1.6;
        }
        .company-profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
