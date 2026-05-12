import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '../../',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.ADMIN_PORT ?? 48_904),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      rsc: {
        enabled: true,
      },
      srcDirectory: 'src',
    }),
    rsc(),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    nitro({
      preset: 'bun',
    }),
  ],
});
