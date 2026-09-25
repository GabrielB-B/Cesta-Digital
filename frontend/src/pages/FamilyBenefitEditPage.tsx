import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { BenefitForm, BenefitFormError, BenefitFormLoading } from "../features/families/BenefitForm";
import { benefitToFormValues, type BenefitFormValues } from "../features/families/benefitFormModel";
import type { FamilyBenefitUpdatePayload, FamilyDetailResponse, FamilyPersonResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";

interface LoadedBenefit {
  familyCode: string;
  people: FamilyPersonResponse[];
  values: BenefitFormValues;
}

export function FamilyBenefitEditPage() {
  const navigate = useNavigate();
  const { familyId, benefitId } = useParams();
  const [benefit, setBenefit] = useState<LoadedBenefit | null>(null);
  const [loadError, setLoadError] = useState(
    familyId && benefitId ? "" : "Benefício ou família não identificados.",
  );

  useEffect(() => {
    if (!familyId || !benefitId) {
      return;
    }
    let active = true;
    api.get<FamilyDetailResponse>(`/families/${familyId}`)
      .then((response) => {
        if (!active) return;
        const selected = response.data.benefits.find((item) => String(item.id) === benefitId);
        if (!selected) {
          setLoadError("Este benefício não foi encontrado na família.");
          return;
        }
        setBenefit({
          familyCode: response.data.internal_code,
          people: response.data.people,
          values: benefitToFormValues(selected),
        });
      })
      .catch((error) => { if (active) setLoadError(getApiErrorMessage(error, "Não foi possível carregar o benefício.")); });
    return () => { active = false; };
  }, [familyId, benefitId]);

  if (loadError) return <BenefitFormError message={loadError} backTo={familyId ? `/families/${familyId}` : "/families"} />;
  if (!benefit) return <BenefitFormLoading />;

  async function updateBenefit(payload: FamilyBenefitUpdatePayload) {
    await api.put(`/benefits/${benefitId}`, payload);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Benefício atualizado com sucesso." } },
    });
  }

  async function deleteBenefit() {
    await api.delete(`/benefits/${benefitId}`);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Benefício excluído com sucesso." } },
    });
  }

  return (
    <BenefitForm
      mode="edit"
      familyId={familyId ?? ""}
      familyCode={benefit.familyCode}
      people={benefit.people}
      defaultValues={benefit.values}
      onSave={updateBenefit}
      onDelete={deleteBenefit}
    />
  );
}
