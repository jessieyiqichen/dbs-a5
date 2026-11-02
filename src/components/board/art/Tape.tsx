/** A strip of translucent tape holding a sheet to the wall, as on the poster, the sign-in sheet and the dialogs. */
export function Tape({ className }: { className: string }) {
  return <span aria-hidden className={`absolute z-30 h-8 w-28 bg-bh-off/70 shadow-[0_1px_2px_rgb(0_0_0/0.15)] ${className}`} />;
}
