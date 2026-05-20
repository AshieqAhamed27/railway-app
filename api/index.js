import { handleApi } from "../src/server.js";

function normalizeRewrittenUrl(request) {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url, `https://${host}`);
  const path = request.query?.path;

  if (path) {
    const segments = Array.isArray(path) ? path.join("/") : String(path);
    url.pathname = `/api/${segments}`;
    url.searchParams.delete("path");
    request.url = `${url.pathname}${url.search}`;
  }

  return request;
}

export default async function handler(request, response) {
  return handleApi(normalizeRewrittenUrl(request), response);
}
