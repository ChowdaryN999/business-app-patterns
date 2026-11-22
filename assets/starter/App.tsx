import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { DdatQueue } from './screens/DdatQueue'
import { Home } from './screens/Home'
import { NewRequest } from './screens/NewRequest'
import { RequestPage } from './screens/RequestPage'
import { Requests } from './screens/Requests'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="new" element={<NewRequest />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:id" element={<RequestPage />} />
        <Route path="requests/:id/:tab" element={<RequestPage />} />
        <Route path="ddat" element={<DdatQueue />} />
        <Route path="ddat/:id" element={<DdatQueue />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
