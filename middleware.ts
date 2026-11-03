import { NextRequest, NextResponse } from "next/server";
import { validateServerSession } from "@/data/auth/server";
import { roleDestination } from "@/domain/auth-routing";
export async function middleware(request: NextRequest) {
  // Demo cannot authorize any real API request; HTTP mode always validates at Nest.
  if ((process.env.NEXT_PUBLIC_DATA_SOURCE || "mock") === "mock")
    return NextResponse.next();
  try {
    const user = await validateServerSession(request.headers.get("cookie"));
    if (!user) {
      const url = new URL("/login", request.url);
      url.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(url);
    }
    const expected = roleDestination(user.rol);
    if (
      request.nextUrl.pathname !== expected &&
      !request.nextUrl.pathname.startsWith(`${expected}/`)
    )
      return NextResponse.redirect(new URL(expected, request.url));
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return new NextResponse(
      "No se pudo verificar tu sesión. Vuelve a intentar en unos momentos.",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }
}
export const config = { matcher: ["/paciente/:path*", "/dentista/:path*"] };
