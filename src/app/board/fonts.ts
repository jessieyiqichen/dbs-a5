import { Barlow_Condensed, Martian_Mono, Schibsted_Grotesk } from "next/font/google";

// The board's own faces, from the A1 portfolio (v02): a heavy grotesk for names and numbers, a mono for labels.
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["400", "700", "800", "900"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], weight: ["400", "500"] });
// The section headings' condensed capitals, after Mercedes Bazan's Accessibility Hackathon poster (docs/references.md)
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["600", "700"] });

/** The class that makes the three Tape & Tile font variables available, for the board and for signing in to it. */
export const boardFontClass = `${schibsted.variable} ${martian.variable} ${barlow.variable}`;
