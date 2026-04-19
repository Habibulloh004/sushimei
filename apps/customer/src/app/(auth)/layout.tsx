import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6 overflow-hidden bg-gradient-to-br from-stone-50 via-stone-100 to-stone-50">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute -top-28 -left-16 w-72 h-72 rounded-full bg-gradient-to-br from-red-500/20 to-transparent blur-sm" />
        <span className="absolute -bottom-32 right-[12%] w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent blur-sm" />
        <span className="absolute top-1/3 -right-20 w-56 h-56 rounded-full bg-gradient-to-br from-stone-900/5 to-transparent blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/brand/sushimei-logo.png"
            alt="Sushi Mei logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain rounded-2xl border border-stone-200/70 bg-white p-1 shadow-lg"
            priority
          />
          <span className="text-2xl font-black tracking-tighter">SUSHI MEI</span>
        </Link>

        {/* Content card */}
        <div className="rounded-[2rem] border border-white/75 bg-white/80 backdrop-blur-xl shadow-[0_22px_60px_rgba(15,23,42,0.1)] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
