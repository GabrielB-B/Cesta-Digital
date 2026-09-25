import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  PersonForm,
  PersonFormError,
  PersonFormLoading,
} from "../features/families/PersonForm";
import {
  personToFormValues,
  type PersonFormValues,
} from "../features/families/personFormModel";
import type { FamilyDetailResponse, FamilyPersonUpdatePayload } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";

interface LoadedMember {
  values: PersonFormValues;
  familyCode: string;
}

export function FamilyPersonEditPage() {
  const navigate = useNavigate();
  const { familyId, personId } = useParams();
  const [member, setMember] = useState<LoadedMember | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMember() {
      if (!familyId || !personId) {
        if (active) setLoadError("Membro ou família não identificados.");
        return;
      }

      try {
        setLoadError("");
        const response = await api.get<FamilyDetailResponse>(`/families/${familyId}`);
        if (!active) return;
        const person = response.data.people.find((item) => String(item.id) === personId);
        if (!person) {
          setLoadError("Este membro não foi encontrado na família.");
          return;
        }
        setMember({
          values: personToFormValues(person),
          familyCode: response.data.internal_code,
        });
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error, "Não foi possível carregar o membro."));
      }
    }

    void loadMember();
    return () => { active = false; };
  }, [familyId, personId]);

  if (loadError) {
    return <PersonFormError message={loadError} backTo={familyId ? `/families/${familyId}` : "/families"} />;
  }

  if (!member) return <PersonFormLoading />;

  async function updateMember(payload: FamilyPersonUpdatePayload) {
    await api.put(`/people/${personId}`, payload);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Membro da família atualizado com sucesso." } },
    });
  }

  async function deleteMember() {
    await api.delete(`/people/${personId}`);
    navigate(`/families/${familyId}`, {
      state: { flash: { type: "success", message: "Membro da família excluído com sucesso." } },
    });
  }

  return (
    <PersonForm
      mode="edit"
      familyId={familyId ?? ""}
      familyCode={member.familyCode}
      defaultValues={member.values}
      onSave={updateMember}
      onDelete={deleteMember}
    />
  );
}
