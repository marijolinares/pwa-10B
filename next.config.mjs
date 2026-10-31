/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No anunciar la tecnología del servidor en cada respuesta (amenaza #11 de docs/threat-model.md).
  poweredByHeader: false,
  async headers() {
    return [
      {
        // El navegador debe revalidar el service worker en cada visita para no
        // quedarse con una versión vieja cacheada (amenaza #8 de docs/threat-model.md).
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
