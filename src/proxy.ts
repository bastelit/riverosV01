import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.jpg|.*\\.png|.*\\.svg).*)",
  ],
};
