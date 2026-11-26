import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        acceso: resolve(rootDir, 'acceso.html'),
        zonaPreparacion: resolve(rootDir, 'zona-preparacion.html'),
        posVendedor: resolve(rootDir, 'pos-vendedor.html'),
        posCajero: resolve(rootDir, 'pos-cajero.html'),
        almacen: resolve(rootDir, 'almacen.html'),
      },
    },
  },
});
