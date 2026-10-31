import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { securityHeaders } from "./lib/security/headers";

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  for (const { key, value } of securityHeaders()) res.headers.set(key, value);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};