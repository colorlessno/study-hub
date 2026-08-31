import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import System01Page from './pages/System01Page'
import System02Page from './pages/System02Page'
import System03Page from './pages/System03Page'
import System04Page from './pages/System04Page'
import System05Page from './pages/System05Page'
import System06Page from './pages/System06Page'
import System07Page from './pages/System07Page'
import System08Page from './pages/System08Page'
import System09Page from './pages/System09Page'
import System10Page from './pages/System10Page'
import System11Page from './pages/System11Page'
import System12Page from './pages/System12Page'
import System13Page from './pages/System13Page'
import System14Page from './pages/System14Page'
import System16Page from './pages/System16Page'
import EnterpriseAiSystemPage from './pages/EnterpriseAiSystemPage'
import SystemLearningPage from './pages/SystemLearningPage'

const LEARNING_SYSTEMS = Array.from({ length: 20 }, (_, index) => {
  const no = index + 17
  return `system${no.toString().padStart(2, '0')}`
})

const ENTERPRISE_AI_SYSTEMS = Array.from({ length: 8 }, (_, index) => {
  const no = index + 37
  return `system${no.toString().padStart(2, '0')}`
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'system01', element: <System01Page /> },
      { path: 'system02', element: <System02Page /> },
      { path: 'system03', element: <System03Page /> },
      { path: 'system04', element: <System04Page /> },
      { path: 'system05', element: <System05Page /> },
      { path: 'system06', element: <System06Page /> },
      { path: 'system07', element: <System07Page /> },
      { path: 'system08', element: <System08Page /> },
      { path: 'system09', element: <System09Page /> },
      { path: 'system10', element: <System10Page /> },
      { path: 'system11', element: <System11Page /> },
      { path: 'system12', element: <System12Page /> },
      { path: 'system13', element: <System13Page /> },
      { path: 'system14', element: <System14Page /> },
      { path: 'system16', element: <System16Page /> },
      ...LEARNING_SYSTEMS.map((systemId) => ({
        path: systemId,
        element: <SystemLearningPage systemId={systemId} />,
      })),
      ...ENTERPRISE_AI_SYSTEMS.map((systemId) => ({
        path: systemId,
        element: <EnterpriseAiSystemPage systemId={systemId} />,
      })),
      { path: '*', element: <NotFound /> },
    ],
  },
])
