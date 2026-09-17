import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-muted flex-col items-center justify-center p-12 relative">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <Image
            src="/newgen-logo.png"
            alt="Newgen Online School Logo"
            width={80}
            height={80}
            priority
            className="h-50 w-50 object-contain"
          />
          <div>
            <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
              Newgen Online School
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Internal Management System
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        {/* Mobile branding (visible only on small screens) */}
        <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
          <Image
            src="/newgen-logo.png"
            alt="Newgen Online School Logo"
            width={56}
            height={56}
            priority
            className="h-14 w-14 object-contain"
          />
          <div className="text-center">
            <h1 className="font-heading font-bold text-lg tracking-tight text-foreground">
              Newgen Online School
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal Management System
            </p>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
