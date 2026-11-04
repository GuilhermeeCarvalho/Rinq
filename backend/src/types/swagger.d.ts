declare module 'swagger-jsdoc' {
  export default function swaggerJSDoc(options: {
    definition: Record<string, unknown>
    apis: string[]
  }): Record<string, unknown>
}
