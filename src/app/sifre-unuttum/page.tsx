import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/giris?forgot=1");
}
