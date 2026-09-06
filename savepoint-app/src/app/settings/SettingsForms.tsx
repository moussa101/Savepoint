'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePrivacySettings, updateNotificationSettings } from '@/app/actions/settings';

interface SettingsFormsProps {
  isPrivate: boolean;
  notifyOnFollow: boolean;
  notifyOnReviewLike: boolean;
  notifyOnComment: boolean;
  notifyOnListLike: boolean;
}

export default function SettingsForms({
  isPrivate,
  notifyOnFollow,
  notifyOnReviewLike,
  notifyOnComment,
  notifyOnListLike,
}: SettingsFormsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePrivacy(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    startTransition(async () => {
      await updatePrivacySettings(next);
      router.refresh();
    });
  }

  function handleNotifications(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateNotificationSettings(formData);
      router.refresh();
    });
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
          Privacy
        </h2>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
          <div>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Private profile</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Only you can see your library, reviews, lists, and followers when enabled
            </span>
          </div>
          <input type="checkbox" checked={isPrivate} onChange={handlePrivacy} disabled={isPending} />
        </label>
      </div>

      <div className="card">
        <h2 className="font-display" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
          Notifications
        </h2>
        <form onSubmit={handleNotifications} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[
            { name: 'notifyOnFollow', label: 'New followers', checked: notifyOnFollow },
            { name: 'notifyOnReviewLike', label: 'Likes on your reviews', checked: notifyOnReviewLike },
            { name: 'notifyOnComment', label: 'Comments on your reviews', checked: notifyOnComment },
            { name: 'notifyOnListLike', label: 'Likes on your lists', checked: notifyOnListLike },
          ].map((item) => (
            <label key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <input type="checkbox" name={item.name} defaultChecked={item.checked} />
            </label>
          ))}
          <button type="submit" className="btn btn-primary" disabled={isPending} style={{ alignSelf: 'flex-start' }}>
            {isPending ? 'Saving...' : 'Save notification preferences'}
          </button>
        </form>
      </div>
    </>
  );
}
