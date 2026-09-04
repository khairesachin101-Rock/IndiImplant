import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import EnquiryModal from "../components/EnquiryModal.jsx";
import { api } from "../api.js";
import { getSession } from "../session.js";

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [product, setProduct] = useState(null);
  const [modalType, setModalType] = useState(null); // 'order' | 'enquiry' | null
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api.getProduct(productId).then(setProduct);
  }, [productId]);

  async function chatWithCompany() {
    setConnecting(true);
    try {
      const enquiry = await api.createEnquiry({
        doctorName: session?.name,
        phone: session?.phone,
        message: `Chat started about ${product.name}.`,
        type: "enquiry",
        productId: product.id,
      });
      navigate(`/chat/enquiry/${enquiry.id}`);
    } finally {
      setConnecting(false);
    }
  }

  if (!product) {
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

      <div className="container product-detail">
        <div className="product-detail-crumb">
          <Link to={`/category/${encodeURIComponent(product.category)}`}>{product.category}</Link>
          <span> / </span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-grid">
          <div className="product-detail-image card">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="product-detail-img" />
            ) : (
              <span>{product.name.charAt(0)}</span>
            )}
          </div>

          <div className="product-detail-info">
            <div className="product-detail-badges">
              {product.cdscoCertified && <span className="badge badge-certified">CDSCO ✓</span>}
              {product.isPSI && <span className="badge badge-psi">PSI Only</span>}
            </div>
            <h1 className="product-detail-name">{product.name}</h1>
            <Link
              to={`/company/${product.companyId}`}
              className="product-detail-company"
            >
              {product.companyName} →
            </Link>

            <p className="product-detail-desc">{product.description}</p>

            <div className="product-detail-meta">
              <div>
                <span className="eyebrow">Material</span>
                <p>{product.material}</p>
              </div>
              <div>
                <span className="eyebrow">Size range</span>
                <p>{product.sizeRange}</p>
              </div>
              <div>
                <span className="eyebrow">Delivery</span>
                <p>{product.deliveryDays} days</p>
              </div>
              <div>
                <span className="eyebrow">Rating</span>
                <p>★ {product.rating} ({product.ordersCount} orders)</p>
              </div>
            </div>

            <div className="product-detail-price">
              {product.price ? `₹${product.price.toLocaleString("en-IN")}` : "Quote on request"}
            </div>

            {product.isPSI ? (
              <Link to="/psi" className="btn btn-primary btn-block">
                Go to PSI Connect
              </Link>
            ) : (
              <div className="product-detail-actions">
                <button className="btn btn-primary" onClick={() => setModalType("order")}>
                  Order Now
                </button>
                <button className="btn btn-outline" onClick={() => setModalType("enquiry")}>
                  Enquiry
                </button>
                <button className="btn btn-secondary" onClick={chatWithCompany} disabled={connecting}>
                  {connecting ? "Connecting…" : "💬 Chat with company"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="product-detail-specs card">
          <h3 style={{ marginBottom: 16 }}>Full specifications</h3>
          <table className="specs-table">
            <tbody>
              {Object.entries(product.specs).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalType && (
        <EnquiryModal product={product} type={modalType} onClose={() => setModalType(null)} />
      )}

      <style>{`
        .product-detail {
          padding: 28px 24px 60px;
        }
        .product-detail-crumb {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 20px;
        }
        .product-detail-crumb a {
          color: var(--accent-deep);
          font-weight: 600;
        }
        .product-detail-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 32px;
          margin-bottom: 32px;
        }
        .product-detail-image {
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 70px;
          color: var(--line);
          background: var(--paper);
          overflow: hidden;
        }
        .product-detail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-detail-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        .product-detail-name {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .product-detail-company {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-deep);
        }
        .product-detail-desc {
          font-size: 14px;
          color: var(--muted);
          margin: 16px 0 20px;
          line-height: 1.6;
        }
        .product-detail-meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .product-detail-meta p {
          font-size: 13.5px;
          margin-top: 3px;
        }
        .product-detail-price {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .product-detail-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .product-detail-specs {
          padding: 24px;
        }
        .specs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        .specs-table td {
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }
        .specs-table td:first-child {
          width: 220px;
          color: var(--muted);
          font-weight: 600;
        }
        @media (max-width: 760px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
