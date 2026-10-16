import { API_PREFIX, SESSION_COOKIE } from "@tlh/shared-contracts";
import { type NextRequest, NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/api/config";

/** Rotas acessíveis sem sessão. O showcase do design system não exibe dados. */
const PUBLIC_PATHS = ["/login", "/setup", "/design-system"];

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // A API fica na mesma origem da web: o cookie HttpOnly não cruza domínios e não há CORS.
  if (matches(pathname, API_PREFIX)) {
    return NextResponse.rewrite(new URL(`${pathname}${search}`, apiBaseUrl()));
  }

  if (PUBLIC_PATHS.some((path) => matches(pathname, path))) return NextResponse.next();

  // Checagem otimista: só a presença do cookie. A validade é verificada na API (requireMe).
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};
