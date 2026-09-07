import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '@/components/layout/LegalShell';

export const metadata: Metadata = {
  title: 'Terms of Service — Savepoint',
  description: 'Terms of Service for using Savepoint.',
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="September 7, 2026">
      <p>
        These Terms of Service (“Terms”) govern your access to and use of Savepoint
        (the “Service”), including the website at{' '}
        <a href="https://www.savepoint.life">www.savepoint.life</a>. By creating an
        account or using Savepoint, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Savepoint is a social gaming platform that lets you track games, rate and
        review titles, follow other users, create lists, sync libraries from
        supported platforms, and message friends. Game catalog data may be sourced
        from third parties such as IGDB.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be able to form a binding contract in your jurisdiction.</li>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>
          You must provide accurate registration information and keep it up to date.
        </li>
        <li>
          You may sign in with email/password or supported third-party providers
          (for example Google, Discord, Xbox, or Steam where enabled).
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Harass, threaten, or abuse other users</li>
        <li>Post illegal, hateful, or sexually exploitative content</li>
        <li>Spam, scrape, or disrupt the Service</li>
        <li>Impersonate others or misrepresent your affiliation</li>
        <li>Upload malware or attempt unauthorized access to accounts or systems</li>
        <li>Violate applicable law or these Terms</li>
      </ul>
      <p>
        We may remove content, restrict features, or suspend or terminate accounts
        that violate these Terms, including via reports and moderation tools.
      </p>

      <h2>4. User content</h2>
      <p>
        You retain ownership of content you submit (reviews, comments, lists,
        profile text, images, and similar). You grant Savepoint a worldwide,
        non-exclusive, royalty-free license to host, display, and distribute that
        content as needed to operate and improve the Service.
      </p>
      <p>
        You are solely responsible for your content. Do not post material you do
        not have the right to share.
      </p>

      <h2>5. Messages</h2>
      <p>
        Direct messages between friends are designed to be end-to-end encrypted on
        supported clients. Savepoint stores ciphertext and related metadata needed
        to deliver messages; we cannot read message plaintext when encryption is
        working as intended. Misuse of messaging (spam, harassment, illegal
        activity) may still result in account action based on reports and other
        available signals.
      </p>

      <h2>6. Third-party services &amp; game data</h2>
      <p>
        Savepoint integrates with third parties (for example authentication
        providers, cloud storage, email delivery, content moderation, and game
        databases). Their terms and privacy policies apply to those services.
        Game names, artwork, and metadata belong to their respective rights
        holders; Savepoint does not claim ownership of that material.
      </p>

      <h2>7. Library sync</h2>
      <p>
        If you connect Steam or other library providers, you authorize Savepoint to
        retrieve and store library and playtime data associated with that link for
        features such as syncing your collection and community playtime
        statistics.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided “as is” and “as available.” To the fullest extent
        permitted by law, we disclaim warranties of merchantability, fitness for a
        particular purpose, and non-infringement. We do not guarantee uninterrupted
        or error-free operation.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Savepoint and its operators will
        not be liable for indirect, incidental, special, consequential, or
        punitive damages, or any loss of data, profits, or goodwill arising from
        your use of the Service.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use after changes
        become effective constitutes acceptance of the updated Terms. The “Last
        updated” date at the top of this page will change when we revise them.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms: email{' '}
        <a href="mailto:savepoint62@gmail.com">savepoint62@gmail.com</a>. See also
        our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalShell>
  );
}
