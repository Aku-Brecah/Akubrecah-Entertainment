interface PageBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function PageBackground({ children, className = "" }: PageBackgroundProps) {
  return (
    <div className={`min-h-screen bg-surface pt-20 pb-12 ${className}`}>
      {children}
    </div>
  );
}
