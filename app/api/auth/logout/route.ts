import { clearTokens } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  await clearTokens();
  // 303 sends the browser to GET /login on the redirect (See Other),
  // which is what we want when a <form method=POST> submits.
  //
  // Derive the redirect origin from the *request* — the previous
  // version read `NEXT_PUBLIC_BASE_URL` with a `http://localhost:3001`
  // fallback, which meant any prod deploy that forgot to set that env
  // var sent users from demo.esus.health straight to localhost. Using
  // `req.url` is robust: it's always the actual origin the browser
  // hit, no env-var coordination needed.
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
