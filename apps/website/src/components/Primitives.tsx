import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  folder: <path d="M3 7V4h7l3 3h8v13H3z" />,
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" />
    </>
  ),
  flow: (
    <>
      <rect x="2" y="3" width="6" height="6" rx="1" />
      <rect x="16" y="15" width="6" height="6" rx="1" />
      <path d="M8 6h7a4 4 0 0 1 4 4v5M5 9v9h11" />
    </>
  ),
  stack: (
    <>
      <path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4" />
    </>
  ),
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />,
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
};
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.code}
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Pawabase home">
      <img src="/favicon.svg" width="36" height="36" alt="" />
      pawabase
    </a>
  );
}
export function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={`arrow-link ${className}`} href={href}>
      {children}
      <Icon name="arrow" />
    </a>
  );
}
export function SectionHeading({
  number,
  label,
  children,
  description,
}: {
  number: string;
  label: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">
        <span>{number}</span> {label}
      </p>
      <h2>{children}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}
export function ProductWindow({
  children,
  title,
  className = "",
}: {
  children: ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <div className={`product-window ${className}`}>
      <div className="window-bar">
        <span className="window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>{title}</span>
        <span className="window-label">PAWABASE STUDIO</span>
      </div>
      {children}
    </div>
  );
}
