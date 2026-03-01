import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ConnectSite from './pages/ConnectSite';
import Conversations from './pages/Conversations';
import ChatPreview from './pages/ChatPreview';
import Monitoring from './pages/Monitoring';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/connect" element={<ConnectSite />} />
                      <Route path="/conversations/:siteId" element={<Conversations />} />
                      <Route path="/sites/:id/preview" element={<ChatPreview />} />
                      <Route path="/sites/:id/monitor" element={<Monitoring />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
