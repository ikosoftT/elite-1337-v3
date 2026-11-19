/** A delayed exposure gives the moving emblem a trail without loading another asset. */
export function LoginHorse() {
  return <div className="landing-horse-track" aria-hidden="true">
    <img className="landing-horse landing-exposure" src="/assets/elite-1337-icy.webp" alt="" width={680} height={180}/>
    <img className="landing-horse" src="/assets/elite-1337-icy.webp" alt="" width={680} height={180}/>
  </div>;
}
