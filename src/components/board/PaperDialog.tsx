"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Tape } from "./art/Tape";

interface Props {
  open: boolean;
  /** Called when the dialog closes, by Done, Esc or the caller: the caller sets `open` false. */
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** A sheet of poster paper taped over the board, for a choice made without leaving the board (user, 2026-11-01:
 *  editing follows sent people back to the first-time screen). A native dialog: Esc closes it, focus stays inside,
 *  and the board behind is inert while it is open. */
export function PaperDialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(92vw,36rem)] overflow-visible border-2 border-bh-navy bg-bh-off p-0 font-bh text-bh-navy shadow-[-14px_22px_30px_-12px_rgb(10_10_40/0.6)] backdrop:bg-bh-navy/60 open:-rotate-[0.4deg]"
    >
      <Tape className="-top-3 -left-6 -rotate-[38deg]" />
      <Tape className="-top-3 -right-6 rotate-[38deg]" />
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-extrabold tracking-[-0.02em]">{title}</h2>
          <button type="button" onClick={() => ref.current?.close()} className="bh-keycap min-h-11 border-2 border-bh-navy bg-bh-mustard px-4 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy">
            Done
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
