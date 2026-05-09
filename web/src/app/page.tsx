import { BRAND, MESSAGES } from "@/constants";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-4xl font-bold tracking-tight">{BRAND.NAME}</h1>
      <p className="text-sm uppercase tracking-widest text-neutral-500">{BRAND.TAGLINE}</p>
      <p className="max-w-xl text-center text-neutral-400">{MESSAGES.DASHBOARD_PLACEHOLDER}</p>
    </main>
  );
}
