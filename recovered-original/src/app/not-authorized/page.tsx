export default function NotAuthorized() {
  return (
    <main className="access-page">
      <section className="access-card">
        <span className="brand-mark">C</span>
        <p>CORE CRICKET</p>
        <h1>Administrator access only</h1>
        <p className="access-copy">
          The previous account has been signed out of Core Cricket. Sign in with
          the approved administrator account to continue.
        </p>
        <a href="/signin-with-chatgpt?return_to=%2F">Sign in as administrator</a>
        <small>Approved administrator: shoaib.ahmad81@yahoo.com</small>
      </section>
    </main>
  );
}
