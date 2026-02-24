import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-5%_-10%,_rgba(2,132,199,0.12),_transparent_55%),radial-gradient(1000px_500px_at_110%_-20%,_rgba(56,189,248,0.12),_transparent_58%),var(--background)]">
      {children}
    </div>
  );
}
