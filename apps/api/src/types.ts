export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  ENV?: string
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string
}

export type Variables = {
  userId: number
}

export type AppContext = {
  Bindings: Bindings
  Variables: Variables
}
