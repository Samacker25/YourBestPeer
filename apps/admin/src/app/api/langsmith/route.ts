import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.smith.langchain.com";
const API_KEY = process.env.LANGCHAIN_API_KEY ?? "";
const PROJECT = process.env.LANGCHAIN_PROJECT ?? "yourbestpeer";

async function getSessionId(): Promise<string | null> {
  const res = await fetch(`${BASE}/sessions?name=${encodeURIComponent(PROJECT)}`, {
    headers: { "x-api-key": API_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "LANGCHAIN_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const runType = searchParams.get("run_type") ?? "";
  const errorOnly = searchParams.get("error") === "true";

  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: `Project "${PROJECT}" not found in LangSmith` }, { status: 404 });
    }

    const body: Record<string, unknown> = {
      session: [sessionId],
      limit,
    };
    if (runType) {
      body.run_type = runType;
    } else {
      body.is_root = true; // top-level traces only when showing all types
    }
    if (errorOnly) body.error = "has:error";

    const res = await fetch(`${BASE}/runs/query`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    // API returns { runs: [...], cursors: {...} }
    return NextResponse.json(data.runs ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
