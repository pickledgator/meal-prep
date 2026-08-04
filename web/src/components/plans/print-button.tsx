export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-print="hide"
      className="label inline-flex items-center gap-2 rounded-md border border-rule px-3 py-2 text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 5V1.75h6V5M4 10.5H2.5V5.5h9v5H10M4 8.75h6v3.5H4v-3.5Z"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
