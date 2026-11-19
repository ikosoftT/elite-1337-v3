import { CONTACT, LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Privacy Policy', description: 'What Elite 1337 reads, keeps and shares, and how to ask for removal.' };

export default function Privacy() {
  return <LegalPage
    title="Privacy Policy"
    other={{ href: '/terms', label: 'Terms of Use' }}
    intro={<p>Elite 1337 is an independent student project. It is not run by 42 or 1337. We keep as little as we can: there is no database of rankings, no ads and no selling of data. This page explains exactly what the site reads and keeps.</p>}
    sections={[
      { id: 'sign-in', title: 'Signing in', body: <>
        <p>You sign in with your 42 Intra account through 42&apos;s official login (OAuth), with the <strong>public</strong> scope only. We never see your 42 password.</p>
        <p>After sign-in, your browser keeps one encrypted session cookie with your 42 user id and login. It lasts up to 7 days, or until you log out. It is needed for the site to work and is not used for tracking.</p>
      </> },
      { id: 'data', title: 'Data we read from 42', body: <>
        <p>To build the pages, our server reads public 42 Intra data through the 42 API: logins, names, campus, levels, profile photos, Common Core projects and attempts, evaluations, blackhole dates and workstation sessions.</p>
        <p>This data is cached on the server for between a few minutes and a few hours, then fetched again. It is not stored in a database.</p>
        <ul>
          <li><strong>Visible to every signed-in 1337 student:</strong> the leaderboard, stats, corrections, each student&apos;s Common Core race, and the login and Intra avatar attached to a currently occupied cluster workstation—the same kind of information already visible on 42 Intra.</li>
          <li><strong>Visible only to you:</strong> your logtime stats on My profile and My race (hours, progress, streaks, seats and schedule), plus your wallet and correction-point balance. Other students cannot open them.</li>
        </ul>
      </> },
      { id: 'stored', title: 'What we store', body: <>
        <ul>
          <li><strong>Feedback</strong> (optional): what you send through the feedback dialog, described below.</li>
          <li><strong>Leaderboard gender filter</strong> (optional): if you opt in, we keep your 42 user ID and the gender you provide in private site settings. Signed-in 1337 students can see your leaderboard entry when they select that gender. You can ask us to remove your entry using the contact below.</li>
          <li><strong>Name-based estimates</strong>: the leaderboard server matches 42 given names against a name reference. Signed-in 1337 students can see an entry in the resulting estimates. The given-name fields used for matching stay on the server.</li>
          <li><strong>Live presence:</strong> while signed in, an expiring Redis entry contains your 42 id, login, current site section and last-seen time. It is visible only to configured administrators, expires after three minutes and is not retained as history.</li>
          <li><strong>Custom badges:</strong> administrators may store a 42 login and short recognition label in Redis. Assignments remain until an administrator removes them.</li>
        </ul>
      </> },
      { id: 'feedback', title: 'Bug reports and feedback', body: <>
        <p>When you send feedback, your message, its type (bug, idea or other), the page you were on and your screen size are saved in our database for the team, and a copy is posted to the team&apos;s private Discord channel. Your login is added <strong>only if you tick the box</strong>, so we can reply on 42 Intra. Please do not put passwords or private information in the message.</p>
      </> },
      { id: 'device', title: 'Stored on your device', body: <>
        <p>Your browser keeps a few small settings in local storage: theme and race sound on or off. They never leave your device, and clearing your browser data removes them.</p>
      </> },
      { id: 'analytics', title: 'Analytics', body: <>
        <p>We use first-party counts and Umami Cloud to understand visits and a few clicks. General analytics use random or keyed identifiers and the admin stats page shows counts, not names. Live presence is separate from analytics and visible only to configured administrators. We never send logins, names or search text to Umami. Search and filter values in the address bar are ignored.</p>
      </> },
      { id: 'others', title: 'Services we rely on', body: <>
        <ul>
          <li><strong>42 Intra</strong>: sign-in and 42 profile and activity data.</li>
          <li><strong>Vercel</strong>: hosting. Like any web host, it keeps short technical logs, such as IP addresses and errors.</li>
          <li><strong>Neon</strong>: the database that keeps feedback and first-party visit counts.</li>
          <li><strong>Upstash Redis</strong>: short-lived live-presence entries and persistent administrator-assigned custom badges when those features are configured.</li>
          <li><strong>Discord</strong>: team notifications for new feedback.</li>
          <li><strong>Umami Cloud</strong>: visit counts.</li>
        </ul>
        <p>Links to student offers, GitHub and 42 Intra take you to those sites, which have their own privacy policies.</p>
      </> },
      { id: 'rights', title: 'Your choices', body: <>
        <p>You can ask us to <strong>hide you from the leaderboard and stats</strong>, or ask what we hold about you. Send {CONTACT}. We will answer as soon as we can, usually within a few days.</p>
        <p>In Morocco, personal data is protected by Law 09-08, and you can also contact the CNDP.</p>
      </> },
      { id: 'changes', title: 'Changes', body: <p>If this policy changes, the date at the top changes too. Important changes will be announced on the site.</p> },
    ]}
  />;
}
