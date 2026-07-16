"use client";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <label
          htmlFor="page-size"
          className="text-xs font-medium text-stone-500"
        >
          Rows per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-stone-500">
        {total === 0
          ? "No entries"
          : `Showing ${firstRow}–${lastRow} of ${total}`}
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          ‹ Prev
        </PageButton>
        <span className="px-2 text-xs text-stone-500">
          Page {page} of {totalPages}
        </span>
        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          label="Next page"
        >
          Next ›
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
