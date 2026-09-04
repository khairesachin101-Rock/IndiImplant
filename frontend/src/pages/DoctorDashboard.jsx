import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import OfferSlider from "../components/OfferSlider.jsx";
import { api } from "../api.js";
import { getSession } from "../session.js";

const CATEGORY_META = {
  "Hip Implant": { icon: "🦴" },
  "Knee Implant": { icon: "🦵" },
  "Spine Implant": { icon: "🩻" },
  Arthroscopy: { icon: "🔧" },
  "Cranial Implant": { icon: "🧠" },
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [myEnquiries, setMyEnquiries] = useState([]);
  const [myCases, setMyCases] = useState([]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getCompanies().then(setCompanies).catch(() => {});
    if (session?.id) {
      api.getEnquiries({ doctorId: session.id }).then(setMyEnquiries).catch(() => {});
      api.getPsiCases({ doctorId: session.id }).then(setMyCases).catch(() => {});
    }
  }, [session?.id]);

  function submitSearch() {
    if (search.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(search)}`);
    }
  }

  return (
    <div className="page">
      <Navbar search={search} onSearchChange={setSearch} onSearchSubmit={submitSearch} />

      <div className="container doctor-home">
        <div className="doctor-welcome">
          <span className="eyebrow">Welcome back</span>
          <h2>{session?.name}</h2>
        </div>

        <OfferSlider />

        <section className="doctor-section">
          <div className="doctor-section-head">
            <div>
              <span className="eyebrow">Custom implants</span>
              <h3>PSI Connect</h3>
              <p className="doctor-section-sub">
                Submit a patient-specific implant case directly to a manufacturer, or post it
                openly for multiple companies to quote.
              </p>
            </div>
            <Link to="/psi" className="btn btn-secondary">
              Open PSI Connect
            </Link>
          </div>
        </section>

        <section className="doctor-section">
          <div className="doctor-section-head">
            <div>
              <span className="eyebrow">Ready-made products</span>
              <h3>Implant Catalogue</h3>
              <p className="doctor-section-sub">
                Browse verified manufacturers by implant category.
              </p>
            </div>
          </div>

          <div className="category-grid">
            {categories.map((cat) => (
              <Link key={cat} to={`/category/${encodeURIComponent(cat)}`} className="category-card card">
                <span className="category-card-icon">{CATEGORY_META[cat]?.icon || "⚙️"}</span>
                <span className="category-card-name">{cat}</span>
              </Link>
            ))}
          </div>
        </section>

        {companies.length > 0 && (
          <section className="doctor-section">
            <div className="doctor-section-head">
              <div>
                <span className="eyebrow">Manufacturers</span>
                <h3>Browse &amp; connect directly</h3>
                <p className="doctor-section-sub">
                  Visit a manufacturer's profile and start a live chat, even without ordering a
                  product first.
                </p>
              </div>
            </div>
            <div className="mfg-grid">
              {companies.map((c) => (
                <Link key={c.id} to={`/company/${c.id}`} className="mfg-card card">
                  <span className="mfg-card-initial">{c.logoInitial}</span>
                  <div>
                    <div className="mfg-card-name">{c.name}</div>
                    <div className="mfg-card-loc">{c.location}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(myEnquiries.length > 0 || myCases.length > 0) && (
          <section className="doctor-section">
            <div className="doctor-section-head">
              <div>
                <span className="eyebrow">Track progress</span>
                <h3>Your orders, enquiries &amp; PSI cases</h3>
              </div>
            </div>
            <div className="my-activity-list">
              {myEnquiries.map((e) => (
                <Link key={e.id} to={`/chat/enquiry/${e.id}`} className="my-activity-row card">
                  <div>
                    <div className="my-activity-title">{e.productName || "Direct conversation"}</div>
                    <div className="my-activity-sub">{e.companyName || "Manufacturer"}</div>
                  </div>
                  <span className={`my-activity-status my-activity-status-${e.status}`}>
                    {e.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
              {myCases.map((c) => (
                <Link key={c.id} to={`/chat/psi/${c.id}`} className="my-activity-row card">
                  <div>
                    <div className="my-activity-title">PSI Case</div>
                    <div className="my-activity-sub">{c.companyName || "Open case"}</div>
                  </div>
                  <span className={`my-activity-status my-activity-status-${c.status}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .doctor-home {
          padding: 28px 24px 60px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .doctor-welcome h2 {
          font-size: 24px;
          margin-top: 4px;
        }
        .doctor-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 16px;
        }
        .doctor-section-head h3 {
          font-size: 20px;
          margin: 4px 0 6px;
        }
        .doctor-section-sub {
          font-size: 13px;
          color: var(--muted);
          max-width: 460px;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 14px;
        }
        .category-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 20px 16px;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .category-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .category-card-icon {
          font-size: 24px;
        }
        .category-card-name {
          font-weight: 600;
          font-size: 14px;
        }
        .mfg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .mfg-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .mfg-card:hover {
          border-color: var(--accent);
        }
        .mfg-card-initial {
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
        .mfg-card-name {
          font-weight: 600;
          font-size: 13.5px;
        }
        .mfg-card-loc {
          font-size: 12px;
          color: var(--muted);
        }
        .my-activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .my-activity-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .my-activity-title {
          font-weight: 600;
          font-size: 13.5px;
        }
        .my-activity-sub {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }
        .my-activity-status {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--paper);
          border: 1px solid var(--line);
          flex-shrink: 0;
        }
        .my-activity-status-confirmed, .my-activity-status-completed {
          background: rgba(31,122,108,0.1);
          border-color: var(--accent);
          color: var(--accent-deep);
        }
      `}</style>
    </div>
  );
}
