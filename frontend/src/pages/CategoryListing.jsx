import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { api } from "../api.js";

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "rating", label: "Highest rated" },
  { value: "orders", label: "Most ordered" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function CategoryListing() {
  const { categoryName } = useParams();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState("");
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAll = categoryName === "all";

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (!isAll) params.category = decodeURIComponent(categoryName);
    if (search) params.search = search;

    api
      .getProducts(params)
      .then((data) => {
        setProducts(certifiedOnly ? data.filter((p) => p.cdscoCertified) : data);
      })
      .finally(() => setLoading(false));
  }, [categoryName, search, sort, certifiedOnly]);

  return (
    <div className="page">
      <Navbar search={search} onSearchChange={setSearch} onSearchSubmit={() => {}} />

      <div className="container listing-layout">
        <aside className="listing-filters card">
          <h4 style={{ marginBottom: 14 }}>Filters</h4>

          <div className="field">
            <label>Sort by</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="listing-checkbox">
            <input
              type="checkbox"
              checked={certifiedOnly}
              onChange={(e) => setCertifiedOnly(e.target.checked)}
            />
            CDSCO Certified only
          </label>
        </aside>

        <div className="listing-main">
          <div className="listing-head">
            <h2>{isAll ? `Results for "${search}"` : decodeURIComponent(categoryName)}</h2>
            <span className="listing-count">
              {loading ? "Loading…" : `${products.length} products`}
            </span>
          </div>

          {!loading && products.length === 0 && (
            <div className="listing-empty card">
              <p>No products match your search yet. Try a different category or keyword.</p>
              <Link to="/doctor" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                Back to categories
              </Link>
            </div>
          )}

          <div className="listing-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .listing-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 28px;
          padding: 28px 24px 60px;
        }
        .listing-filters {
          padding: 18px;
          align-self: start;
          position: sticky;
          top: 84px;
        }
        .listing-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          margin-top: 6px;
        }
        .listing-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 18px;
        }
        .listing-head h2 {
          font-size: 22px;
        }
        .listing-count {
          font-size: 13px;
          color: var(--muted);
        }
        .listing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .listing-empty {
          padding: 30px;
          text-align: center;
          color: var(--muted);
        }
        @media (max-width: 760px) {
          .listing-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
