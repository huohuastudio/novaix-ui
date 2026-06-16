import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: process.env.OPENAPI_INPUT || '../docs/swagger.json',
  output: 'src/api',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/client-axios',
  ],
})
