type ProxyContext = { params: Promise<{ path: string[] }> };
const requestHeaders = ["accept", "content-type", "x-student-id"] as const;

function allowedMethods(path: string[]): string[] {
  if (path.some((segment) => segment === "." || segment === ".." || /[\\/%\u0000-\u001f\u007f]/.test(segment))) return [];
  if (path.length === 1 && path[0] === "classes") return ["GET", "POST"];
  if (path.length === 2 && path[0] === "classes") return ["GET"];
  if (path.length === 3 && path[0] === "classes" && path[2] === "holds") return ["POST"];
  if (path.length === 2 && path[0] === "holds") return ["GET", "DELETE"];
  if (path.length === 3 && path[0] === "holds" && path[2] === "confirm") return ["POST"];
  if (path.length === 2 && path[0] === "me" && path[1] === "holds") return ["GET"];
  return [];
}

function problem(status: number, title: string, detail: string, extraHeaders: Record<string, string> = {}) {
  return Response.json({ type: "about:blank", title, status, detail }, {
    status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store", ...extraHeaders },
  });
}

async function proxy(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const methods = allowedMethods(path);
  if (methods.length === 0) return problem(404, "Not found", "This API endpoint does not exist.");
  if (!methods.includes(request.method)) return problem(405, "Method not allowed", "This method is not supported for the endpoint.", { Allow: methods.join(", ") });
  try {
    // Read on every request so the same image can select its upstream at runtime.
    const baseUrl = process.env.API_BASE_URL ?? "http://localhost:8080";
    const upstreamUrl = new URL(`${baseUrl.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}`);
    upstreamUrl.search = new URL(request.url).search;
    const headers = new Headers();
    for (const name of requestHeaders) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "POST" || request.method === "DELETE" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    const location = upstream.headers.get("location");
    if (location) {
      const target = new URL(location, upstreamUrl);
      const basePath = new URL(baseUrl).pathname.replace(/\/$/, "");
      if (target.origin === upstreamUrl.origin && target.pathname.startsWith(`${basePath}/`)) {
        const localPath = target.pathname.slice(basePath.length);
        responseHeaders.set("Location", `/api${localPath}${target.search}${target.hash}`);
      }
    }
    return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return problem(502, "Admission service unavailable", "The admission service could not be reached. Please try again.");
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
