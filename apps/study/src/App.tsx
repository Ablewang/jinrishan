import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/poem/:id" element={<PoemDetail />} />
    </Routes>
  )
}
