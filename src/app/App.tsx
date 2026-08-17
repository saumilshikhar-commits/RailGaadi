import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '../components/ui/Header';
import { Home } from '../pages/Home/Home';
import { Journey } from '../pages/Journey/Journey';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Page not found</h1>
      <p style={{ color: '#525252' }}>The page you're looking for doesn't exist.</p>
      <a href="/" style={{ color: '#1a56db', fontWeight: 500 }}>← Back to RailGaadi</a>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <a href="#main-content" className="sr-only" style={{ position: 'absolute', top: 8, left: 8, zIndex: 9999, background: 'white', padding: '8px 16px', borderRadius: 8, border: '2px solid #1a56db', color: '#1a56db', fontWeight: 600, transform: 'translateY(-100px)', transition: 'transform 0.1s' }} onFocus={e => (e.currentTarget.style.transform = 'translateY(0)')} onBlur={e => (e.currentTarget.style.transform = 'translateY(-100px)')}>
          Skip to main content
        </a>

        <Header />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live/:trainId" element={<Journey />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
