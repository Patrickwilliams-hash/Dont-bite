export function RedFlagHighlight({ flags }: { flags: string[] }) {
  return (
    <ul className="space-y-3">
      {flags.map((flag) => (
        <li
          key={flag}
          className="flex gap-3 items-start rounded-xl bg-coral/10 border border-coral/20 p-4"
        >
          <span className="text-coral font-black text-lg shrink-0">!</span>
          <span className="text-navy/80 leading-relaxed">{flag}</span>
        </li>
      ))}
    </ul>
  );
}
