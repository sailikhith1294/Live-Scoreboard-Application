import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiArrowLeft } from 'react-icons/fi';
import { FaTrophy, FaBolt } from 'react-icons/fa';
import { GiCricketBat } from 'react-icons/gi';
import { PRESENTATION_MODE } from '../../config/presentationMode';

const NotFound = () => {
  const navigate = useNavigate();

  if (PRESENTATION_MODE) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-shell p-4">
      <div className="text-center max-w-2xl">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-cricket-500/20 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-cricket-500/20 rounded-full blur-xl"></div>
            <GiCricketBat className="relative text-cricket-500 text-5xl" />
          </div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-8xl sm:text-9xl font-display font-bold text-gradient-cricket mb-4"
          >
            404
          </motion.h1>
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
          >
            Page Not Found
          </motion.h2>
          <motion.p 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 text-base sm:text-lg mb-8"
          >
            Oops! The page you're looking for doesn't exist or has been moved.
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="btn-outline flex items-center gap-2"
          >
            <FiArrowLeft />
            <span>Go Back</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="btn-cricket flex items-center gap-2"
          >
            <FiHome />
            <span>Go to Homepage</span>
          </motion.button>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
        >
          <motion.div 
            whileHover={{ y: -4, boxShadow: '0 10px 40px rgba(34, 197, 94, 0.2)' }}
            className="card-pro cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-3 mb-3">
              <FaBolt className="text-cricket-500 text-2xl" />
              <h3 className="text-white font-semibold">Live Matches</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">Check out live cricket matches and scores</p>
            <span className="text-cricket-400 text-sm hover:text-cricket-300 font-medium">
              View Matches →
            </span>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -4, boxShadow: '0 10px 40px rgba(220, 38, 38, 0.2)' }}
            className="card-pro cursor-pointer"
            onClick={() => navigate('/login')}
          >
            <div className="flex items-center gap-3 mb-3">
              <GiCricketBat className="text-leather-500 text-2xl" />
              <h3 className="text-white font-semibold">Player Stats</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">View detailed player statistics and performance</p>
            <span className="text-cricket-400 text-sm hover:text-cricket-300 font-medium">
              View Players →
            </span>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -4, boxShadow: '0 10px 40px rgba(234, 179, 8, 0.2)' }}
            className="card-pro cursor-pointer"
            onClick={() => navigate('/login')}
          >
            <div className="flex items-center gap-3 mb-3">
              <FaTrophy className="text-yellow-500 text-2xl" />
              <h3 className="text-white font-semibold">Rankings</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">Check ICC rankings and team standings</p>
            <span className="text-cricket-400 text-sm hover:text-cricket-300 font-medium">
              View Rankings →
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
