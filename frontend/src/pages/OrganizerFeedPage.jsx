import { useEffect, useState } from 'react';
import api from '../services/api';

const OrganizerFeedPage = () => {
  const [feed, setFeed] = useState({ live: [], scheduled: [], completed: [] });

  useEffect(() => {
    api.get('/organizer/dashboard')
      .then((res) => {
        const data = res?.data?.liveFeed || { live: [], scheduled: [], completed: [] };
        setFeed({
          live: Array.isArray(data.live) ? data.live : [],
          scheduled: Array.isArray(data.scheduled) ? data.scheduled : [],
          completed: Array.isArray(data.completed) ? data.completed : [],
        });
      })
      .catch(() => setFeed({ live: [], scheduled: [], completed: [] }));
  }, []);

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Organizer Live Feed</h2>
        <p className="mt-2 text-slate-300">Live, scheduled and completed feed pulled from integrated providers.</p>
      </section>

      <section className="surface-panel">
        <div className="grid gap-3 md:grid-cols-3">
          {['live', 'scheduled', 'completed'].map((bucket) => (
            <div key={bucket} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-sm uppercase text-slate-300 font-semibold">{bucket}</p>
              <div className="mt-2 space-y-2">
                {(feed[bucket] || []).slice(0, 8).map((m) => (
                  <div key={m.id || m.externalId} className="rounded-md border border-slate-700/60 p-2">
                    <p className="text-white text-sm font-semibold">{m.matchNo || 'Match'}</p>
                    <p className="text-slate-400 text-xs">{m.team1?.shortName || 'T1'} vs {m.team2?.shortName || 'T2'}</p>
                  </div>
                ))}
                {(feed[bucket] || []).length === 0 ? <p className="text-xs text-slate-500">No matches.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OrganizerFeedPage;
