import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // const env = loadEnv(mode, '.', ''); // No longer loading GEMINI_API_KEY from .env for client
    return {
      // define: {
      //   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY) // REMOVED
      // },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
