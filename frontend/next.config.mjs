/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ne réimporte que les modules réellement utilisés de ces librairies
  // volumineuses au lieu de tout leur barrel — réduit fortement le nombre de
  // modules à compiler par route en dev (webpack et Turbopack).
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'chart.js', 'react-chartjs-2'],
    // Équivalent Turbopack de l'alias webpack "canvas" ci-dessous (Next 14.2 :
    // la clé stable `turbopack` top-level n'existe qu'à partir de Next 15).
    turbo: {
      resolveAlias: {
        canvas: './empty-module.js',
      },
    },
  },
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
