import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Home, User, Briefcase, FileText } from 'lucide-react';
import { cn } from "../../lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
  translationKey: string;
}

interface NavBarProps {
  items?: NavItem[];
  className?: string;
}

const defaultNavItems: NavItem[] = [
  { name: 'Home', url: '#', icon: Home, translationKey: 'navbar.home' },
  { name: 'About', url: '#', icon: User, translationKey: 'navbar.about' },
  { name: 'Contact', url: '#', icon: Briefcase, translationKey: 'navbar.contact' },
  { name: 'Feature', url: '#', icon: FileText, translationKey: 'navbar.feature' },
  { name: 'Hero', url: '#', icon: FileText, translationKey: 'navbar.hero' },
  { name: 'Footer', url: '#', icon: FileText, translationKey: 'navbar.footer' }
];

export function NavBar({ items = defaultNavItems, className }: NavBarProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(items[0].name);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6",
        className
      )}
    >
      <div className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <Link
              key={item.name}
              to={item.url}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-neutral-400 hover:text-white",
                isActive && "bg-neutral-800/50 text-white"
              )}
            >
              <span className="hidden md:inline">{t(item.translationKey)}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-white/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-blue-500/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-blue-500/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-blue-500/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
} 