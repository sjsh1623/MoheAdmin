import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import BatchMonitor from './pages/BatchMonitor'
import DockerLogs from './pages/DockerLogs'
import Places from './pages/Places'

function App() {
  return (
    <Routes>
      <Route path="/monitor" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="batch" element={<BatchMonitor />} />
        <Route path="logs" element={<DockerLogs />} />
        <Route path="places" element={<Places />} />
      </Route>
      <Route path="/" element={<Navigate to="/monitor" replace />} />
      <Route path="*" element={<Navigate to="/monitor" replace />} />
    </Routes>
  )
}

export default App
