import { useEffect, useRef, useState } from "react";
import { Brand, Icon } from "./Primitives";
import { dashboard, docs, github, products } from "../config";
export function Navigation() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const productButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("pawabase.website.theme");
    const next = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("pawabase.website.theme", next ? "dark" : "light");
  };
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open) productButton.current?.focus();
        else if (mobile) mobileButton.current?.focus();
        setOpen(false);
        setMobile(false);
      }
    };
    const outside = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) {
        setOpen(false);
        setMobile(false);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, mobile]);
  return (
    <header className="site-header">
      <nav ref={nav} className="navigation" aria-label="Main navigation">
        <Brand />
        <button
          ref={mobileButton}
          className="menu-toggle"
          aria-expanded={mobile}
          aria-controls="nav-links"
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? "Close" : "Menu"}{" "}
          <span aria-hidden="true">{mobile ? "×" : "☰"}</span>
        </button>
        <div
          id="nav-links"
          className={`nav-links ${mobile ? "mobile-open" : ""}`}
        >
          <button
            ref={productButton}
            className="nav-product"
            aria-expanded={open}
            aria-controls="product-menu"
            onClick={() => setOpen(!open)}
          >
            Product <span aria-hidden="true">⌄</span>
          </button>
          <a href={docs("clients/overview")} onClick={() => setMobile(false)}>
            Developers
          </a>
          <a href={github} onClick={() => setMobile(false)}>
            Open source
          </a>
          <a href={docs()}>
            Docs <span aria-hidden="true">↗</span>
          </a>
          <a className="nav-github" href={github}>
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}><span aria-hidden="true">{dark ? "☀" : "◐"}</span></button>
          {dashboard ? (
            <a className="button small" href={dashboard}>
              Open Studio <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <a className="button small" href={docs("installation/docker")}>
              Run Pawabase <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        {open && (
          <div className="mega-menu" id="product-menu">
            <div className="mega-intro">
              <p className="eyebrow">THE CONNECTED BACKEND</p>
              <h2>
                One platform.
                <br />
                More ways to build.
              </h2>
              <p>Explore the building blocks in the documentation.</p>
              <a
                href={docs()}
                onClick={() => {
                  setOpen(false);
                  setMobile(false);
                }}
              >
                See the platform ↓
              </a>
            </div>
            <div className="mega-products">
              {products.map((p) => (
                <a key={p.name} href={docs(p.path)}>
                  <span className={`feature-icon ${p.tone}`}>
                    <Icon name={p.icon} />
                  </span>
                  <span>
                    <b>{p.name}</b>
                    <small>{p.detail}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer section">
      <div className="footer-top">
        <div>
          <Brand />
          <p>
            Bring your infrastructure.
            <br />
            Build your backend.
          </p>
        </div>
        <div>
          <h2>Build</h2>
          <a href={docs("data/resources")}>Database</a>
          <a href={docs("flows/overview")}>Flows</a>
          <a href={docs("auth/overview")}>Authentication</a>
        </div>
        <div>
          <h2>Explore</h2>
          <a href={docs()}>Documentation</a>
          <a href={docs("installation/docker")}>Self-host Pawabase</a>
          <a href={docs("concepts/architecture")}>Architecture</a>
        </div>
        <div>
          <h2>Build with us</h2>
          <a href={github}>Source code ↗</a>
          <a href={`${github}/issues`}>Issues & ideas ↗</a>
          <a href="https://sillo.build">Built on Sillo ↗</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Pawabase</span>
        <span>Your infrastructure. Your application.</span>
        <a href="#main">Back to top ↑</a>
      </div>
    </footer>
  );
}
