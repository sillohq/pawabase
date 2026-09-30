/// <reference types="vite/client" />
export const github = "https://github.com/sillohq/pawabase";
// Source documentation is the safe default until a public docs host is configured.
export const docs = (page = "quickstart") =>
  import.meta.env.VITE_DOCS_URL
    ? `${import.meta.env.VITE_DOCS_URL.replace(/\/$/, "")}/${page}`
    : `${github}/blob/main/apps/docs/${page}.mdx`;
export const dashboard = import.meta.env.VITE_DASHBOARD_URL as
  | string
  | undefined;
export const products = [
  {
    name: "Database",
    detail: "Your data, with an API.",
    path: "data/resources",
    tone: "lavender",
    icon: "database",
  },
  {
    name: "Authentication",
    detail: "Identity meets access control.",
    path: "auth/overview",
    tone: "peach",
    icon: "shield",
  },
  {
    name: "Storage",
    detail: "Files with signed access.",
    path: "storage/overview",
    tone: "butter",
    icon: "folder",
  },
  {
    name: "Realtime",
    detail: "Broadcast. Presence. History.",
    path: "realtime/overview",
    tone: "mint",
    icon: "radio",
  },
  {
    name: "Flows",
    detail: "Backend logic you can follow.",
    path: "flows/overview",
    tone: "lavender",
    icon: "flow",
  },
  {
    name: "Jobs & queues",
    detail: "Work beyond the request.",
    path: "jobs/queues",
    tone: "sky",
    icon: "stack",
  },
] as const;
