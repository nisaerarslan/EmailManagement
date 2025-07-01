import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Send, Trash, Plus, Home, Settings, LogOut, User, KeySquare } from 'lucide-react';
import { Sidebar as SidebarContainer, SidebarBody, SidebarLink } from '../ui/sidebar';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { authService } from '../../services/authService';

// User profile interface
interface UserData {
  user_id: number;
  username: string;
  email: string;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Kullanıcı verilerini yükle ve profil resmini önceden hazırla
  useEffect(() => {
    const fetchUserData = async () => {
      const user = authService.getUser();
      if (user) {
        setUserData(user);
        
        // Profil resmi yoksa, proaktif olarak yükle
        if (!localStorage.getItem('profileImage')) {
          await authService.fetchProfileImage();
        }
        
        setProfileLoaded(true);
      }
    };
    
    fetchUserData();
    
    // localStorage'da değişiklikleri izle
    const handleStorageChange = () => {
      const user = authService.getUser();
      if (user) {
        setUserData(user);
      } else {
        setUserData(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const mainMenuItems = [
    { 
      icon: <Home className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.home'),
      path: '/dashboard'
    },
    {
      icon: <Inbox className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.inbox'),
      path: '/dashboard/inbox'
    },
    {
      icon: <Send className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.sent'),
      path: '/dashboard/sent'
    },
    {
      icon: <Trash className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.trash'),
      path: '/dashboard/deleted'
    },
    {
      icon: <KeySquare className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.passwordManager'),
      path: '/dashboard/password-manager'
    },
    {
      icon: <Plus className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.addAccount'),
      path: '/dashboard/add-account'
    },
  ];

  const bottomMenuItems = [
    {
      icon: <User className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.profile'),
      path: '/dashboard/profile'
    },
    {
      icon: <Settings className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.settings'),
      path: '/dashboard/settings'
    },
    {
      icon: <LogOut className="text-current h-5 w-5 flex-shrink-0" />,
      label: t('sidebar.logout'),
      path: '#',
      onClick: handleLogout
    },
  ];

  return (
    <div className="flex h-screen">
      <SidebarContainer open={open} setOpen={setOpen}>
        <SidebarBody className="h-screen flex flex-col justify-between">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            
            {/* User Profile Section */}
            <div className="mt-6 mb-4 px-3">
              <UserProfile userData={userData} open={open} />
            </div>
            
            <div className="mt-4 flex flex-col gap-2">
              {mainMenuItems.map((item) => (
                <SidebarLink
                  key={item.path}
                  link={item}
                  location={location}
                />
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-white/10 dark:border-white/10">
              {bottomMenuItems.map((item) => (
                <SidebarLink
                  key={item.path}
                  link={item}
                  location={location}
                />
              ))}
            </div>
          </div>
        </SidebarBody>
      </SidebarContainer>
    </div>
  );
}

// User Profile Component
const UserProfile = ({ userData, open }: { userData: UserData | null, open: boolean }) => {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Profil resmini yükle ve güncellemeleri izle
  useEffect(() => {
    if (userData) {
      const imgSrc = authService.getProfileImage();
      setProfileImage(imgSrc);
      
      // localStorage değişikliklerini izle
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'profileImage') {
          setProfileImage(authService.getProfileImage());
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [userData]);

  const handleClick = () => {
    navigate('/dashboard/profile');
  };

  if (!userData) return null;

  return (
    <div 
      className={cn(
        "flex items-center cursor-pointer rounded-md transition-colors",
        open ? "gap-3 hover:bg-white/10 p-2" : "justify-center hover:bg-white/10 p-2"
      )}
      onClick={handleClick}
    >
      <div className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 bg-white/20",
        open ? "h-10 w-10" : "h-10 w-10"
      )}>
        {profileImage ? (
          <img 
            src={profileImage} 
            alt="Profile" 
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white text-sm font-medium">
            {userData.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      {open && (
        <motion.div
          animate={{
            opacity: 1
          }}
          initial={{ opacity: 0 }}
          className="flex flex-col"
        >
          <span className="text-sm font-medium truncate max-w-[150px]">
            {userData.username}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export const Logo = () => {
  const { t } = useTranslation();
  return (
    <div className="font-normal flex items-center gap-3 text-sm text-current py-3 px-1 relative z-20">
      <div className="relative flex-shrink-0 w-7 h-7">
        {/* Envelope logo animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-5 border-2 border-current rounded-md relative overflow-hidden flex items-center justify-center">
            {/* Envelope flap (animated) */}
            <motion.div 
              initial={{ rotateX: 0 }}
              animate={{ rotateX: [0, -180, -180, 0] }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5
              }}
              style={{ transformOrigin: "top" }}
              className="w-[calc(100%-2px)] h-[calc(100%-2px)] absolute top-0 left-[1px] right-[1px] bg-transparent"
            >
              <div className="w-full h-full border-b-[10px] border-current border-solid border-b-current border-l-transparent border-l-[10px] border-r-transparent border-r-[10px] border-t-0" />
            </motion.div>
            
            {/* Message line animation */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                y: [5, 0, 0, -5]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 5.5
              }}
              className="w-3 h-[2px] bg-current rounded-full absolute"
            />
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col"
      >
        <motion.span className="font-medium text-base text-current whitespace-pre leading-tight">
          {t('sidebar.appName')}
        </motion.span>
      </motion.div>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="font-normal flex justify-center items-center text-sm text-current py-3 relative z-20">
      <div className="relative flex-shrink-0 w-7 h-7">
        {/* Envelope logo for small view */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-5 border-2 border-current rounded-md relative overflow-hidden flex items-center justify-center">
            {/* Envelope top fold */}
            <div className="w-[calc(100%-2px)] h-[calc(100%-2px)] absolute top-0 left-[1px] right-[1px] bg-transparent">
              <div className="w-full h-full border-b-[10px] border-current border-solid border-b-current border-l-transparent border-l-[10px] border-r-transparent border-r-[10px] border-t-0" />
            </div>
            
            {/* Message line */}
            <div className="w-3 h-[2px] bg-current rounded-full absolute" />
          </div>
        </div>
      </div>
    </div>
  );
};