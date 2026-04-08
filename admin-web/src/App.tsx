import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import AttendanceManagement from './pages/AttendanceManagement';
import NoticeManagement from './pages/NoticeManagement';
import NoticeCreate from './pages/NoticeCreate';
import NoticeDetail from './pages/NoticeDetail';
import StudyTimeManagement from './pages/StudyTimeManagement';
import MealManagement from './pages/MealManagement';
import PhoneManagement from './pages/PhoneManagement';
import SeatLeaveManagement from './pages/SeatLeaveManagement';
import SeatManagement from './pages/SeatManagement';
import SettingsPage from './pages/SettingsPage';
import BranchDetailPage from './pages/BranchDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/study-time" element={<StudyTimeManagement />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/meals" element={<MealManagement />} />
            <Route path="/phones" element={<PhoneManagement />} />
            <Route path="/seat-leaves" element={<SeatLeaveManagement />} />
            <Route path="/seats" element={<SeatManagement />} />
            <Route path="/notices" element={<NoticeManagement />} />
            <Route path="/notices/new" element={<NoticeCreate />} />
            <Route path="/notices/:noticeId" element={<NoticeDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/branch/:storeId" element={<BranchDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
