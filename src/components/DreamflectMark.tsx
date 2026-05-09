export function DreamflectMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 15 A9 9 0 0 1 25 15 Z" fill="currentColor" />
      <path d="M7 17 A9 9 0 0 0 25 17 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
