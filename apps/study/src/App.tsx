import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'
import ProgressPage from './pages/ProgressPage'
import AchievementsPage from './pages/AchievementsPage'
import QueueScreen from './pages/QueueScreen'
import PoemsScreen from './pages/PoemsScreen'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/poems" element={<PoemsScreen />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Route>
      <Route path="/poem/:id" element={<PoemDetail />} />
      <Route path="/queue" element={<QueueScreen />} />
    </Routes>
  )
}
