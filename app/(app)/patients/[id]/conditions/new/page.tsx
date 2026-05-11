import { SubFormHeader } from "../../_components/SubFormHeader";
import { ConditionForm } from "./ConditionForm";

export const runtime = "edge";

export default async function NewConditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <SubFormHeader
        patientId={id}
        backLabel="conditions"
        title="Add condition"
        description="Posts a FHIR Condition with the patient set as subject."
      />
      <ConditionForm patientId={id} />
    </div>
  );
}
