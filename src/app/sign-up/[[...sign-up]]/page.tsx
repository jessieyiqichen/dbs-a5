import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { BoardAuthScreen } from "@/components/board/BoardAuthScreen";

export const metadata: Metadata = { title: "Sign up · Builder's Board" };

export default function SignUpPage() {
  return (
    <BoardAuthScreen>
      <SignUp />
    </BoardAuthScreen>
  );
}
