import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { GradientButton } from '../components/ui/gradient-button';
import { GlareCard } from '../components/ui/glare-card';
import { FloatingAssistant } from '../components/ui/floating-assistant';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedTestimonials } from '../components/ui/animated-testimonials';
import { AnimatedImageSlider } from '../components/ui/animated-image-slider';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const emailProviders = [t('landing.emailProviders.gmail'), t('landing.emailProviders.outlook'), t('landing.emailProviders.schoolMail')];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEmailIndex((prev) => (prev + 1) % emailProviders.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="relative min-h-screen">
      <BeamsBackground intensity="strong" theme={isDark ? "dark" : "light"} className="fixed inset-0" />
      <div className="relative z-10">
        <FloatingAssistant />

        {/* Header/Navbar */}
        <header className={cn(
          "fixed w-full z-50 backdrop-blur-lg",
          isDark ? "bg-neutral-950/50" : "bg-slate-900/40"
        )}>
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={scrollToTop}
            >
              <svg className={cn("h-8 w-8 mr-2", isDark ? "text-blue-500" : "text-blue-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-800")}>{t('sidebar.appName')}</span>
            </div>

            <nav className="hidden md:block">
              <ul className="flex space-x-8">
                <li>
                  <button 
                    onClick={() => scrollToSection('features')} 
                    className={cn("transition-colors cursor-pointer", isDark ? "text-white hover:text-blue-400" : "text-slate-800 hover:text-blue-600")}
                  >
                    {t('landing.nav.features')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('howItWorks')} 
                    className={cn("transition-colors cursor-pointer", isDark ? "text-white hover:text-blue-400" : "text-slate-800 hover:text-blue-600")}
                  >
                    {t('landing.nav.howItWorks')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('providers')} 
                    className={cn("transition-colors cursor-pointer", isDark ? "text-white hover:text-blue-400" : "text-slate-800 hover:text-blue-600")}
                  >
                    {t('landing.nav.providers')}
                  </button>
                </li>
              </ul>
            </nav>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-200"
                  )}
                  aria-label={t('common.toggleTheme')}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 text-gray-300" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                
                <div className="relative">
                  <select 
                    value={i18n.language} 
                    onChange={(e) => changeLanguage(e.target.value)}
                    className={cn(
                      "appearance-none rounded-lg pl-8 pr-10 py-2 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    )}
                  >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                  </select>
                  <Globe className={cn(
                    "h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2",
                    isDark ? "text-gray-300" : "text-gray-600"
                  )} />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className={cn("h-4 w-4", isDark ? "text-gray-300" : "text-gray-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <Link to="/login">
                <GradientButton variant="outline">
                  {t('login')}
                </GradientButton>
              </Link>
              <Link to="/register">
                <GradientButton>
                  {t('register')}
                </GradientButton>
              </Link>
            </div>
          </div>
        </header>

        <div className="min-h-screen">
          {/* Hero Section */}
          <section className="pt-32 pb-20">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-10 mb-10 md:mb-0">
                <div className="max-w-xl">
                  <h1 className={cn(
                    "text-5xl md:text-6xl font-bold leading-tight mb-6",
                    isDark ? "text-white" : "text-slate-800"
                  )}>
                    {t('landing.hero.title')}
                  </h1>
                  <p className={cn(
                    "text-xl mb-8",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    {t('landing.hero.description', { provider: emailProviders[currentEmailIndex] })}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/register">
                      <GradientButton size="lg" className="w-full sm:w-auto">
                        {t('landing.hero.startButton')}
                      </GradientButton>
                    </Link>
                    <GradientButton 
                      variant="outline" 
                      size="lg" 
                      className="w-full sm:w-auto"
                      onClick={() => scrollToSection('howItWorks')}
                    >
                      {t('landing.hero.howItWorksButton')}
                    </GradientButton>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 relative">
                <div className={cn(
                  "relative z-10 rounded-lg p-2 shadow-xl",
                  isDark ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10" : "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-slate-200"
                )}>
                  <img
                    src="/dashboard-preview.jpg"
                    alt={t('landing.hero.imageAlt')}
                    className="rounded shadow-2xl"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none"%3E%3Crect width="800" height="500" fill="%23111827"/%3E%3Ctext x="400" y="250" font-family="sans-serif" font-size="30" text-anchor="middle" fill="%23FFFFFF"%3EE-posta Yönetim Arayüzü%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="absolute -right-4 -bottom-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-4 shadow-lg transform rotate-3 z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <img src="/gmail-icon.png" alt="Gmail" className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-white font-bold">Gmail</div>
                      <div className="text-white/70 text-sm">{t('landing.hero.connected')}</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-6 -top-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg p-4 shadow-lg transform -rotate-6 z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <img src="/outlook-icon.png" alt="Outlook" className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-white font-bold">Outlook</div>
                      <div className="text-white/70 text-sm">{t('landing.hero.connected')}</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/30 rounded-full filter blur-3xl"></div>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/30 rounded-full filter blur-3xl"></div>
              </div>
            </div>
          </section>

          {/* Trusted By Section */}
          <section className="py-10 mb-20">
            <div className="text-center mb-10">
              <div className={cn(
                "text-sm font-semibold mb-2",
                isDark ? "text-blue-400" : "text-blue-600"
              )}>{t('landing.trustedBy.subtitle')}</div>
              <h2 className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-slate-800"
              )}>{t('landing.trustedBy.title')}</h2>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16">
              <motion.div
                className={cn(
                  "w-24 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center",
                  isDark ? "bg-white/5" : "bg-slate-200/30"
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <img src="/google-logo.png" alt="Google" className="h-6" />
              </motion.div>
              <motion.div
                className={cn(
                  "w-24 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center",
                  isDark ? "bg-white/5" : "bg-slate-200/30"
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <img src="/microsoft-logo.png" alt="Microsoft" className="h-6" />
              </motion.div>
              <motion.div
                className={cn(
                  "w-24 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center",
                  isDark ? "bg-white/5" : "bg-slate-200/30"
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className={cn(
                  "ml-2 font-bold",
                  isDark ? "text-white" : "text-slate-800"
                )}>EDU</span>
              </motion.div>
              <motion.div
                className={cn(
                  "w-24 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center",
                  isDark ? "bg-white/5" : "bg-slate-200/30"
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className={cn(
                  "ml-2 font-bold",
                  isDark ? "text-white" : "text-slate-800"
                )}>PRO</span>
              </motion.div>
              <motion.div
                className={cn(
                  "w-24 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center",
                  isDark ? "bg-white/5" : "bg-slate-200/30"
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className={cn(
                  "ml-2 font-bold",
                  isDark ? "text-white" : "text-slate-800"
                )}>SEC</span>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-10">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className={cn(
                  "backdrop-blur-sm rounded-lg p-6 border",
                  isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                )}>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )}>10K+</div>
                  <div className={cn(
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.stats.activeUsers')}</div>
                </div>
                <div className={cn(
                  "backdrop-blur-sm rounded-lg p-6 border",
                  isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                )}>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )}>5M+</div>
                  <div className={cn(
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.stats.emailsManaged')}</div>
                </div>
                <div className={cn(
                  "backdrop-blur-sm rounded-lg p-6 border",
                  isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                )}>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )}>99.9%</div>
                  <div className={cn(
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.stats.uptime')}</div>
                </div>
                <div className={cn(
                  "backdrop-blur-sm rounded-lg p-6 border",
                  isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                )}>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )}>3</div>
                  <div className={cn(
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.stats.supportedServices')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className={cn(
                  "text-3xl font-bold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('landing.features.title')}</h2>
                <p className={cn(
                  "text-xl max-w-2xl mx-auto",
                  isDark ? "text-neutral-300" : "text-slate-600"
                )}>
                  {t('landing.features.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <GlareCard className={cn(
                  "flex flex-col p-8 h-full",
                  !isDark && "border border-slate-200/60 bg-white/80"
                )}>
                  <div className={cn(
                    "mb-6 w-14 h-14 flex items-center justify-center rounded-full",
                    isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                  )}>
                    <svg className={cn(
                      "h-8 w-8",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className={cn(
                    "text-xl font-bold mb-4",
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.features.unified.title')}</h3>
                  <p className={cn(
                    "mb-6",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    {t('landing.features.unified.description')}
                  </p>
                  <ul className={cn(
                    "space-y-2 mt-auto",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.unified.feature1')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.unified.feature2')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.unified.feature3')}
                    </li>
                  </ul>
                </GlareCard>

                <GlareCard className={cn(
                  "flex flex-col p-8 h-full",
                  !isDark && "border border-slate-200/60 bg-white/80"
                )}>
                  <div className={cn(
                    "mb-6 w-14 h-14 flex items-center justify-center rounded-full",
                    isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                  )}>
                    <svg className={cn(
                      "h-8 w-8",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className={cn(
                    "text-xl font-bold mb-4",
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.features.secure.title')}</h3>
                  <p className={cn(
                    "mb-6",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    {t('landing.features.secure.description')}
                  </p>
                  <ul className={cn(
                    "space-y-2 mt-auto",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.secure.feature1')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.secure.feature2')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.secure.feature3')}
                    </li>
                  </ul>
                </GlareCard>

                <GlareCard className={cn(
                  "flex flex-col p-8 h-full",
                  !isDark && "border border-slate-200/60 bg-white/80"
                )}>
                  <div className={cn(
                    "mb-6 w-14 h-14 flex items-center justify-center rounded-full",
                    isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                  )}>
                    <svg className={cn(
                      "h-8 w-8",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className={cn(
                    "text-xl font-bold mb-4",
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('landing.features.smart.title')}</h3>
                  <p className={cn(
                    "mb-6",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    {t('landing.features.smart.description')}
                  </p>
                  <ul className={cn(
                    "space-y-2 mt-auto",
                    isDark ? "text-neutral-300" : "text-slate-600"
                  )}>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.smart.feature1')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.smart.feature2')}
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('landing.features.smart.feature3')}
                    </li>
                  </ul>
                </GlareCard>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="howItWorks" className="py-20 relative overflow-hidden">
            <div className={cn(
              isDark ? "bg-gradient-to-b from-blue-900/10 to-transparent" : "bg-gradient-to-b from-blue-500/5 to-transparent"
            )}></div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className={cn(
                  "text-3xl font-bold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('landing.howItWorks.title')}</h2>
                <p className={cn(
                  "text-xl max-w-2xl mx-auto",
                  isDark ? "text-neutral-300" : "text-slate-600"
                )}>
                  {t('landing.howItWorks.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="relative">
                  <div className={cn(
                    "backdrop-blur-sm rounded-lg p-6 border relative z-10",
                    isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                  )}>
                    <div className="absolute -top-6 -left-6 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">1</div>
                    <h3 className={cn(
                      "text-xl font-bold mb-4 mt-6",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.howItWorks.step1.title')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.howItWorks.step1.description')}
                    </p>
                  </div>
                  <motion.div
                    className="absolute top-1/2 left-[100%] text-blue-500 transform -translate-y-1/2 rotate-0 hidden md:flex z-20 items-center"
                  >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </motion.div>
                </div>

                <div className="relative">
                  <div className={cn(
                    "backdrop-blur-sm rounded-lg p-6 border relative z-10",
                    isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                  )}>
                    <div className="absolute -top-6 -left-6 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">2</div>
                    <h3 className={cn(
                      "text-xl font-bold mb-4 mt-6",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.howItWorks.step2.title')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.howItWorks.step2.description')}
                    </p>
                  </div>
                  <motion.div
                    className="absolute top-1/2 left-[100%] text-blue-500 transform -translate-y-1/2 rotate-0 hidden md:flex z-20 items-center"
                  >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </motion.div>
                </div>

                <div className="relative">
                  <div className={cn(
                    "backdrop-blur-sm rounded-lg p-6 border relative z-10",
                    isDark ? "bg-white/5 border-white/10" : "bg-white/40 border-slate-200/60"
                  )}>
                    <div className="absolute -top-6 -left-6 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">3</div>
                    <h3 className={cn(
                      "text-xl font-bold mb-4 mt-6",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.howItWorks.step3.title')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.howItWorks.step3.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className={cn(
                  "text-3xl font-bold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('landing.testimonials.title')}</h2>
                <p className={cn(
                  "text-xl max-w-2xl mx-auto mb-8",
                  isDark ? "text-neutral-300" : "text-slate-600"
                )}>
                  {t('landing.testimonials.subtitle')}
                </p>
              </div>

              <AnimatedTestimonials
                testimonials={[
                  {
                    quote: t('landing.testimonials.quotes.1.text'),
                    name: t('landing.testimonials.quotes.1.name'),
                    designation: t('landing.testimonials.quotes.1.role'),
                    src: "" // Varsayılan avatar kullanılabilir
                  },
                  {
                    quote: t('landing.testimonials.quotes.2.text'),
                    name: t('landing.testimonials.quotes.2.name'),
                    designation: t('landing.testimonials.quotes.2.role'),
                    src: "/testimonial-avatar-2.jpg"
                  },
                  {
                    quote: t('landing.testimonials.quotes.3.text'),
                    name: t('landing.testimonials.quotes.3.name'),
                    designation: t('landing.testimonials.quotes.3.role'),
                    src: ""
                  },
                  {
                    quote: t('landing.testimonials.quotes.4.text'),
                    name: t('landing.testimonials.quotes.4.name'),
                    designation: t('landing.testimonials.quotes.4.role'),
                    src: ""
                  },
                  {
                    quote: t('landing.testimonials.quotes.5.text'),
                    name: t('landing.testimonials.quotes.5.name'),
                    designation: t('landing.testimonials.quotes.5.role'),
                    src: ""
                  },
                  {
                    quote: t('landing.testimonials.quotes.6.text'),
                    name: t('landing.testimonials.quotes.6.name'),
                    designation: t('landing.testimonials.quotes.6.role'),
                    src: ""
                  }
                ]}
                isDark={isDark}
              />
            </div>
          </section>

          {/* Providers Section */}
          <section id="providers" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className={cn(
                  "text-3xl font-bold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('landing.providers.title')}</h2>
                <p className={cn(
                  "text-xl max-w-2xl mx-auto",
                  isDark ? "text-neutral-300" : "text-slate-600"
                )}>
                  {t('landing.providers.subtitle')}
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2">
                  <AnimatedImageSlider
                    images={[
                      {
                        src: "/1.png",
                        alt: t('landing.providers.slider.1')
                      },
                      {
                        src: "/2.png",
                        alt: t('landing.providers.slider.2')
                      },
                      {
                        src: "/3.png",
                        alt: t('landing.providers.slider.3')
                      },
                      {
                        src: "/4.png",
                        alt: t('landing.providers.slider.4')
                      },
                      {
                        src: "/5.png",
                        alt: t('landing.providers.slider.5')
                      }
                    ]}
                    autoplay={false}
                    className="p-0 m-0"
                    isDark={isDark}
                  />
                </div>

                <div className="w-full md:w-1/2">
                  <div className="flex justify-center flex-wrap gap-6">
                    <div className={cn(
                      "text-center p-6 backdrop-blur-sm rounded-lg border w-48",
                      isDark ? "bg-white/5 border-white/10" : "bg-white/60 border-slate-200/60"
                    )}>
                      <img src="/gmail-icon.png" alt="Gmail" className="h-16 mx-auto mb-4" />
                      <h3 className={cn(
                        "font-bold",
                        isDark ? "text-white" : "text-slate-800"
                      )}>Gmail</h3>
                    </div>
                    <div className={cn(
                      "text-center p-6 backdrop-blur-sm rounded-lg border w-48",
                      isDark ? "bg-white/5 border-white/10" : "bg-white/60 border-slate-200/60"
                    )}>
                      <img src="/outlook-icon.png" alt="Outlook" className="h-16 mx-auto mb-4" />
                      <h3 className={cn(
                        "font-bold",
                        isDark ? "text-white" : "text-slate-800"
                      )}>Outlook</h3>
                    </div>
                    <div className={cn(
                      "text-center p-6 backdrop-blur-sm rounded-lg border w-48",
                      isDark ? "bg-white/5 border-white/10" : "bg-white/60 border-slate-200/60"
                    )}>
                     <img src="/hotmail-icon.png" alt="Outlook" className="h-16 mx-auto mb-4" />
                     <h3 className={cn(
                        "font-bold",
                        isDark ? "text-white" : "text-slate-800"
                      )}>Hotmail</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className={cn(
                  "text-3xl font-bold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('landing.faq.title')}</h2>
                <p className={cn(
                  "text-xl max-w-2xl mx-auto",
                  isDark ? "text-neutral-300" : "text-slate-600"
                )}>
                  {t('landing.faq.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>1</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q1.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q1.answer')}
                    </p>
                  </GlareCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>2</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q2.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q2.answer')}
                    </p>
                  </GlareCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>3</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q3.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q3.answer')}
                    </p>
                  </GlareCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>4</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q4.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q4.answer')}
                    </p>
                  </GlareCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>5</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q5.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q5.answer')}
                    </p>
                  </GlareCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.03
                  }}
                >
                  <GlareCard className={cn(
                    "flex flex-col p-8 h-full",
                    !isDark && "border border-slate-200/60 bg-white/80"
                  )}>
                    <div className={cn(
                      "mb-4 w-12 h-12 flex items-center justify-center rounded-full",
                      isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                      <span className={cn(
                        "text-xl font-bold",
                        isDark ? "text-blue-400" : "text-blue-600"
                      )}>6</span>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-slate-800"
                    )}>{t('landing.faq.q6.question')}</h3>
                    <p className={cn(
                      isDark ? "text-neutral-300" : "text-slate-600"
                    )}>
                      {t('landing.faq.q6.answer')}
                    </p>
                  </GlareCard>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={cn(
            "border-t py-16",
            isDark ? "border-white/10" : "border-slate-200"
          )}>
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                <div>
                  <div className="flex items-center mb-6">
                    <svg className={cn("h-8 w-8 mr-2", isDark ? "text-blue-500" : "text-blue-600")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-800")}>{t('sidebar.appName')}</span>
                  </div>
                  <p className={cn(
                    "mb-6",
                    isDark ? "text-neutral-400" : "text-slate-500"
                  )}>
                    {t('landing.footer.description')}
                  </p>
                  <div className="flex space-x-4">
                    <a href="#" className={cn(
                      "hover:text-blue-500 transition-colors",
                      isDark ? "text-neutral-400" : "text-slate-500"
                    )}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                      </svg>
                    </a>
                    <a href="#" className={cn(
                      "hover:text-blue-500 transition-colors",
                      isDark ? "text-neutral-400" : "text-slate-500"
                    )}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                      </svg>
                    </a>
                    <a href="#" className={cn(
                      "hover:text-blue-500 transition-colors",
                      isDark ? "text-neutral-400" : "text-slate-500"
                    )}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                      </svg>
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-800")}>{t('landing.footer.product.title')}</h3>
                  <ul className="space-y-3">
                    <li><a href="#features" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.product.features')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.product.plans')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.product.security')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.product.partners')}</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-800")}>{t('landing.footer.support.title')}</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.support.helpCenter')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.support.documentation')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.support.statusPage')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.support.contactUs')}</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-800")}>{t('landing.footer.company.title')}</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.company.about')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.company.blog')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.company.careers')}</a></li>
                    <li><a href="#" className={cn("hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.company.press')}</a></li>
                  </ul>
                </div>
              </div>

              <div className={cn(
                "border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center",
                isDark ? "border-white/10" : "border-slate-200"
              )}>
                <p className={cn(
                  "mb-4 md:mb-0",
                  isDark ? "text-neutral-400" : "text-slate-500"
                )}>
                  {t('landing.footer.copyright', { year: new Date().getFullYear() })}
                </p>
                <div className="flex space-x-6">
                  <a href="#" className={cn("text-sm hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.legal.privacy')}</a>
                  <a href="#" className={cn("text-sm hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.legal.terms')}</a>
                  <a href="#" className={cn("text-sm hover:text-blue-500 transition-colors", isDark ? "text-neutral-400" : "text-slate-500")}>{t('landing.footer.legal.cookies')}</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}