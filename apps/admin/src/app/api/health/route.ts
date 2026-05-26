import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const port = req.nextUrl.searchParams.get("port");
  if (!port || isNaN(Number(port))) {
    return NextResponse.json({ error: "invalid port" }, { status: 400 });
  }

  const base = `http://localhost:${port}`;
  const start = Date.now();

  try {
    const [healthRes, docsRes] = await Promise.allSettled([
      fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/docs`,   { signal: AbortSignal.timeout(2000) }),
    ]);

    const ok = healthRes.status === "fulfilled" && healthRes.value.ok;
    const hasSwagger = docsRes.status === "fulfilled" && docsRes.value.ok;

    return NextResponse.json({ ok, latency: Date.now() - start, hasSwagger });
  } catch {
    return NextResponse.json({ ok: false, latency: Date.now() - start, hasSwagger: false });
  }
}
