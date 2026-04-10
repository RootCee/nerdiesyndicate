interface VerticalSliceStatePanelProps {
  snapshotDraft: string;
  statusMessage: string | null;
  onSnapshotDraftChange: (value: string) => void;
  onExportSnapshot: () => void;
  onRestoreSnapshot: () => void;
}

export default function VerticalSliceStatePanel({
  snapshotDraft,
  statusMessage,
  onSnapshotDraftChange,
  onExportSnapshot,
  onRestoreSnapshot,
}: VerticalSliceStatePanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            Vertical Slice State
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
            Local-only export and restore boundary for the current playable slice using the existing persistence model.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExportSnapshot}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-zinc-600 hover:text-white"
          >
            Export State
          </button>
          <button
            type="button"
            onClick={onRestoreSnapshot}
            className="rounded-xl border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-100 transition hover:border-red-700 hover:bg-red-900/50"
          >
            Restore State
          </button>
        </div>
      </div>

      {statusMessage && (
        <p className="mt-3 text-sm text-neutral-400">{statusMessage}</p>
      )}

      <textarea
        value={snapshotDraft}
        onChange={(event) => onSnapshotDraftChange(event.target.value)}
        placeholder="Exported local vertical slice state will appear here as JSON."
        className="mt-4 min-h-48 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-neutral-300"
      />
    </div>
  );
}
