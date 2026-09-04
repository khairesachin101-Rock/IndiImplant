import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSession, clearSession } from "../session.js";
import { api } from "../api.js";

const TABS = [
  { id: "catalogue", label: "Catalogue" },
  { id: "enquiries", label: "Enquiries & Orders" },
  { id: "psi", label: "PSI Cases" },
  { id: "profile", label: "Profile" },
];

const CATEGORIES = [
  "Hip Implant",
  "Knee Implant",
  "Spine Implant",
  "Arthroscopy",
  "Cranial Implant",
];

const emptyProductForm = {
  name: "",
  category: CATEGORIES[0],
  material: "",
  sizeRange: "",
  price: "",
  deliveryDays: "",
  description: "",
  cdscoCertified: true,
  isPSI: false,
};

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const [tab, setTab] = useState("catalogue");
  const [menuOpen, setMenuOpen] = useState(false);
  const [enquiries, setEnquiries] = useState([]);
  const [psiCases, setPsiCases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productImage, setProductImage] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState("");

  const [companyProfile, setCompanyProfile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // The logged-in manufacturer's real company id, set when they signed up
  // (see profiles.company_id in supabase/schema.sql).
  const companyId = session?.companyId;

  function loadAll() {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getEnquiries({ companyId }),
      api.getPsiCases({ companyId }),
      api.getMyProducts(companyId),
      api.getCompany(companyId),
    ])
      .then(([e, p, prod, company]) => {
        setEnquiries(e);
        setPsiCases(p);
        setProducts(prod);
        setCompanyProfile(company);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function updateStatus(id, status) {
    const updated = await api.updateEnquiryStatus(id, status);
    setEnquiries((list) => list.map((e) => (e.id === id ? updated : e)));
  }

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  async function submitProduct(e) {
    e.preventDefault();
    if (!companyId) return;
    setProductError("");
    setSavingProduct(true);
    try {
      let imageUrl = null;
      if (productImage) {
        imageUrl = await api.uploadProductImage(companyId, productImage);
      }
      await api.createProduct({
        companyId,
        companyName: session?.name,
        ...productForm,
        imageUrl,
      });
      setProductForm(emptyProductForm);
      setProductImage(null);
      loadAll();
    } catch (err) {
      setProductError(err.message);
    } finally {
      setSavingProduct(false);
    }
  }

  async function removeProduct(id) {
    if (!confirm("Remove this product from your catalogue?")) return;
    await api.deleteProduct(id);
    setProducts((list) => list.filter((p) => p.id !== id));
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!companyId || !companyProfile) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const updated = await api.updateCompany(companyId, companyProfile);
      setCompanyProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="page">
      <header className="dash-header">
        <div className="container dash-header-inner">
          <div className="dash-brand">
            <span className="dash-brand-mark">Ii</span>
            <span>IndiaImplant · Manufacturer</span>
          </div>
          <div className="dash-menu-wrap">
            <button className="dash-menu-btn" onClick={() => setMenuOpen((v) => !v)}>
              ☰
            </button>
            {menuOpen && (
              <div className="dash-menu card">
                <div className="dash-menu-name">{session?.name}</div>
                <div className="dash-menu-sub">{session?.email}</div>
                <button className="btn btn-outline btn-sm btn-block" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container dash-body">
        <div className="dash-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`dash-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "enquiries" && (
          <div className="dash-list">
            {loading && <p>Loading…</p>}
            {!loading && enquiries.length === 0 && (
              <p className="dash-empty">No enquiries yet. Listings will show up here once doctors reach out.</p>
            )}
            {enquiries.map((e) => (
              <div key={e.id} className="dash-card card">
                <div className="dash-card-top">
                  <div>
                    <div className="dash-card-name">{e.doctorName}</div>
                    <div className="dash-card-sub">
                      {e.hospital || "Independent"} · {e.type === "order" ? "Order request" : "Enquiry"}
                    </div>
                  </div>
                  <span className={`dash-status dash-status-${e.status}`}>{e.status}</span>
                </div>
                {e.productName && (
                  <div className="dash-card-product">Product: {e.productName}</div>
                )}
                <p className="dash-card-message">{e.message}</p>
                <div className="dash-card-actions">
                  <a href={`tel:${e.phone}`} className="btn btn-outline btn-sm">
                    📞 {e.phone}
                  </a>
                  <Link to={`/chat/enquiry/${e.id}`} className="btn btn-outline btn-sm">
                    💬 Connect with doctor
                  </Link>
                  {e.status === "new" && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => updateStatus(e.id, "in_discussion")}
                    >
                      Mark in discussion
                    </button>
                  )}
                  {e.status !== "confirmed" && e.status !== "new" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStatus(e.id, "confirmed")}
                    >
                      Confirm order
                    </button>
                  )}
                  {e.status === "confirmed" && (
                    <span className="dash-payment-note">
                      Payment due {new Date(e.paymentDueDate).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "psi" && (
          <div className="dash-list">
            {loading && <p>Loading…</p>}
            {!loading && psiCases.length === 0 && (
              <p className="dash-empty">No PSI cases assigned to your company yet.</p>
            )}
            {psiCases.map((c) => (
              <Link key={c.id} to={`/chat/psi/${c.id}`} className="dash-card card">
                <div className="dash-card-top">
                  <div>
                    <div className="dash-card-name">{c.doctorName}</div>
                    <div className="dash-card-sub">{c.openCase ? "Open case" : "Direct case"}</div>
                  </div>
                  <span className={`dash-status dash-status-${c.status}`}>{c.status}</span>
                </div>
                <p className="dash-card-message">{c.caseNotes}</p>
              </Link>
            ))}
          </div>
        )}

        {tab === "catalogue" && (
          <div className="catalogue-layout">
            <form className="dash-card card catalogue-form" onSubmit={submitProduct}>
              <h4 style={{ marginBottom: 14 }}>Add a product</h4>

              <div className="field">
                <label>Product name</label>
                <input
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Material</label>
                <input
                  value={productForm.material}
                  onChange={(e) => setProductForm((f) => ({ ...f, material: e.target.value }))}
                  placeholder="e.g. Titanium Alloy (Ti6Al4V)"
                />
              </div>

              <div className="field">
                <label>Size range</label>
                <input
                  value={productForm.sizeRange}
                  onChange={(e) => setProductForm((f) => ({ ...f, sizeRange: e.target.value }))}
                  placeholder="e.g. 44mm - 66mm"
                />
              </div>

              <div className="catalogue-form-row">
                <div className="field">
                  <label>Price (₹, optional)</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="Leave blank for quote on request"
                  />
                </div>
                <div className="field">
                  <label>Delivery (days)</label>
                  <input
                    type="number"
                    value={productForm.deliveryDays}
                    onChange={(e) => setProductForm((f) => ({ ...f, deliveryDays: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Product image</label>
                <input type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
              </div>

              <label className="listing-checkbox">
                <input
                  type="checkbox"
                  checked={productForm.cdscoCertified}
                  onChange={(e) => setProductForm((f) => ({ ...f, cdscoCertified: e.target.checked }))}
                />
                CDSCO certified
              </label>
              <label className="listing-checkbox">
                <input
                  type="checkbox"
                  checked={productForm.isPSI}
                  onChange={(e) => setProductForm((f) => ({ ...f, isPSI: e.target.checked }))}
                />
                Patient-specific (PSI only — no fixed price)
              </label>

              {productError && <p className="modal-error" style={{ marginTop: 10 }}>{productError}</p>}

              <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: 14 }} disabled={savingProduct}>
                {savingProduct ? "Saving…" : "Add to catalogue"}
              </button>
            </form>

            <div className="catalogue-list">
              <h4 style={{ marginBottom: 14 }}>Your listed products ({products.length})</h4>
              {loading && <p>Loading…</p>}
              {!loading && products.length === 0 && (
                <p className="dash-empty">No products listed yet — add your first one.</p>
              )}
              {products.map((p) => (
                <div key={p.id} className="dash-card card catalogue-item">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="catalogue-item-img" />
                  ) : (
                    <div className="catalogue-item-img catalogue-item-img-placeholder">{p.name.charAt(0)}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="dash-card-name">{p.name}</div>
                    <div className="dash-card-sub">
                      {p.category} · {p.material || "—"} · {p.price ? `₹${p.price.toLocaleString("en-IN")}` : "Quote on request"}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => removeProduct(p.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "profile" && companyProfile && (
          <form className="dash-card card" style={{ maxWidth: 480 }} onSubmit={saveProfile}>
            <div className="field">
              <label>Company name</label>
              <input
                value={companyProfile.name || ""}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>About</label>
              <textarea
                rows={3}
                value={companyProfile.about || ""}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, about: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Location</label>
              <input
                value={companyProfile.location || ""}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, location: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>CDSCO license number</label>
              <input
                value={companyProfile.cdscoLicense || ""}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, cdscoLicense: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={companyProfile.phone || ""}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, phone: e.target.value }))}
              />
            </div>
            <label className="listing-checkbox" style={{ marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={!!companyProfile.psiEnabled}
                onChange={(e) => setCompanyProfile((c) => ({ ...c, psiEnabled: e.target.checked }))}
              />
              Accept PSI Connect cases (show up as a PSI manufacturer to doctors)
            </label>
            {profileSaved && <p style={{ color: "var(--accent-deep)", fontSize: 13, marginBottom: 10 }}>Saved.</p>}
            <button className="btn btn-secondary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .dash-header {
          background: var(--ink);
          color: var(--surface);
        }
        .dash-header-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 60px;
        }
        .dash-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 14px;
        }
        .dash-brand-mark {
          background: var(--accent-warm);
          width: 28px;
          height: 28px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
        }
        .dash-menu-wrap {
          position: relative;
        }
        .dash-menu-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: var(--surface);
          width: 34px;
          height: 34px;
          border-radius: 4px;
          font-size: 15px;
        }
        .dash-menu {
          position: absolute;
          right: 0;
          top: 42px;
          width: 220px;
          padding: 14px;
          box-shadow: var(--shadow-md);
        }
        .dash-menu-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--ink);
        }
        .dash-menu-sub {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 12px;
        }
        .dash-body {
          padding: 24px 24px 60px;
        }
        .dash-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 22px;
        }
        .dash-tab {
          background: none;
          border: none;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--muted);
          border-bottom: 2px solid transparent;
        }
        .dash-tab.active {
          color: var(--ink);
          border-bottom-color: var(--accent-warm);
        }
        .dash-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 640px;
        }
        .dash-empty {
          color: var(--muted);
          font-size: 13.5px;
        }
        .dash-card {
          padding: 16px 18px;
          display: block;
        }
        .dash-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .dash-card-name {
          font-weight: 600;
          font-size: 14px;
        }
        .dash-card-sub {
          font-size: 12px;
          color: var(--muted);
        }
        .dash-card-product {
          font-size: 12.5px;
          color: var(--accent-deep);
          font-weight: 600;
          margin-top: 8px;
        }
        .dash-card-message {
          font-size: 13px;
          color: var(--ink);
          margin-top: 8px;
        }
        .dash-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .dash-payment-note {
          font-size: 12px;
          color: var(--accent-deep);
          font-weight: 600;
        }
        .dash-status {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--paper);
          border: 1px solid var(--line);
          height: fit-content;
        }
        .dash-status-confirmed {
          background: rgba(31,122,108,0.1);
          border-color: var(--accent);
          color: var(--accent-deep);
        }
        .catalogue-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }
        .catalogue-form {
          padding: 22px;
          position: sticky;
          top: 24px;
        }
        .catalogue-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .catalogue-list {
          display: flex;
          flex-direction: column;
        }
        .catalogue-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .catalogue-item-img {
          width: 52px;
          height: 52px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          background: var(--paper);
          border: 1px solid var(--line);
        }
        .catalogue-item-img-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 20px;
          color: var(--line);
        }
        @media (max-width: 860px) {
          .catalogue-layout {
            grid-template-columns: 1fr;
          }
          .catalogue-form {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
