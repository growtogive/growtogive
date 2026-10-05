// app/(fullscreen)/layout.tsx
export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notice: No Navbar or Header component is here! */}
      {children}
    </div>
  );
}