import { SubFormHeader } from "../../_components/SubFormHeader";
import { MedicationForm } from "./MedicationForm";

export const runtime = "edge";

export default async function NewMedicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <SubFormHeader
        patientId={id}
        backLabel="medications"
        title="Prescribe medication"
        description="Posts a FHIR MedicationRequest with intent=order. Free-text dosage for v1; a real EHR would code it via SNOMED / RxNorm."
      />
      <MedicationForm patientId={id} />
    </div>
  );
}
