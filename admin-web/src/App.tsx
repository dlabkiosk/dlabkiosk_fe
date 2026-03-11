import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import StudentManagement from './pages/StudentManagement';
import StudentDetail from './pages/StudentDetail';
import LoginPage from './pages/LoginPage';

function ProtectedRoute() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/students/:studentId" element={<StudentDetail />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
