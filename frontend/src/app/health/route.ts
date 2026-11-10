export function GET() {
  return Response.json({ status: "healthy" }, { headers: { "Cache-Control": "no-store" } });
}
