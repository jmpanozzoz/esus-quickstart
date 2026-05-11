import { SubFormHeader } from "../../_components/SubFormHeader";
import { ObservationForm } from "./ObservationForm";

export const runtime = "edge";

export default async function NewObservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <SubFormHeader
        patientId={id}
        backLabel="observations"
        title="Record observation"
        description="Vital signs, labs, or any measurable observation. Picks valueQuantity when both value and unit are filled, valueString otherwise."
      />
      <ObservationForm patientId={id} />
    </div>
  );
}
