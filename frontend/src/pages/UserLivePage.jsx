import { useState } from 'react';
import LiveScoresDashboard from './LiveScoresDashboard';
import { useUserSync } from '../context/UserSyncContext';
import { FiGlobe, FiActivity, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const UserLivePage = () => {
  const [dataSource, setDataSource] = useState('organized'); // 'api' or 'organized'
  const { organized, global: globalData, refresh } = useUserSync();

  return (
    <div className="space-y-10 animate-slide-up">
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">Live <span className="text-rose-500">Arena</span></h2>
              <p className="mt-2 text-slate-400 font-medium text-sm">Real-time match synchronization and live tournament broadcasting.</p>
           </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
               <button 
                 onClick={() => {
                   toast.promise(refresh(true), {
                     loading: 'Synchronizing arena signals...',
                     success: 'Signals synchronized',
                     error: 'Synchronization failed'
                   });
                 }}
                 className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
               >
                 <FiRefreshCw className="animate-spin-slow" /> Sync Signals
               </button>
               <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                  <button 
                    onClick={() => setDataSource('api')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'api' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    <FiGlobe className={dataSource === 'api' ? 'animate-pulse' : ''} /> Global Feed
                  </button>
                  <button 
                    onClick={() => setDataSource('organized')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'organized' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    <FiActivity /> Local Circuit
                  </button>
               </div>
            </div>
        </div>
      </section>

      <LiveScoresDashboard 
        liveMatches={dataSource === 'api' ? globalData.live : organized.live} 
      />
    </div>
  );
};

export default UserLivePage;
