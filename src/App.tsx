import { HashRouter, Route, Routes } from 'react-router-dom'
import { LecteurProvider } from './context/LecteurContext'
import ListePage from './pages/ListePage'
import AdminPage from './pages/AdminPage'
import Lecteur from './components/Lecteur'
import ConfigBanner from './components/ConfigBanner'

export default function App() {
  return (
    <HashRouter>
      <LecteurProvider>
        <div className="app">
          <ConfigBanner />
          <Routes>
            <Route path="/" element={<ListePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          <Lecteur />
        </div>
      </LecteurProvider>
    </HashRouter>
  )
}
