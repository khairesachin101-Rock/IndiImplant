import React from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card card">
      <div className="product-card-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="product-card-img" />
        ) : (
          <span className="product-card-initial">{product.name.charAt(0)}</span>
        )}
      </div>
      <div className="product-card-body">
        <div className="product-card-badges">
          {product.cdscoCertified && (
            <span className="badge badge-certified">CDSCO ✓</span>
          )}
          {product.isPSI && <span className="badge badge-psi">PSI Only</span>}
        </div>
        <h4 className="product-card-name">{product.name}</h4>
        <p className="product-card-company">{product.companyName}</p>
        <p className="product-card-material">{product.material}</p>
        <div className="product-card-footer">
          <span className="product-card-price">
            {product.price ? `₹${product.price.toLocaleString("en-IN")}` : "Quote on request"}
          </span>
          <span className="product-card-rating">★ {product.rating}</span>
        </div>
      </div>

      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .product-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .product-card-image {
          background: var(--paper);
          border-bottom: 1px solid var(--line);
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .product-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-card-initial {
          font-family: var(--font-display);
          font-size: 34px;
          color: var(--line);
        }
        .product-card-body {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .product-card-badges {
          display: flex;
          gap: 6px;
        }
        .product-card-name {
          font-size: 15px;
          margin-top: 4px;
        }
        .product-card-company {
          font-size: 12px;
          color: var(--accent-deep);
          font-weight: 600;
        }
        .product-card-material {
          font-size: 12px;
          color: var(--muted);
        }
        .product-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        .product-card-price {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
        }
        .product-card-rating {
          font-size: 12px;
          color: var(--accent-warm);
          font-weight: 600;
        }
      `}</style>
    </Link>
  );
}
