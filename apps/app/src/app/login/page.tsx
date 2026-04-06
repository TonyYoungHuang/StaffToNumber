import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="Sign in to your converter account and continue to the dashboard or activation page.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
