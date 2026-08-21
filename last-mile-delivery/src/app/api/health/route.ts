export async function GET() {
  return Response.json({
    status: "ok",
    service: "last-mile-delivery",
    time: new Date().toISOString(),
  });
}
