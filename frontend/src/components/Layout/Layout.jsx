import Navigation from './Navigation';
import NotificationTicker from './NotificationTicker';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      <NotificationTicker />
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Navigation - Sidebar or Floating Rail */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10 lg:ml-[280px]">
          <div className="max-w-[1400px] mx-auto">
             <AnimatePresence mode="wait">
               <motion.div
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -15 }}
                 transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
               >
                 {children}
               </motion.div>
             </AnimatePresence>
          </div>
        </main>
      </div>
      
      {/* Footer Mobile Padding */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default Layout;
