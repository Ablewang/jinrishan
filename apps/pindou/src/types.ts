export interface Material {
  code: string
  name: string
  rgb: [number, number, number]
  count: number
  pct: number
}

export interface ManifestItem {
  name: string
  display_name: string
  total_beads: number
  color_count: number
  has_gallery: boolean
}

export interface ManifestCategory {
  count: number
  items: ManifestItem[]
}

export interface Manifest {
  categories: Record<string, ManifestCategory>
}

export interface SummaryCategory {
  total_beads: number
  color_count: number
  materials: Material[]
}

export interface Summary {
  categories: Record<string, SummaryCategory>
}

export interface ItemDetail {
  name: string
  display_name: string
  grid_size: number
  board_size: number
  total_beads: number
  color_count: number
  grid: (string | null)[][]
  materials: Material[]
}

export type RouteHash =
  | '#/'
  | `#/category/${string}`
  | `#/item/${string}/${string}`
  | '#/summary'
