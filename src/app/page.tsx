import { SiteCredits } from '@/components/site-credits';
import { EventBanner } from '@/components/event-banner';
import { LegalLinks } from '@/components/legal-page';
import { GitHubStars } from '@/components/github-stars';
import { LoginHorse } from '@/components/login-horse';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { AccessPlatformButton } from '@/components/access-platform-button';
import { REPO_URL } from '@/lib/github';
import { siteDescription, siteName, siteUrl } from '@/lib/site';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${siteUrl.origin}/#website`, url: siteUrl.href, name: siteName, alternateName: ['Elite1337', 'Elite 1337 rankings'], description: siteDescription, inLanguage: 'en' },
    { '@type': 'Organization', '@id': `${siteUrl.origin}/#organization`, name: siteName, url: siteUrl.href, logo: new URL('/assets/horse-emblem.webp', siteUrl).href, sameAs: [REPO_URL] },
  ],
};

export const metadata = { alternates: { canonical: '/' } };

export default async function Home() {
  return <main className="landing landing-login" aria-label="Elite 1337 sign in">
    <div className="landing-top-bar"><GitHubStars variant="landing"/><EventBanner/></div>
    <div className="landing-wordmark">
      <img src="/assets/elite-1337-icy.webp" alt="Elite 1337" width={680} height={180}/>
      <LoginHorse/>
    </div>
    <div className="landing-login-bottom">
      <form action={async () => {
        'use server';
        const session = await auth();
        if (session?.user?.id) redirect('/leaderboard');
        await signIn('42', { redirectTo: '/leaderboard' });
      }}>
        <AccessPlatformButton/>
      </form>
      <footer className="landing-credits"><SiteCredits/><LegalLinks/></footer>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}/>
  </main>;
}
