'use client';

// Centralized SVG icon library — replaces all emoji usage across the app
// Each icon is a pure SVG, no external dependencies needed

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ size = 20, color = 'currentColor', className, style, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

// Filled icon wrapper (no stroke, uses fill)
function FilledIcon({ size = 20, color = 'currentColor', className, style, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

// Navigation & Layout
export function HomeIcon(props: IconProps) {
  return <Icon {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>;
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
}

export function BellIcon(props: IconProps) {
  return <Icon {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Icon>;
}

export function SettingsIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>;
}

export function LogOutIcon(props: IconProps) {
  return <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>;
}

// User & Social
export function UserIcon(props: IconProps) {
  return <Icon {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
}

export function UsersIcon(props: IconProps) {
  return <Icon {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
}

// Games & Content
export function GamepadIcon(props: IconProps) {
  return <Icon {...props}><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></Icon>;
}

export function StarIcon(props: IconProps) {
  return <FilledIcon {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></FilledIcon>;
}

// Actions & Status
export function BookOpenIcon(props: IconProps) {
  return <Icon {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Icon>;
}

export function ListIcon(props: IconProps) {
  return <Icon {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Icon>;
}

export function PinIcon(props: IconProps) {
  return <Icon {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Icon>;
}

export function CheckCircleIcon(props: IconProps) {
  return <Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>;
}

export function XCircleIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></Icon>;
}

export function TrashIcon(props: IconProps) {
  return <Icon {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Icon>;
}

export function EditIcon(props: IconProps) {
  return <Icon {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>;
}

export function PenToolIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></Icon>;
}

// Communication & Feedback
export function HeartIcon(props: IconProps & { filled?: boolean }) {
  if (props.filled) {
    return <FilledIcon size={props.size} color={props.color || '#ef4444'} className={props.className} style={props.style}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </FilledIcon>;
  }
  return <Icon {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Icon>;
}

export function MessageIcon(props: IconProps) {
  return <Icon {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
}

export function AlertTriangleIcon(props: IconProps) {
  return <Icon {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>;
}

// Auth & Security
export function MailIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Icon>;
}

export function LockIcon(props: IconProps) {
  return <Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>;
}

export function XIcon(props: IconProps) {
  return <Icon {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>;
}

export function ShieldIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>;
}

export function CogIcon(props: IconProps) {
  return <Icon {...props}><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /><circle cx="12" cy="12" r="3" /></Icon>;
}

// Misc
export function PlusIcon(props: IconProps) {
  return <Icon {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
}

export function SignalIcon(props: IconProps) {
  return <Icon {...props}><path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" /></Icon>;
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><polyline points="20 6 9 17 4 12" /></Icon>;
}

export function MailCheckIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /><polyline points="16 18 18 20 22 16" /></Icon>;
}

export function TargetIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
}

export function FilterIcon(props: IconProps) {
  return <Icon {...props}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Icon>;
}

// Platforms & Storefronts
export function LinkIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Icon>;
}

export const GoogleIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);

export const DiscordIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
    <path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.08 0A72.37 72.37 0 0045.67 0a105.73 105.73 0 00-26.23 8.07C2.6 33.27-1.74 57.81.53 82.07c13.72 10.15 27.04 14.19 40 16.9a75.76 75.76 0 008.57-13.9 66 66 0 01-12.87-6.19c1.07-.77 2.13-1.57 3.16-2.4 25.1 11.53 52.4 11.53 77.27 0 1.04.83 2.1 1.63 3.17 2.4a66.2 66.2 0 01-12.88 6.18 75.24 75.24 0 008.57 13.9 107.5 107.5 0 0040-16.9c2.72-28.47-4.47-52.12-18.42-74zM42.27 67.5c-5.26 0-9.56-4.78-9.56-10.64 0-5.86 4.2-10.64 9.56-10.64 5.35 0 9.64 4.78 9.56 10.64 0 5.86-4.2 10.64-9.56 10.64zm42.6 0c-5.26 0-9.56-4.78-9.56-10.64 0-5.86 4.2-10.64 9.56-10.64 5.35 0 9.64 4.78 9.56 10.64 0 5.86-4.2 10.64-9.56 10.64z"/>
  </svg>
);

export const XboxIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.96.2C5.45.2.16 5.51.2 12.02c.03 5.42 3.65 10 8.64 11.4 1.15.33 2.36.43 3.56.28 4.22-.5 7.82-3.4 9.47-7.25 1.54-3.6.94-7.8-1.54-10.74C18.35 3.32 15.35.48 11.96.2zm-.12 1.94c3.4.15 6.4 1.83 8.35 4.6l-1.02 1.34c-1.3-1.63-3-3-4.84-4-1.12-.6-2.52-1.03-3.77-.9-.88.1-1.68.32-2.45.66-1.53.67-2.9 1.6-4.14 2.76l-1.3-1.1c2-2.12 4.75-3.66 7.6-3.85.5-.04 1.05-.04 1.57.03zm-5.12 5.06l1.24 1.1c-1.63 1.77-2.73 3.96-3.1 6.32-.4 2.73.12 5.5 1.48 7.88-2.6-1.35-4.52-3.72-5.4-6.52-.77-2.43-.6-5.07.47-7.37.95-2.03 2.45-3.76 4.35-4.87.32-.18.66-.35.96-.52zm11.2 1.56l1.04 1.35c.78.94 1.45 2 1.97 3.12 1.08 2.37 1.25 5.07.48 7.55-.83 2.68-2.6 4.96-5 6.27.42-.58.82-1.17 1.17-1.8 1.17-2.08 1.83-4.42 1.9-6.84.05-2-.37-3.95-1.2-5.75-.43-.92-.93-1.8-1.5-2.62-1.03-1.5-1.92-2.3-2.9-3.23.05-.06.1-.12.16-.17-.1.1.18-.2.27-.3.57.54 1.18 1.14 1.72 1.76l.16.14c.57.65 1.1 1.35 1.58 2.08l1.04 1.35z"/>
  </svg>
);

export function SteamIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" /><path d="M9.1 11.2l-3.3 1.3s-.5-1-.2-1.3c.3-.4 1.1-.9 2.2-1 .4.2 1 .7 1.3 1z" /><path d="M13 10.3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" /><path d="M17.7 7s-1-.3-1.6 0l-1.9 3.1A3 3 0 0 0 13 10.3l1.8-3.4s.2-.5.5-.7c.3-.2.8 0 .8 0l1.6.8z" /></Icon>;
}

export function AppleIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" /></Icon>;
}

export function AndroidIcon(props: IconProps) {
  return <Icon {...props}><path d="M17.5 19H9a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2Z" /><path d="M11 5.5v-2" /><path d="M15.5 5.5v-2" /></Icon>;
}

export function ExternalLinkIcon(props: IconProps) {
  return <Icon {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Icon>;
}

export function EyeIcon(props: IconProps) {
  return <Icon {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Icon>;
}

export function EyeOffIcon(props: IconProps) {
  return <Icon {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></Icon>;
}

export function ActivityIcon(props: IconProps) {
  return <Icon {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>;
}

export function ServerIcon(props: IconProps) {
  return <Icon {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></Icon>;
}

