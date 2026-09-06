'use client';

import { useState } from 'react';
import EditProfileModal from './EditProfileModal';

interface EditProfileWrapperProps {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
    bannerImage: string | null;
  };
}

export default function EditProfileWrapper({ user }: EditProfileWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn btn-outline" onClick={() => setIsOpen(true)}>
        Edit Profile
      </button>

      {isOpen && (
        <EditProfileModal user={user} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
