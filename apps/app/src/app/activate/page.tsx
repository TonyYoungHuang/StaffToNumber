import { AuthShell } from "../../components/AuthShell";
import { ActivationForm } from "../../components/ActivationForm";

export default function ActivatePage() {
  return (
    <AuthShell
      title="Redeem activation code"
      description="Enter the code from your purchase to activate the current studio workflow for one year of use."
    >
      <ActivationForm />
    </AuthShell>
  );
}
