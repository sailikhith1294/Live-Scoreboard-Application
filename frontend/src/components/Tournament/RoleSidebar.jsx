import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChartLine,
  FaUsers,
  FaCalendar,
  FaTrophy,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaFileAlt,
  FaGraduate,
  FaUserTie,
  FaLock,
  FaCoins
} from 'react-icons/fa';
import './RoleSidebar.css';

const RoleSidebar = ({ userRole, onLogout, onSwitchMode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Define menu items based on roles
  const getMenuItems = () => {
    const baseItems = [
      {
        label: 'Dashboard',
        icon: <FaChartLine />,
        path: '/tournament/dashboard',
        roles: ['user', 'player', 'manager', 'admin']
      }
    ];

    const roleMenus = {
      user: [
        {
          label: 'Public Leagues',
          icon: <FaTrophy />,
          path: '/tournament/leagues-public',
          roles: ['user', 'player', 'manager', 'admin']
        },
        {
          label: 'My Teams',
          icon: <FaUsers />,
          path: '/tournament/my-teams',
          roles: ['user', 'player', 'manager', 'admin']
        },
        {
          label: 'Leaderboards',
          icon: <FaChartLine />,
          path: '/tournament/leaderboards',
          roles: ['user', 'player', 'manager', 'admin']
        }
      ],
      player: [
        {
          label: 'Public Leagues',
          icon: <FaTrophy />,
          path: '/tournament/leagues-public',
          roles: ['player', 'manager', 'admin']
        },
        {
          label: 'My Teams',
          icon: <FaUsers />,
          path: '/tournament/my-teams',
          roles: ['player', 'manager', 'admin']
        },
        {
          label: 'Player Stats',
          icon: <FaChartLine />,
          path: '/tournament/player-stats',
          roles: ['player', 'manager', 'admin']
        },
        {
          label: 'Performance',
          icon: <FaGraduate />,
          path: '/tournament/performance',
          roles: ['player', 'manager', 'admin']
        }
      ],
      manager: [
        {
          label: 'My Leagues',
          icon: <FaTrophy />,
          path: '/tournament/my-leagues',
          roles: ['manager', 'admin']
        },
        {
          label: 'Create League',
          icon: <FaCalendar />,
          path: '/tournament/create-league',
          roles: ['manager', 'admin']
        },
        {
          label: 'Manage Teams',
          icon: <FaUsers />,
          path: '/tournament/manage-teams',
          roles: ['manager', 'admin']
        },
        {
          label: 'Live Scorer',
          icon: <FaFileAlt />,
          path: '/tournament/live-scorer',
          roles: ['manager', 'admin']
        },
        {
          label: 'Match Schedule',
          icon: <FaCalendar />,
          path: '/tournament/match-schedule',
          roles: ['manager', 'admin']
        }
      ],
      admin: [
        {
          label: 'User Management',
          icon: <FaUsers />,
          path: '/tournament/admin/users',
          roles: ['admin']
        },
        {
          label: 'Role Approval',
          icon: <FaLock />,
          path: '/tournament/admin/approvals',
          roles: ['admin']
        },
        {
          label: 'Suspend Users',
          icon: <FaUserTie />,
          path: '/tournament/admin/suspensions',
          roles: ['admin']
        },
        {
          label: 'System Logs',
          icon: <FaFileAlt />,
          path: '/tournament/admin/logs',
          roles: ['admin']
        },
        {
          label: 'Settings',
          icon: <FaCog />,
          path: '/tournament/admin/settings',
          roles: ['admin']
        }
      ]
    };

    const items = [...baseItems];
    if (roleMenus[userRole]) {
      items.push(...roleMenus[userRole]);
    }

    return items;
  };

  const menuItems = getMenuItems();
  const isActive = (path) => location.pathname === path;

  const handleSwitchMode = () => {
    onSwitchMode();
    navigate('/');
  };

  const sidebarVariants = {
    open: {
      width: 280,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    closed: {
      width: 80,
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        className={`role-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FaTrophy size={isOpen ? 24 : 28} />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="logo-text"
                >
                  CREASE TM
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Collapse Toggle */}
          <button
            className="collapse-toggle"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        {/* Role Badge */}
        <div className="sidebar-role-badge">
          <span className={`role-badge badge-${userRole}`}>
            {userRole?.toUpperCase()}
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              title={!isOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="nav-label"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="sidebar-footer">
          {/* Switch Mode Button */}
          <button
            className="footer-button switch-mode-btn"
            onClick={handleSwitchMode}
            title={!isOpen ? 'Switch Mode' : ''}
          >
            <FaCoins size={18} />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Toss Mode
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Settings Button */}
          <Link
            to="/tournament/settings"
            className="footer-button"
            title={!isOpen ? 'Settings' : ''}
          >
            <FaCog size={18} />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Logout Button */}
          <button
            className="footer-button logout-btn"
            onClick={onLogout}
            title={!isOpen ? 'Logout' : ''}
          >
            <FaSignOutAlt size={18} />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default RoleSidebar;
