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
// KYC document thumbnails are presigned S3 URLs. CSP is origin-based, so the
// storage origin must be allowed explicitly or the browser blocks the <img>
// (the tag is in the DOM but nothing renders). Override/extend with
// MEDIA_ORIGIN="https://cdn.example.com,https://minio.internal"
// for non-AWS storage.
const mediaOrigins = (process.env.MEDIA_ORIGIN ?? process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  // Google Maps tiles, markers + fonts.
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://maps.gstatic.com",
  // KYC documents / rider uploads (any S3 bucket or region, and presigned URLs).
  "https://*.amazonaws.com",
  ...mediaOrigins,
].join(" ");

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
              "img-src " + imgSrc,
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
