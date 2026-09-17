import { uk } from '~/shared/i18n/uk';

export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-950 text-neutral-100">
      <h1 className="text-2xl font-semibold">{uk.appName}</h1>
      <p className="text-sm text-neutral-400">{uk.appTagline}</p>
    </main>
  );
}
