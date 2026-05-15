import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiZap, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationTicker = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/notifications'); // Notifications are global by default if unauth
        setNotifications(data || []);
      } catch (err) { console.error(err); }
    };
    fetch();
    const interval = setInterval(fetch, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % notifications.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [notifications]);

  if (!visible || notifications.length === 0) return null;

  const current = notifications[currentIdx];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] lg:left-[280px]"
      >
        <div className="bg-rose-600 text-white px-6 py-2 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3 overflow-hidden">
             <FiZap className="shrink-0 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                <span className="opacity-70 mr-2">Broadcast:</span>
                {current?.title}: {current?.message}
             </p>
          </div>
          <button onClick={() => setVisible(false)} className="ml-4 hover:scale-110 transition-transform">
             <FiX />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationTicker;
