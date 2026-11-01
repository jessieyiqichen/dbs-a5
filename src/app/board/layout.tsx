import { boardFontClass } from "./fonts";
import "./board.css";

export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return <div className={`${boardFontClass} flex flex-1 flex-col`}>{children}</div>;
}
