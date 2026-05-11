import { clearTokens } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  await clearTokens();
  // 303 sends the browser to GET /login on the redirect (See Other),
  // which is what we want when a <form method=POST> submits.
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001"), {
    status: 303,
  });
}
