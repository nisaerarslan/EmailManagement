import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useAnimate, useSpring } from 'framer-motion';

export const FloatingAssistant = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scope, animate] = useAnimate();
  const [isOpen, setIsOpen] = useState(false);
  const [helpPopup, setHelpPopup] = useState<string | null>(null);
  
  // Yüzme animasyonu için spring
  const floatY = useSpring(0, {
    stiffness: 100,
    damping: 10,
    mass: 1,
  });

  useEffect(() => {
    // Sürekli yüzme animasyonu
    let timeout: NodeJS.Timeout;
    const startFloating = () => {
      const random = Math.random() * 10 - 5;
      floatY.set(random);
      timeout = setTimeout(startFloating, 2000);
    };
    startFloating();
    return () => clearTimeout(timeout);
  }, [floatY]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Fare ile merkez arasındaki açıyı hesapla
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const distance = Math.min(20, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 15);

      // Göz hareketleri
      const eyeX = Math.cos(angle) * (distance / 3);
      const eyeY = Math.sin(angle) * (distance / 3);

      animate(
        ".eye",
        { x: eyeX, y: eyeY },
        { type: "spring", bounce: 0.2, duration: 0.3 }
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [animate]);

  const handleQuestionClick = (questionKey: string) => {
    setHelpPopup(questionKey);
    setTimeout(() => setHelpPopup(null), 5000); // 5 saniye sonra otomatik kapan
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Yardım Popup'ı */}
      <AnimatePresence>
        {helpPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-4 w-80 rounded-xl bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-sm p-4 shadow-xl border border-white/10"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-medium text-sm">
                {t(`assistant.questions.${helpPopup}`)}
              </h3>
              <button
                onClick={() => setHelpPopup(null)}
                className="text-white/70 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="text-white/90 text-xs leading-relaxed whitespace-pre-line">
              {t(`assistant.help.${helpPopup}`)}
            </div>
            {/* Popup ok işareti */}
            <div className="absolute bottom-0 right-8 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gradient-to-br from-blue-600 to-purple-600 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana Assistant Popup'ı */}
      <AnimatePresence>
        {isOpen && !helpPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-4 w-72 rounded-xl bg-neutral-800/80 backdrop-blur-sm p-4 shadow-xl"
          >
            <div className="flex flex-col space-y-4">
              <p className="text-white">{t('assistant.greeting')}</p>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => handleQuestionClick('addEmail')}
                  className="text-left text-sm text-neutral-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 group"
                >
                  <span className="group-hover:text-blue-300">
                    {t('assistant.questions.addEmail')}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500 group-hover:text-blue-400">
                    👆 Tıklayın
                  </span>
                </button>
                <button 
                  onClick={() => handleQuestionClick('manageInbox')}
                  className="text-left text-sm text-neutral-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 group"
                >
                  <span className="group-hover:text-blue-300">
                    {t('assistant.questions.manageInbox')}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500 group-hover:text-blue-400">
                    👆 Tıklayın
                  </span>
                </button>
                <button 
                  onClick={() => handleQuestionClick('securitySettings')}
                  className="text-left text-sm text-neutral-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 group"
                >
                  <span className="group-hover:text-blue-300">
                    {t('assistant.questions.securitySettings')}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500 group-hover:text-blue-400">
                    👆 Tıklayın
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={scope}
        style={{ y: floatY }}
        className="relative select-none cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Ana emoji container */}
        <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-lg flex items-center justify-center overflow-hidden">
          {/* Gözler */}
          <div className="absolute top-5 left-3 w-3 h-3 bg-neutral-900 rounded-full flex items-center justify-center">
            <motion.div className="eye w-1 h-1 bg-white rounded-full" />
          </div>
          <div className="absolute top-5 right-3 w-3 h-3 bg-neutral-900 rounded-full flex items-center justify-center">
            <motion.div className="eye w-1 h-1 bg-white rounded-full" />
          </div>
          
          {/* Ağız */}
          <div className="absolute bottom-4 w-8 h-4 border-2 border-neutral-900 rounded-lg bg-neutral-900" />

          {/* Parıltı efekti */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white/30 rounded-full blur-sm" />
        </div>

        {/* Konuşma balonu */}
        {!isOpen && !helpPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute -top-12 -right-2 bg-white text-gray-800 px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap"
          >
            {t('assistant.greeting')}
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white" />
          </motion.div>
        )}

        {/* Enerji halkası */}
        <motion.div
          className="absolute -inset-2 border-2 border-yellow-300/30 rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </div>
  );
}; 