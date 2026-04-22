import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function BrandIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M9 4.5v9.5a3.9 3.9 0 1 1-1.8-3.3V6.5l8-1.8v8.7a3.9 3.9 0 1 1-1.8-3.3V4.3L9 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function ArrowNorthEastIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 7H17v8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.8l1.6 4.2L17.8 9.6l-4.2 1.6L12 15.4l-1.6-4.2L6.2 9.6l4.2-1.6L12 3.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18.6 15.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z" fill="currentColor" />
    </IconBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15.8V6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.7 9.8L12 6.4l3.3 3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 17.8c0 1.4 1.1 2.5 2.5 2.5h8c1.4 0 2.5-1.1 2.5-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 6.2v9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.3 12.1L12 15.6l-3.3-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.6 18.2c0 1.2 1 2.2 2.2 2.2h8.4c1.2 0 2.2-1 2.2-2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

export function FileStackIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 5.2h6.7l2.5 2.5v9.6A1.7 1.7 0 0 1 15.5 19H8a1.7 1.7 0 0 1-1.7-1.7V6.9A1.7 1.7 0 0 1 8 5.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.7 5.2v3h3" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 12.1h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 15.4h3.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

export function VaultIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v2.8a2 2 0 0 1 1.4 1.9v4.1a1.8 1.8 0 0 1-1.8 1.8H6.9a1.8 1.8 0 0 1-1.8-1.8v-4.1a2 2 0 0 1 1.4-1.9V9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9.5a3 3 0 0 1 6 0v2.6H9V9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="16.2" r="1.2" fill="currentColor" />
    </IconBase>
  );
}

export function ClockPulseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.9v4.3l2.8 1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.9 5.8l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

export function CheckSealIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.4l2 .9 2.2-.3 1.3 1.8 2 .9v2.2l1 1.9-1 1.9v2.2l-2 .9-1.3 1.8-2.2-.3-2 .9-2-.9-2.2.3-1.3-1.8-2-.9v-2.2l-1-1.9 1-1.9V7.7l2-.9L7.8 5l2.2.3 2-.9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.1 12.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function UserOrbitIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.4" r="2.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.6 18.3c1.1-2.3 3-3.5 5.4-3.5s4.3 1.2 5.4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M19.1 8.2c.9.8 1.5 1.9 1.5 3.3 0 1.3-.5 2.4-1.4 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconBase>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.4a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 0 1 0-15.2z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.9 5.2c-1 1.6-1.6 3.9-1.6 6.8s.6 5.2 1.6 6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.1 5.2c1 1.6 1.6 3.9 1.6 6.8s-.6 5.2-1.6 6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 9.4h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 14.6h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconBase>
  );
}

export function DotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
    </IconBase>
  );
}
