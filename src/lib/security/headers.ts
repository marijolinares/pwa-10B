// src/lib/security/headers.ts
export type Header = { key: string; value: string };

type CspOptions = { dev?: boolean };

/** Construye la Content-Security-Policy. En dev permite 'unsafe-eval' (lo necesita Next). */
export function buildCsp(options: CspOptions = {}): string {
  const dev = options.dev ?? process.env.NODE_ENV === "development";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Lista de headers de seguridad para aplicar a todas las respuestas. */
export function securityHeaders(options: CspOptions = {}): Header[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}