import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image
          src="/newgen-logo.png"
          alt="Newgen Online School Logo"
          width={72}
          height={72}
          priority
          className="h-16 w-16 object-contain drop-shadow-sm"
        />
        <div className="text-center">
          <h1 className="font-heading font-bold text-xl tracking-tight text-foreground">Newgen Online School</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Internal Management System</p>
        </div>
      </div>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
