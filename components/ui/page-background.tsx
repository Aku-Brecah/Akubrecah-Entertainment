interface PageBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function PageBackground({ children, className = "" }: PageBackgroundProps) {
  return (
    <div className={`relative min-h-screen bg-[#FDFCF8] dark:bg-surface pt-24 pb-16 overflow-hidden ${className}`}>
      {/* Softly Ambient Floating Blurred Blobs (#FFE4E1 and #E6E6FA at 60% opacity) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-16 -left-24 w-[420px] h-[420px] rounded-full bg-[#FFE4E1] opacity-60 blur-[100px] animate-float-blob z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-[#E6E6FA] opacity-60 blur-[110px] animate-float-blob [animation-delay:3s] z-0"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
