import { NextResponse } from "next/server";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:8001";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "admin_dev_key";

export async function GET() {
  try {
    const res = await fetch(`${AUTH_SERVICE}/users/admin/list`, {
      headers: { "X-Admin-Key": ADMIN_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
