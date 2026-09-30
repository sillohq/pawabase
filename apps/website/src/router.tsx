import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  Outlet,
} from "@tanstack/react-router";
import { Home } from "./Home";
export function makeRouter(server = false) {
  const root = createRootRoute({
    component: () => (
      <>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Outlet />
      </>
    ),
    notFoundComponent: () => (
      <main id="main" className="section">
        <h1>Page not found.</h1>
        <a href="/">Back to Pawabase →</a>
      </main>
    ),
  });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: Home,
  });
  return createRouter({
    routeTree: root.addChildren([home]),
    ...(server
      ? { history: createMemoryHistory({ initialEntries: ["/"] }) }
      : {}),
  });
}
