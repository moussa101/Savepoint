'use client';

import { XIcon, UserIcon } from '@/components/ui/Icons';

import { useState, useRef } from 'react';
import { getPresignedPostPolicy, verifyAndSaveProfileImage, updateProfileBio } from '@/app/actions/upload';
import { useRouter } from 'next/navigation';

interface EditProfileModalProps {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
    bannerImage: string | null;
  };
  onClose: () => void;
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const router = useRouter();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
    } else {
      setBannerFile(file);
      setBannerPreview(previewUrl);
    }
  };

  const uploadToR2 = async (file: File, isBanner: boolean) => {
    // 1. Get presigned POST policy
    const { url, fields, finalImageUrl, key } = await getPresignedPostPolicy(file.type, isBanner);
    
    // 2. Construct FormData using the policy fields
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
    formData.append('file', file);

    // 3. Upload file via POST request directly to R2 edge
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Failed to upload ${isBanner ? 'banner' : 'avatar'}`);

    return { finalImageUrl, key };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload Images
      if (avatarFile) {
        const { finalImageUrl, key } = await uploadToR2(avatarFile, false);
        await verifyAndSaveProfileImage(finalImageUrl, key, false);
      }
      
      if (bannerFile) {
        const { finalImageUrl, key } = await uploadToR2(bannerFile, true);
        await verifyAndSaveProfileImage(finalImageUrl, key, true);
      }

      // Update Text Info
      if (name !== user.name || bio !== user.bio) {
        await updateProfileBio(bio, name);
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 'var(--space-md)'
    }}>
      <div className="card card-glass" style={{
        width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: 0
      }}>
        {/* Header */}
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--bg-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}><XIcon size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Banner Upload */}
          <div 
            style={{ 
              height: '120px', 
              backgroundColor: 'var(--bg-surface-hover)', 
              backgroundImage: bannerPreview ? `url(${bannerPreview})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => bannerInputRef.current?.click()}
          >
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="btn btn-sm btn-outline" style={{ pointerEvents: 'none' }}>Change Banner</span>
            </div>
            <input type="file" hidden ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} accept="image/*" />
          </div>

          <div style={{ padding: 'var(--space-md)' }}>
            {/* Avatar Upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: '-40px', marginBottom: 'var(--space-lg)', position: 'relative', zIndex: 10 }}>
              <div 
                style={{ 
                  width: '80px', height: '80px', borderRadius: 'var(--radius-full)', 
                  backgroundColor: 'var(--bg-surface)', border: '4px solid var(--bg-body)',
                  backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onClick={() => avatarInputRef.current?.click()}
              >
                {!avatarPreview && <span style={{ color: 'var(--text-muted)' }}><UserIcon size={32} /></span>}
              </div>
              <input type="file" hidden ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" />
              <div style={{ marginTop: '30px' }}>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => avatarInputRef.current?.click()}>
                  Change Avatar
                </button>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
                {error}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="input-label">Display Name</label>
              <input 
                type="text" 
                className="input" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="input-label">Bio</label>
              <textarea 
                className="input" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={160}
                placeholder="Tell us about your gaming taste..."
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
