import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'
import ProgressPage from './pages/ProgressPage'
import AchievementsPage from './pages/AchievementsPage'
import QueueScreen from './pages/QueueScreen'
import PoemsScreen from './pages/PoemsScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/poem/:id" element={<PoemDetail />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/queue" element={<QueueScreen />} />
      <Route path="/poems" element={<PoemsScreen />} />
    </Routes>
  )
}
