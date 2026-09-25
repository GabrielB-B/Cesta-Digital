import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { BenefitForm, BenefitFormError, BenefitFormLoading } from "../features/families/BenefitForm";
import { newBenefitDefaults } from "../features/families/benefitFormModel";
import type { FamilyBenefitCreatePayload, FamilyBenefitResponse, FamilyDetailResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";

export function FamilyBenefitCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();
  const [family, setFamily] = useState<FamilyDetailResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    api.get<FamilyDetailResponse>(`/families/${familyId}`)
      .then((response) => { if (active) setFamily(response.data); })
      .catch((error) => { if (active) setLoadError(getApiErrorMessage(error, "Não foi possível carregar a família.")); });
    return () => { active = false; };
  }, [familyId]);

  if (!familyId) return <BenefitFormError message="Família não identificada." backTo="/families" />;
  if (loadError) return <BenefitFormError message={loadError} backTo={`/families/${familyId}`} />;
  if (!family) return <BenefitFormLoading />;

  async function createBenefit(payload: FamilyBenefitCreatePayload) {
    await api.post<FamilyBenefitResponse>(`/families/${familyId}/benefits`, payload);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Benefício cadastrado com sucesso." } },
    });
  }

  return (
    <BenefitForm
      mode="create"
      familyId={familyId}
      familyCode={family.internal_code}
      people={family.people}
      defaultValues={newBenefitDefaults}
      onSave={createBenefit}
    />
  );
}
