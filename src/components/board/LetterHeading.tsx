import type { ReactNode } from "react";
import { LETTER_COLORS } from "@/lib/board/look";

interface Props {
  /** The heading as read aloud ("Rising now"). */
  label: string;
  /** How it is set: each line in capitals, a hyphen where a word is broken ("RISING-", "NOW"). */
  lines: string[];
  /** Pictograms or anything else set to the right of the heading. */
  children?: ReactNode;
  id?: string;
}

/** A section heading on a navy band, in condensed capitals with every letter its own colour and words broken with a
 *  hyphen, after Mercedes Bazan's Accessibility Hackathon poster (docs/references.md). Screen readers get `label`. */
export function LetterHeading({ label, lines, children, id }: Props) {
  let n = 0;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 bg-bh-navy px-[4%] py-5">
      <h2 id={id} aria-label={label} className="font-bh-condensed text-[clamp(44px,8vw,104px)] leading-[0.84] font-bold uppercase">
        {lines.map((line) => (
          <span key={line} aria-hidden className="block">
            {[...line].map((letter, i) => (
              <span key={i} style={{ color: letter === " " ? undefined : LETTER_COLORS[n++ % LETTER_COLORS.length] }}>{letter}</span>
            ))}
          </span>
        ))}
      </h2>
      {children}
    </div>
  );
}
