import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiSend, FiClock, FiCheckCircle, FiInfo } from 'react-icons/fi';

const UserPromotionPage = () => {
  const [loading, setLoading] = useState(true);
  const [requestState, setRequestState] = useState({ promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
  const [form, setForm] = useState({ requestedRole: 'player', message: '' });

  const loadRequest = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/me/promotion-request');
      setRequestState(data || { promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load promotion status');
      setRequestState({ promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequest(); }, []);

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/me/promotion-request', form);
      toast.success('Promotion request transmitted to headquarters');
      await loadRequest();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  const request = requestState.promotionRequest;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent z-0" />
        <div className="relative z-10 p-8">
           <h2 className="text-4xl font-black text-white italic tracking-tighter">Access <span className="text-indigo-400">Upgrade</span></h2>
           <p className="mt-2 text-slate-400 font-medium">Elevate your account permissions to Umpire, Organizer, or Professional Player.</p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Status Tracker */}
        <div className="lg:col-span-5 space-y-6">
           <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <FiClock className="text-indigo-400" /> Application Status
           </h3>
           
           <AnimatePresence mode="wait">
              {request ? (
                 <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="surface-panel p-8 border-indigo-500/20 bg-indigo-500/5">
                    <div className="flex justify-between items-start mb-8">
                       <span className={`badge ${request.status === 'pending' ? 'badge-amber' : request.status === 'approved' ? 'badge-emerald' : 'badge-rose'}`}>
                          {request.status.toUpperCase()}
                       </span>
                       <FiShield className="text-3xl text-indigo-500/30" />
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>Target Role</span>
                          <span className="text-white italic">{request.requestedRole}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>Submitted</span>
                          <span className="text-slate-300">{new Date(request.requestedAt).toLocaleDateString()}</span>
                       </div>
                       <div className="pt-4 border-t border-white/5">
                          <p className="text-[10px] font-black uppercase text-slate-600 mb-2">Message to Admin</p>
                          <p className="text-sm text-slate-400 italic">"{request.message || 'Standard promotion request'}"</p>
                       </div>
                    </div>
                 </motion.div>
              ) : (
                 <div className="surface-panel p-16 text-center border-dashed border-2 opacity-50">
                    <FiInfo className="text-4xl text-slate-700 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest italic">No active applications found.</p>
                 </div>
              )}
           </AnimatePresence>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-7 space-y-6">
           <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <FiSend className="text-emerald-400" /> New Application
           </h3>

           <form onSubmit={submitRequest} className="surface-panel p-8 bg-mesh border-emerald-500/20 space-y-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Desired Operational Role</label>
                 <div className="grid grid-cols-3 gap-3">
                    {['player', 'umpire', 'organizer'].map(r => (
                       <button 
                         key={r}
                         type="button"
                         onClick={() => setForm({...form, requestedRole: r})}
                         className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.requestedRole === r ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
                       >
                          {r}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Justification Message</label>
                 <textarea 
                   required
                   className="input-field min-h-[150px] !py-5"
                   placeholder="Briefly explain your experience and why you require this access..."
                   value={form.message}
                   onChange={e => setForm({...form, message: e.target.value})}
                 />
              </div>

              <button 
                type="submit" 
                disabled={request?.status === 'pending'}
                className="w-full btn-primary !py-5 !bg-indigo-600 hover:!bg-indigo-500 shadow-indigo-900/30 disabled:opacity-50"
              >
                 {request?.status === 'pending' ? 'APPLICATION UNDER REVIEW' : 'TRANSMIT UPGRADE REQUEST'}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

export default UserPromotionPage;
