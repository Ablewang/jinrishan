export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  ENV?: string
}

export type Variables = {
  userId: number
}

export type AppContext = {
  Bindings: Bindings
  Variables: Variables
}
