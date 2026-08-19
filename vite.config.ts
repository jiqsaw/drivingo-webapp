import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        // Keep in sync with "paths" in tsconfig.app.json
        alias: {
            '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
            '@routes': fileURLToPath(new URL('./src/routes', import.meta.url)),
        },
    },
});
