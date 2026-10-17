import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProdDomain = host.includes("akubrecah.com");
  const cookieDomain = process.env.NODE_ENV === "production" && isProdDomain ? ".akubrecah.com" : undefined;

  const response = NextResponse.json({
    success: true,
    message: "Admin session cleared successfully.",
  });

  // Clear cookies on default host
  response.cookies.delete("admin_magic_auth");
  response.cookies.delete("admin_magic_client");

  // Explicitly expire on root path with maxAge: 0
  response.cookies.set("admin_magic_auth", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  response.cookies.set("admin_magic_client", "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  // Also clear parent domain cookies if in production domain
  if (cookieDomain) {
    response.cookies.set("admin_magic_auth", "", {
      domain: cookieDomain,
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: true,
    });
    response.cookies.set("admin_magic_client", "", {
      domain: cookieDomain,
      path: "/",
      maxAge: 0,
      httpOnly: false,
      secure: true,
    });
  }

  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
