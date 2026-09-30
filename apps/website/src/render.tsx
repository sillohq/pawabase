import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import { makeRouter } from "./router";
export async function render() {
  const router = makeRouter(true);
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}
