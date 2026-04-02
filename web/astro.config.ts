import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import starlight from '@astrojs/starlight';
import starlightThemeBlack from 'starlight-theme-black';
import { SITE_DESCRIPTION } from './src/site-meta';

// https://astro.build/config
export default defineConfig({
  site: 'https://rsv.repair',
  redirects: {
    '/welcome': '/docs/',
    '/docs/parashoot-rsv': '/docs/spot-rsv-early/',
  },
  vite: {
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    worker: {
      format: 'iife',
    },
    build: {
      target: 'esnext',
    },
  },
  integrations: [
    sitemap(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    starlight({
      customCss: ['./src/styles/starlight-grayscale.css'],
      disable404Route: true,
      title: 'rsv.repair',
      description: SITE_DESCRIPTION,
      logo: {
        src: './src/assets/logo.svg',
        alt: 'rsv.repair',
      },
      head: [
        {
          tag: 'script',
          attrs: {
            defer: true,
            src: '/scripts/intercom-consent.js',
          },
        },
        {
          tag: 'style',
          content: `
            .footer {
              display: none !important;
            }
            .site-title .logo-size {
              width: auto !important;
              height: 1.5rem !important;
              object-fit: contain;
            }
          `,
        },
      ],
      plugins: [
        starlightThemeBlack({
          footerText: '',
        }),
      ],
      sidebar: [
        {
          label: 'Overview',
          items: [{ slug: 'docs', label: 'Welcome' }],
        },
        {
          label: 'Guides',
          items: [
            { slug: 'docs/what-is-rsv' },
            { slug: 'docs/spot-rsv-early' },
            { slug: 'docs/using-the-web-app' },
            { slug: 'docs/rsv-format' },
            { slug: 'docs/untrunc' },
            { slug: 'docs/privacy' },
          ],
        },
        {
          label: 'Help',
          items: [{ label: 'Support', link: '/support/' }],
        },
      ],
    }),
  ],
});
