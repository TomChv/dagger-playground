export async function handle(request) {
  const body = await request.json();
  if (typeof body.tier !== "string") {
    return new Response("tier is required", { status: 422 });
  }
  return Response.json({ tier: body.tier });
}
