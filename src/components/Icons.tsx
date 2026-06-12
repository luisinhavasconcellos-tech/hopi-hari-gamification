interface IconProps {
  size?: number;
  color?: string;
}

export function BoltIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12l1-8.5Z" />
    </svg>
  );
}

export function CompassIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill={color} stroke="none" />
    </svg>
  );
}

export function HeartIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 21s-7.5-4.7-9.5-9C1 8.6 2.8 5 6.2 5c2 0 3.4 1.1 4.3 2.6h3c.9-1.5 2.3-2.6 4.3-2.6 3.4 0 5.2 3.6 3.7 7-2 4.3-9.5 9-9.5 9Z" />
    </svg>
  );
}

export function StarIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4.5 12.5 5 5L19.5 7" />
    </svg>
  );
}

export function LockIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
    </svg>
  );
}

export function CoinIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#FFC72C" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#B8860B" strokeWidth="1.6" />
      <text x="12" y="16.2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#8A6508" fontFamily="Georgia, serif">
        H
      </text>
    </svg>
  );
}

export function CameraIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M9 4 7.6 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.6L15 4H9Zm3 4.5A4.5 4.5 0 1 1 7.5 13 4.5 4.5 0 0 1 12 8.5Zm0 2A2.5 2.5 0 1 0 14.5 13 2.5 2.5 0 0 0 12 10.5Z" />
    </svg>
  );
}

export function MapIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M9 3 3.6 4.8a1 1 0 0 0-.6.9V20l6-2 6 2 5.4-1.8a1 1 0 0 0 .6-.9V4l-6 2-6-3Zm0 2.4 6 3V18.6l-6-3V5.4Z" />
    </svg>
  );
}

export function CardsIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="3" y="5" width="11" height="15" rx="1.5" transform="rotate(-8 8.5 12.5)" opacity="0.55" />
      <rect x="9" y="4" width="11" height="15" rx="1.5" transform="rotate(6 14.5 11.5)" />
    </svg>
  );
}

export function TrophyIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.3A6 6 0 0 1 13 15v2h3v3a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3h3v-2a6 6 0 0 1-3.7-3H7a4 4 0 0 1-4-4V5h3V3Zm-1 4v1a2 2 0 0 0 2 2V7H5Zm14 0h-2v3a2 2 0 0 0 2-2V7Z" />
    </svg>
  );
}

export function QrIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm12-2h2v2h-2v-2Zm-4 0h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-2 2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h2v2h-2v-2Zm2-2h2v2h-2v-2Zm0 4h2v2h-2v-2Z" />
    </svg>
  );
}

export function GiftIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 6c-.8-1.8-2.4-3-4.2-3C6 3 5 4.2 5 5.5 5 6.1 5.2 6.6 5.5 7H3a1 1 0 0 0-1 1v3h9V6Zm1 5h9V8a1 1 0 0 0-1-1h-2.5c.3-.4.5-.9.5-1.5C19 4.2 18 3 16.2 3 14.4 3 12.8 4.2 12 6h1v5Zm-2 2H3v7a1 1 0 0 0 1 1h7v-8Zm2 8h7a1 1 0 0 0 1-1v-7h-8v8Z" />
    </svg>
  );
}

export function SparkIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2c.6 4.8 2.2 7.4 7 8-4.8.6-6.4 3.2-7 8-.6-4.8-2.2-7.4-7-8 4.8-.6 6.4-3.2 7-8Z" />
      <path d="M19 14c.3 2.2 1 3.4 3 3.7-2 .3-2.7 1.5-3 3.7-.3-2.2-1-3.4-3-3.7 2-.3 2.7-1.5 3-3.7Z" opacity="0.8" />
    </svg>
  );
}

export function HomeIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 3 2.5 11h2.7v9a1 1 0 0 0 1 1H10v-6h4v6h3.8a1 1 0 0 0 1-1v-9h2.7L12 3Z" />
    </svg>
  );
}

export function PadIcon({ size = 22, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 24" fill={color}>
      <path d="M8 2h16a8 8 0 0 1 8 8v6a6 6 0 0 1-11 3.3L19.7 18h-7.4L11 19.3A6 6 0 0 1 0 16v-6a8 8 0 0 1 8-8Zm0 6v2H6v2.5h2V15h2.5v-2.5h2V10h-2V8H8Zm15 0a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 23 8Zm-4 4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z" />
    </svg>
  );
}
