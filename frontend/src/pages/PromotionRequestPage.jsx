import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiShield, FiUserCheck, FiBriefcase, FiSend } from 'react-icons/fi';

const PromotionRequestPage = () => {
  const [request, setRequest] = useState({ requestedRole: 'umpire', reason: '', experience: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Assuming endpoint: POST /api/admin/requests
      await api.post('/admin/requests', request);
      toast.success('Your application has been submitted to the Command Center.');
      setRequest({ requestedRole: 'umpire', reason: '', experience: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
      <section className="surface-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 z-0" />
        <div className="relative z-10 p-8">
           <h2 className="text-4xl font-black text-white italic tracking-tighter">Official <span className="text-emerald-500">Promotion</span></h2>
           <p className="mt-2 text-slate-400 font-medium">Apply for elevated access and contribute to the league ecosystem.</p>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-5">
         <div className="md:col-span-3 surface-panel p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Desired Path</label>
                  <div className="grid grid-cols-2 gap-4">
                     {[
                        { id: 'umpire', label: 'League Umpire', icon: FiShield, desc: 'On-field official' },
                        { id: 'organizer', label: 'Tournament Ops', icon: FiBriefcase, desc: 'Event management' }
                     ].map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setRequest({...request, requestedRole: role.id})}
                          className={`p-4 rounded-2xl border transition-all text-left group ${
                            request.requestedRole === role.id ? 'bg-emerald-500 border-emerald-500 text-[#020617]' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                          }`}
                        >
                           <role.icon className={`text-xl mb-3 ${request.requestedRole === role.id ? 'text-[#020617]' : 'text-emerald-500'}`} />
                           <p className="font-bold text-sm">{role.label}</p>
                           <p className={`text-[10px] mt-1 ${request.requestedRole === role.id ? 'text-[#020617]/70' : 'text-slate-500'}`}>{role.desc}</p>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Statement of Intent</label>
                  <textarea 
                    required 
                    className="input-field min-h-[120px]" 
                    placeholder="Why do you wish to join the official circuit?"
                    value={request.reason}
                    onChange={e => setRequest({...request, reason: e.target.value})}
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Relevant Experience</label>
                  <input 
                    required 
                    className="input-field" 
                    placeholder="E.g. 5 years local league umpiring"
                    value={request.experience}
                    onChange={e => setRequest({...request, experience: e.target.value})}
                  />
               </div>

               <button 
                 disabled={loading}
                 className="w-full btn-primary !py-4 flex items-center justify-center gap-3"
               >
                  {loading ? 'Transmitting...' : <><FiSend /> Submit Application</>}
               </button>
            </form>
         </div>

         <div className="md:col-span-2 space-y-6">
            <section className="surface-panel p-6 border-emerald-500/20 bg-emerald-500/5">
               <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Official Requirements</h3>
               <ul className="space-y-4">
                  {[
                     'Identity verification must be complete',
                     'Must have a clean platform history',
                     'Requires Admin Board approval',
                     'May involve a brief interview'
                  ].map((item, i) => (
                     <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                        <FiUserCheck className="mt-1 text-emerald-500 shrink-0" />
                        {item}
                     </li>
                  ))}
               </ul>
            </section>

            <section className="surface-panel p-6">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Vetting Process</h3>
               <p className="text-xs text-slate-500 leading-relaxed italic">
                  Applications are typically reviewed within 48-72 hours. You will receive a platform notification once a decision has been reached by the Command Center.
               </p>
            </section>
         </div>
      </div>
    </div>
  );
};

export default PromotionRequestPage;
