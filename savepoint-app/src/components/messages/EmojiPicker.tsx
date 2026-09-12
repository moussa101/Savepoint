'use client';

import EmojiPickerReact, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';

export default function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="emoji-picker-panel">
      <div className="emoji-picker-header">
        <span className="emoji-picker-title">Emoji</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="emoji-picker-body">
        <EmojiPickerReact
          theme={Theme.DARK}
          emojiStyle={EmojiStyle.APPLE}
          searchPlaceHolder="Search emoji…"
          previewConfig={{ showPreview: false }}
          width="100%"
          height="100%"
          onEmojiClick={(data: EmojiClickData) => {
            onSelect(data.emoji);
          }}
        />
      </div>
    </div>
  );
}
