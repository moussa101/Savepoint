'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { XIcon, UserIcon } from '@/components/ui/Icons';
import { uploadImageDirect, verifyAndSaveProfileImage, updateProfileBio } from '@/app/actions/upload';

interface EditProfileModalProps {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
    bannerImage: string | null;
  };
  onClose: () => void;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong while saving your profile.';
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
  const [bannerPreview, setBannerPreview] = useState<string | null>(user.bannerImage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    // Focus the dialog for accessibility / keyboard close
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, isSubmitting]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
    };
    // Only revoke on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'avatar') {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
    } else {
      if (bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
      setBannerFile(file);
      setBannerPreview(previewUrl);
    }
    setError(null);
  };

  const uploadToR2 = async (file: File, isBanner: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    return await uploadImageDirect(formData, isBanner);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (avatarFile) {
        const { finalImageUrl, key } = await uploadToR2(avatarFile, false);
        await verifyAndSaveProfileImage(finalImageUrl, key, false);
      }

      if (bannerFile) {
        const { finalImageUrl, key } = await uploadToR2(bannerFile, true);
        await verifyAndSaveProfileImage(finalImageUrl, key, true);
      }

      if (name.trim() !== (user.name || '') || bio !== (user.bio || '')) {
        await updateProfileBio(bio.trim(), name.trim());
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ padding: 0, outline: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
            Edit Profile
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Change banner image"
            onClick={() => bannerInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                bannerInputRef.current?.click();
              }
            }}
            style={{
              height: 120,
              backgroundColor: 'var(--bg-surface-hover)',
              backgroundImage: bannerPreview ? `url(${bannerPreview})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="btn btn-sm btn-outline" style={{ pointerEvents: 'none' }}>
                Change Banner
              </span>
            </div>
            <input
              type="file"
              hidden
              ref={bannerInputRef}
              onChange={(e) => handleFileChange(e, 'banner')}
              accept="image/jpeg,image/png,image/webp"
            />
          </div>

          <div className="modal-body">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 'var(--space-md)',
                marginTop: -48,
                marginBottom: 'var(--space-lg)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '4px solid var(--bg-surface)',
                  backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  boxShadow: '0 0 0 1px var(--bg-surface-border)',
                }}
              >
                {!avatarPreview && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    <UserIcon size={32} />
                  </span>
                )}
              </button>
              <input
                type="file"
                hidden
                ref={avatarInputRef}
                onChange={(e) => handleFileChange(e, 'avatar')}
                accept="image/jpeg,image/png,image/webp"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => avatarInputRef.current?.click()}
                style={{ marginBottom: 4 }}
              >
                Change Avatar
              </button>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'rgb(239, 68, 68)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-md)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label" htmlFor="edit-profile-name">
                Display Name
              </label>
              <input
                id="edit-profile-name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                autoComplete="nickname"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="form-label" htmlFor="edit-profile-bio">
                Bio
              </label>
              <textarea
                id="edit-profile-bio"
                className="textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={160}
                placeholder="Tell us about your gaming taste..."
              />
              <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                {bio.length}/160
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
