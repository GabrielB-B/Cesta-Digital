import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PersonForm, PersonFormError, PersonFormLoading } from "../features/families/PersonForm";
import { newPersonDefaults } from "../features/families/personFormModel";
import type { FamilyDetailResponse, FamilyPersonCreatePayload, FamilyPersonResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";

export function FamilyPersonCreatePage() {
  const navigate = useNavigate();
  const { familyId } = useParams();
  const [familyCode, setFamilyCode] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    api.get<FamilyDetailResponse>(`/families/${familyId}`)
      .then((response) => { if (active) setFamilyCode(response.data.internal_code); })
      .catch((error) => { if (active) setLoadError(getApiErrorMessage(error, "Não foi possível carregar a família.")); });
    return () => { active = false; };
  }, [familyId]);

  if (!familyId) {
    return <PersonFormError message="Família não identificada." backTo="/families" />;
  }
  if (loadError) return <PersonFormError message={loadError} backTo={`/families/${familyId}`} />;
  if (!familyCode) return <PersonFormLoading />;

  async function createPerson(payload: FamilyPersonCreatePayload) {
    await api.post<FamilyPersonResponse>(`/families/${familyId}/people`, payload);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Membro da família cadastrado com sucesso." } },
    });
  }

  return (
    <PersonForm
      mode="create"
      familyId={familyId}
      familyCode={familyCode}
      defaultValues={newPersonDefaults}
      onSave={createPerson}
    />
  );
}
