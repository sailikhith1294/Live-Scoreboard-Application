import { useEffect, useState } from 'react';
import api from '../services/api';

const FixturesDashboard = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const getId = (row) => row?._id || row?.id;

  useEffect(() => {
    api
      .get('/schedules')
      .then((res) => setFixtures(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="surface-panel">Loading fixtures...</div>;
  }

  return (
    <section className="surface-panel">
      <h3 className="font-semibold mb-3">Tournament Fixtures Dashboard</h3>
      <div className="space-y-2">
        {fixtures.length === 0 ? <p className="text-sm">No fixtures available from the API.</p> : null}
        {fixtures.map((fixture) => (
          <div key={getId(fixture)} className="rounded-xl border p-3">
            <p className="font-semibold">{fixture.matchNo || 'Scheduled Match'}</p>
            <p className="text-sm">Status: {fixture.status || 'scheduled'}</p>
            <p className="text-sm">Scheduled: {fixture.scheduledAt ? new Date(fixture.scheduledAt).toLocaleString() : 'TBD'}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FixturesDashboard;
