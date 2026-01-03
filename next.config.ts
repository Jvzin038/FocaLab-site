import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Na versão nova do Next.js, essa configuração fica na raiz e mudou de nome
  serverExternalPackages: ['pdf-parse', 'canvas', '@napi-rs/canvas'],
};

export default nextConfig;