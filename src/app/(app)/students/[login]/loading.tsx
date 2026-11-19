/** Keeps the profile layout recognizable while the shared rankings first load. */
export default function Loading() {
  return <main className="shell sp-profile-page" aria-label="Loading student profile" aria-busy="true">
    <div className="sp-profile">
      <div className="sp-skel is-hero"/>
      <div className="sp-profile-grid"><div className="sp-skel is-panel"/><div className="sp-skel is-panel"/></div>
    </div>
  </main>;
}
