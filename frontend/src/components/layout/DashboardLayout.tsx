import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { motion } from 'framer-motion';
import { BeamsBackground } from '../ui/beams-background';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isDark } = useTheme();

  return (
    <div className={cn(
      "relative min-h-screen",
      isDark ? "text-white" : "text-slate-800"
    )}>
      <div className="absolute inset-0 pointer-events-none">
        <BeamsBackground theme={isDark ? 'dark' : 'light'} />
      </div>
      <div className="relative z-10 min-h-screen pointer-events-auto">
        <div className="flex">
          <Sidebar />
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <div className='p-6' style={{ overflow: 'auto', maxHeight: '100dvh' }}>
              {children}
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}