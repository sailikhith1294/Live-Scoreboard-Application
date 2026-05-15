import { useState } from 'react';
import FixturesDashboard from './FixturesDashboard';
import { useUserSync } from '../context/UserSyncContext';
import { FiGlobe, FiActivity } from 'react-icons/fi';

const UserFixturesPage = () => {
  const [dataSource, setDataSource] = useState('organized'); // 'api' or 'organized'
  const { organized, global: globalData, tournaments } = useUserSync();

  return (
    <div className="space-y-10 animate-slide-up">
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">Season <span className="text-indigo-400">Fixtures</span></h2>
              <p className="mt-2 text-slate-400 font-medium text-sm">Scheduled matches, series schedules, and upcoming cricket events.</p>
           </div>

           <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
              <button 
                onClick={() => setDataSource('api')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'api' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <FiGlobe className={dataSource === 'api' ? 'animate-pulse' : ''} /> Global Feed
              </button>
              <button 
                onClick={() => setDataSource('organized')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'organized' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <FiActivity /> Local Circuit
              </button>
           </div>
        </div>
      </section>

      <FixturesDashboard 
        fixtures={dataSource === 'api' ? globalData.upcoming : organized.upcoming}
        tournaments={dataSource === 'api' ? [] : tournaments}
      />
    </div>
  );
};

export default UserFixturesPage;
