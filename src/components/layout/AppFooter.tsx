export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="ema-footer">
      <span><strong>EMA System</strong> ? {year}. Operations Console.</span>
      <div className="ema-footer-links">
        <span>Secure Access</span>
        <span>Endpoint Management</span>
        <span>AI Assisted</span>
      </div>
    </footer>
  );
}

export default AppFooter;
