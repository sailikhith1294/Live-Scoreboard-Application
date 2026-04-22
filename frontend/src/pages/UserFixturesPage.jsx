import FixturesDashboard from './FixturesDashboard';

const UserFixturesPage = () => {
  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">User Fixtures Dashboard</h2>
        <p className="mt-2 text-slate-300">See scheduled fixtures and upcoming matches.</p>
      </section>
      <FixturesDashboard />
    </div>
  );
};

export default UserFixturesPage;
