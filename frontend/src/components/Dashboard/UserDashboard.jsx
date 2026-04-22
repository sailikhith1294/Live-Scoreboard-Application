import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiCalendar, FiCompass } from 'react-icons/fi';
import RoleRequestPanel from './RoleRequestPanel';

const UserDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="surface-panel p-6">
        <h1 className="text-3xl font-black text-white inline-flex items-center gap-2">
          <FiHome className="text-emerald-300" /> User Dashboard
        </h1>
        <p className="mt-2 text-slate-300">General access area for schedules, matches, and tournament viewing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/schedule" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="inline-flex items-center gap-2 text-white font-semibold"><FiCalendar /> Schedule</p>
          <p className="text-sm text-slate-400 mt-2">See planned matches.</p>
        </Link>
        <Link to="/series" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="inline-flex items-center gap-2 text-white font-semibold"><FiCompass /> Series</p>
          <p className="text-sm text-slate-400 mt-2">Explore cricket series.</p>
        </Link>
        <Link to="/match-centre-dashboard" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="text-white font-semibold">Match Centre</p>
          <p className="text-sm text-slate-400 mt-2">Open score and match cards.</p>
        </Link>
      </div>

      <RoleRequestPanel defaultRole="player" title="Request Player or Manager Role" />
    </div>
  );
};

export default UserDashboard;
