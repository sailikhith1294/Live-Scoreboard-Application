import LiveScoresDashboard from './LiveScoresDashboard';

const UserLivePage = () => {
  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">User Live Dashboard</h2>
        <p className="mt-2 text-slate-300">Track live matches and open scorecards.</p>
      </section>
      <LiveScoresDashboard />
    </div>
  );
};

export default UserLivePage;
