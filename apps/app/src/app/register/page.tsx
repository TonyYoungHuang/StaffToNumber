import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Create an account with your email and password, then redeem an activation code to unlock one year of access."
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
