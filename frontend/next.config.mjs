/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // konva embarque un fallback Node.js (index-node.js) qui requiert le
    // paquet natif "canvas" pour un rendu côté serveur — inutile ici puisque
    // l'éditeur 2D (react-konva) est chargé exclusivement côté client via
    // next/dynamic({ ssr: false }). Sans cet alias, le build webpack échoue
    // en tentant de résoudre cette dépendance native jamais réellement utilisée.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
