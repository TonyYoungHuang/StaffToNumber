import { AuthShell } from "../../components/AuthShell";
import { AuthForm } from "../../components/AuthForm";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="Sign in to your converter account so you can manage activation, upload staff PDFs, and review job output.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
