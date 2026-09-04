import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../session.js";

export default function Navbar({ search, onSearchChange, onSearchSubmit }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/doctor" className="navbar-logo">
          <span className="navbar-logo-mark">Ii</span>
          <span className="navbar-logo-text">IndiaImplant</span>
        </Link>

        {onSearchChange && (
          <form
            className="navbar-search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <input
              type="text"
              placeholder="Search products, materials, or companies…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>
        )}

        <div className="navbar-right">
          <Link to="/psi" className="navbar-link">
            PSI Connect
          </Link>
          <div className="navbar-profile">
            <button
              className="navbar-profile-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="navbar-menu card">
                <div className="navbar-menu-name">{session?.name}</div>
                <div className="navbar-menu-sub">{session?.email}</div>
                <button className="btn btn-outline btn-sm btn-block" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .navbar {
          background: var(--surface);
          border-bottom: 1px solid var(--line);
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          gap: 24px;
          height: 64px;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .navbar-logo-mark {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          background: var(--accent-deep);
          color: var(--surface);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .navbar-logo-text {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 18px;
          color: var(--ink);
        }
        .navbar-search {
          flex: 1;
          display: flex;
          gap: 8px;
          max-width: 520px;
        }
        .navbar-search input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: var(--paper);
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-left: auto;
        }
        .navbar-link {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-deep);
        }
        .navbar-link:hover {
          text-decoration: underline;
        }
        .navbar-profile {
          position: relative;
        }
        .navbar-profile-btn {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          width: 36px;
          height: 36px;
          font-size: 16px;
        }
        .navbar-menu {
          position: absolute;
          right: 0;
          top: 44px;
          width: 220px;
          padding: 14px;
          box-shadow: var(--shadow-md);
        }
        .navbar-menu-name {
          font-weight: 600;
          font-size: 14px;
        }
        .navbar-menu-sub {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 12px;
        }
      `}</style>
    </header>
  );
}
