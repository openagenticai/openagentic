import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/tools/index.ts',
    'src/orchestrators/index.ts',
    'src/providers/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    'openai',
    '@anthropic-ai/sdk'
  ]
});