import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import { AccountProvider } from './contexts/AccountContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AccountProvider>
            <AppRoutes />
            <Toaster position="top-right" />
          </AccountProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;