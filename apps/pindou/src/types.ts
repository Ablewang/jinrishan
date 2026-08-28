export interface Material {
  code: string
  name: string
  rgb: [number, number, number]
  count: number
  pct: number
}

export interface PindouData {
  name: string
  grid_size: number
  board_size: number
  total_beads: number
  color_count: number
  grid: (string | null)[][]
  materials: Material[]
}

export interface Item {
  name: string
  category: string
}
