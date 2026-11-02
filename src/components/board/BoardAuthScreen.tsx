import type { ReactNode } from "react";
import { boardFontClass } from "@/app/board/fonts";
import { BOARD_IDS } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";
import { Tape } from "./art/Tape";
import "@/app/board/board.css";

const INTRO = "The leaderboards builders check every day, on one board that moves on its own.";

/** Sign in and sign up for the board: the poster's cobalt wall, one taped sheet with the title, the six boards' signs
 *  and Clerk's form (user, 2026-11-01: the Nudge sign-in did not fit). No navigation until you are in. */
export function BoardAuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className={`${boardFontClass} flex flex-1 flex-col bg-bh-cobalt px-4 py-8 font-bh text-bh-navy sm:py-14`}>
      <main id="main" className="relative mx-auto w-full max-w-md -rotate-[0.6deg] bg-bh-off p-6 shadow-[-18px_30px_34px_-14px_rgb(10_10_40/0.6)] sm:p-8">
        <Tape className="-top-3 -left-6 -rotate-[38deg]" />
        <Tape className="-top-3 -right-6 rotate-[38deg]" />
        <h1 className="font-bh-condensed text-5xl leading-[0.9] font-black uppercase tracking-[-0.01em]">
          Builder&apos;s
          <br />
          Board
        </h1>
        <p className="mt-3 max-w-xs font-bh-mono text-[11px] leading-relaxed text-bh-muted">{INTRO}</p>
        <ul aria-hidden className="mt-4 flex gap-2">
          {BOARD_IDS.map((id) => (
            <li key={id}>
              <BoardIcon board={id} size={28} className="block size-7 border-2 border-bh-navy" />
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t-2 border-bh-navy pt-4">{children}</div>
      </main>
    </div>
  );
}
