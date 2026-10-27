/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
// CSP sources take origins only — strip any path from the API URL.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
})();
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' only for `next dev` (HMR/webpack). Production stays strict.
              "script-src 'self' 'unsafe-inline' https://maps.googleapis.com" + (isProd ? "" : " 'unsafe-eval'"),
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Google Maps tiles, markers + fonts.
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://maps.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' " + apiOrigin + " https://maps.googleapis.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
