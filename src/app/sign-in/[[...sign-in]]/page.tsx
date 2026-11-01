import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { BoardAuthScreen } from "@/components/board/BoardAuthScreen";
import { boardClerkAppearance } from "@/lib/board/clerkAppearance";

export const metadata: Metadata = { title: "Sign in · Builder's Board" };

export default function SignInPage() {
  return (
    <BoardAuthScreen>
      <SignIn appearance={boardClerkAppearance} />
    </BoardAuthScreen>
  );
}
