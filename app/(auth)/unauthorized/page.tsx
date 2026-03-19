export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F8FAFC" }}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6">You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.</p>
        <a href="/dashboard" className="btn-primary inline-flex">← Back to Dashboard</a>
      </div>
    </div>
  );
}
