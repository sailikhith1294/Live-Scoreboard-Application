import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ViewerDashboardPage = () => {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    api.get('/tournaments').then((res) => setTournaments(res.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2>Viewer Dashboard</h2>
        <p>Browse tournaments, teams, schedules, and live scores.</p>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3">Tournaments</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {tournaments.map((t) => (
            <Link to={`/leaderboard/${t.id}`} key={t.id} className="rounded-xl border p-3 hover:border-cyan-600">
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm">{t.location} - {t.format}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ViewerDashboardPage;
