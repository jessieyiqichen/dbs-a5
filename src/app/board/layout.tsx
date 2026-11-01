import { Barlow_Condensed, Martian_Mono, Schibsted_Grotesk } from "next/font/google";
import "./board.css";

// The board's own faces, from the A1 portfolio (v02): a heavy grotesk for names and numbers, a mono for labels.
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["400", "700", "800", "900"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], weight: ["400", "500"] });
// The section headings' condensed capitals, after Mercedes Bazan's Accessibility Hackathon poster (docs/references.md)
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["600", "700"] });

export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return <div className={`${schibsted.variable} ${martian.variable} ${barlow.variable} flex flex-1 flex-col`}>{children}</div>;
}
