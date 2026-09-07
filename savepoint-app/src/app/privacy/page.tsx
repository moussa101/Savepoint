import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — Savepoint',
  description: 'How Savepoint collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="September 7, 2026">
      <p>
        This Privacy Policy explains how Savepoint (“we”, “us”) collects, uses, and
        shares information when you use{' '}
        <a href="https://www.savepoint.life">www.savepoint.life</a> and related
        services. By using Savepoint, you agree to this Policy.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Account &amp; profile</h3>
      <ul>
        <li>Email address, username, display name, and password (stored hashed)</li>
        <li>Profile details such as bio, avatar, and banner images</li>
        <li>Privacy preferences (for example private profile or public library)</li>
        <li>
          Information from sign-in providers you choose (Google, Discord, Xbox,
          Steam where enabled), such as email and profile identifiers those
          providers share with us
        </li>
      </ul>

      <h3>Activity on Savepoint</h3>
      <ul>
        <li>Library entries, ratings, reviews, comments, lists, and follows</li>
        <li>Friend relationships and related requests</li>
        <li>Reports you submit for moderation</li>
        <li>Notification preferences and in-app notifications</li>
      </ul>

      <h3>Messages</h3>
      <p>
        Friend direct messages are end-to-end encrypted on supported clients. We
        store encrypted message payloads (ciphertext and related delivery metadata
        such as conversation membership and timestamps). We do not store message
        plaintext when encryption operates as designed. Encryption keys for
        decrypting messages remain on your devices.
      </p>

      <h3>Library sync</h3>
      <p>
        If you link Steam or another supported library source, we may collect game
        ownership and playtime data needed to sync your library and compute
        community features (such as average playtime).
      </p>

      <h3>Technical &amp; security data</h3>
      <ul>
        <li>Approximate IP address and related signals used for security, abuse prevention, and session integrity</li>
        <li>Standard server logs needed to operate and debug the Service</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, maintain, and improve Savepoint</li>
        <li>Authenticate you and secure accounts</li>
        <li>Send verification, password reset, and optional notification emails</li>
        <li>Power recommendations, feeds, and discovery features</li>
        <li>Moderate content and enforce our Terms</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>3. Uploads &amp; moderation</h2>
      <p>
        Profile images you upload may be stored with our cloud storage provider
        (for example Cloudflare R2) and checked by automated moderation services
        (for example Sightengine) to help block disallowed imagery.
      </p>

      <h2>4. Sharing</h2>
      <p>We share information with:</p>
      <ul>
        <li>
          <strong>Other users</strong> — according to your privacy settings and
          what you choose to publish (profile, reviews, lists, public library,
          etc.)
        </li>
        <li>
          <strong>Service providers</strong> — hosting, database, email, storage,
          authentication, moderation, and similar processors that help us run
          Savepoint
        </li>
        <li>
          <strong>Legal / safety</strong> — when required by law or to protect
          users and the Service
        </li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>5. Cookies &amp; sessions</h2>
      <p>
        We use session cookies and similar technologies required for sign-in and
        keeping you logged in. These are essential to operating authenticated
        parts of the Service.
      </p>

      <h2>6. Retention</h2>
      <p>
        We retain account and content data while your account is active and as
        needed to provide the Service, resolve disputes, and meet legal
        requirements. You may request deletion of your account by contacting us;
        some residual copies may remain in backups for a limited period.
      </p>

      <h2>7. Your choices</h2>
      <ul>
        <li>Update profile and privacy settings in Settings</li>
        <li>Disconnect linked libraries where the product allows</li>
        <li>Control email notification preferences where available</li>
        <li>Request access or deletion by emailing us</li>
      </ul>

      <h2>8. Children</h2>
      <p>
        Savepoint is not directed at children under 13 (or the minimum age
        required in your country). If you believe a child has provided us personal
        information, contact us and we will take appropriate steps.
      </p>

      <h2>9. International users</h2>
      <p>
        We may process data in countries where our providers operate. By using
        Savepoint, you understand your information may be transferred to and
        processed in those locations.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Policy from time to time. We will revise the “Last
        updated” date when we do. Continued use of Savepoint after changes means
        you accept the updated Policy.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions: email{' '}
        <a href="mailto:savepoint62@gmail.com">savepoint62@gmail.com</a>. See also
        our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}
