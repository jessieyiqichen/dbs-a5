/** Clerk's sign-in and sign-up boxes in Tape & Tile (user, 2026-11-01: the Nudge sign-in did not fit the board).
 *  Clerk works out its shades from real colours, so these repeat the bh tokens in globals.css; change both together.
 *  Square corners, ink borders, a mustard keycap for the one button, the board's faces. */
const KEYCAP = "bh-keycap min-h-11 w-full border-2 border-bh-navy font-bh font-bold normal-case text-bh-navy focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy";
const LINK = "min-h-11 px-1 font-bold normal-case text-bh-cobalt underline underline-offset-4 hover:text-bh-navy focus-visible:outline-3 focus-visible:outline-bh-navy";
const INPUT = "min-h-11 border-2 border-bh-navy bg-bh-off px-3 font-bh text-base text-bh-navy placeholder:text-bh-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy aria-invalid:border-bh-red";
const ERROR_TEXT = "text-sm font-bold text-bh-red";

export const boardClerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#e2b04a", // --color-bh-mustard
    colorPrimaryForeground: "#1b1a2c", // --color-bh-navy
    colorForeground: "#1b1a2c",
    colorMutedForeground: "#5d5a52", // --color-bh-muted
    colorBackground: "#f4f1ea", // --color-bh-off: the form sits on the taped sheet
    colorInput: "#f4f1ea",
    colorInputForeground: "#1b1a2c",
    colorBorder: "#1b1a2c",
    colorDanger: "#d8503a", // --color-bh-red
    colorRing: "#1b1a2c",
    fontFamily: "var(--font-schibsted), system-ui, sans-serif",
    fontFamilyButtons: "var(--font-schibsted), system-ui, sans-serif",
    borderRadius: "0",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full overflow-visible border-0 bg-transparent shadow-none",
    card: "border-0 bg-transparent px-0 py-2 shadow-none",
    footer: "bg-none bg-transparent",
    headerTitle: "font-bh-condensed text-4xl font-black uppercase tracking-[-0.01em] text-bh-navy",
    headerSubtitle: "font-bh-mono text-[11px] text-bh-muted",
    socialButtonsBlockButton: `${KEYCAP} bg-bh-off hover:bg-bh-page`,
    formButtonPrimary: `${KEYCAP} bg-bh-mustard hover:bg-bh-mustard`,
    formFieldLabel: "font-bh-mono text-[11px] text-bh-navy",
    formFieldInput: INPUT,
    footerAction: "items-center",
    footerActionText: "font-bh-mono text-[11px] text-bh-muted",
    footerActionLink: LINK,
    dividerLine: "bg-bh-navy/30",
    dividerText: "font-bh-mono text-[11px] text-bh-muted",
    formFieldHintText: "font-bh-mono text-[11px] text-bh-muted",
    formFieldErrorText: ERROR_TEXT,
    formFieldAction: LINK,
    button: "min-h-11",
    formResendCodeLink: `${LINK} disabled:cursor-default disabled:text-bh-muted disabled:no-underline`,
    backLink: LINK,
    headerBackLink: LINK,
    formButtonReset: LINK,
    alternativeMethodsBlockButton: `${KEYCAP} bg-bh-off hover:bg-bh-page`,
    identityPreviewText: "font-bold text-bh-navy",
    identityPreviewEditButton: "min-h-11 min-w-11 justify-center text-bh-navy hover:bg-bh-page focus-visible:outline-3 focus-visible:outline-bh-navy",
    identityPreviewEditButtonIcon: "size-5",
    formFieldInputShowPasswordButton: "min-h-11 min-w-11 text-bh-muted hover:text-bh-navy focus-visible:outline-3 focus-visible:outline-bh-navy",
    otpCodeFieldInput:
      "h-14 max-h-none w-12 border-2 border-bh-navy bg-bh-off font-bh-condensed text-2xl font-bold text-bh-navy " +
      "aria-invalid:border-bh-red focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-bh-navy",
    otpCodeFieldErrorText: ERROR_TEXT,
    alertText: ERROR_TEXT,
  },
} as const;
