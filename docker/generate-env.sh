#!/usr/bin/env bash
# Génère le fichier .env à la racine du dépôt, utilisé par docker-compose.yml
# pour partager la même paire de clés RS256 (et les secrets de refresh token)
# entre tous les microservices. À exécuter une seule fois avant le premier
# "docker compose up" (ou à nouveau si vous voulez révoquer toutes les sessions).
set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env existe déjà à la racine — rien à faire (supprimez-le pour régénérer)."
  exit 0
fi

TMP=$(mktemp -d)
openssl genrsa -out "$TMP/private.pem" 2048 2>/dev/null
openssl rsa -in "$TMP/private.pem" -pubout -out "$TMP/public.pem" 2>/dev/null

cat > .env <<EOF
JWT_PRIVATE_KEY=$(base64 -w0 "$TMP/private.pem")
JWT_PUBLIC_KEY=$(base64 -w0 "$TMP/public.pem")
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_CUSTOMER_REFRESH_SECRET=$(openssl rand -hex 32)
EOF

rm -rf "$TMP"
echo ".env généré à la racine du dépôt. Vous pouvez maintenant lancer : docker compose up --build"
