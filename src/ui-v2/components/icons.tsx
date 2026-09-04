import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps & { children: React.ReactNode }) {
  const { children, ...svgProps } = props;
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...svgProps}>{children}</svg>;
}

export function SearchIcon(props: IconProps) { return <BaseIcon {...props}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></BaseIcon>; }
export function BellIcon(props: IconProps) { return <BaseIcon {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></BaseIcon>; }
export function PlusIcon(props: IconProps) { return <BaseIcon {...props}><path d="M12 5v14M5 12h14" /></BaseIcon>; }
export function CheckIcon(props: IconProps) { return <BaseIcon {...props}><path d="m5 12 4 4L19 6" /></BaseIcon>; }
export function MoreIcon(props: IconProps) { return <BaseIcon {...props}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></BaseIcon>; }
export function ArrowIcon(props: IconProps) { return <BaseIcon {...props}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></BaseIcon>; }
export function WalletIcon(props: IconProps) { return <BaseIcon {...props}><path d="M4 7h15v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" /><path d="M14 11h7v4h-7a2 2 0 1 1 0-4Z" /></BaseIcon>; }
export function BriefcaseIcon(props: IconProps) { return <BaseIcon {...props}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></BaseIcon>; }
export function UserIcon(props: IconProps) { return <BaseIcon {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></BaseIcon>; }
