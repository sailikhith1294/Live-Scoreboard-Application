import Navigation from './Navigation';

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.1),transparent_33%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.08),transparent_38%)]" />
      <Navigation />
      <main className="main-shell">
        <div className="page-shell app-canvas relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
