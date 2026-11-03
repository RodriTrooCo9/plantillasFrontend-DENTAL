import {NextRequest, NextResponse} from 'next/server';

/**
 * MIDDLEWARE DE NEXT.JS PARA RUTAS POR ROL
 * Verifica el rol en cookies cuando existe y redirige si un PACIENTE intenta entrar a /dentista.
 * La validación complementaria de cliente (RoleGuard) permite también autologin demo en previsualización.
 */
export function middleware(request: NextRequest) {
  const roleCookie = request.cookies.get('lumina_role')?.value;
  const {pathname} = request.nextUrl;

  if (pathname.startsWith('/dentista') && roleCookie === 'PACIENTE') {
    return NextResponse.redirect(new URL('/paciente', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/paciente/:path*', '/dentista/:path*'],
};
