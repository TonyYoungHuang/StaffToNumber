import { AuthShell } from "../../components/AuthShell";
import { ActivationForm } from "../../components/ActivationForm";

export default function ActivatePage() {
  return (
    <AuthShell
      title="Redeem activation code"
      description="Enter the code from your purchase. The current development seed code grants one year of access."
    >
      <ActivationForm />
    </AuthShell>
  );
}
