import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'
import ProgressPage from './pages/ProgressPage'
import AchievementsPage from './pages/AchievementsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/poem/:id" element={<PoemDetail />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
    </Routes>
  )
}
