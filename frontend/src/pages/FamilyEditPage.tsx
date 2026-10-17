import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  FamilyForm,
  FamilyFormError,
  FamilyFormLoading,
} from "../features/families/FamilyForm";
import {
  familyDetailToFormValues,
  getAdditionalFamilyContacts,
  type FamilyFormValues,
} from "../features/families/familyFormModel";
import { getApiErrorMessage } from "../utils/api-error";
import type {
  FamilyContactCreatePayload,
  FamilyCreatePayload,
  FamilyDetailResponse,
} from "../types/family";

interface LoadedFamilyForm {
  values: FamilyFormValues;
  additionalContacts: FamilyContactCreatePayload[];
}

/** Edição de família reutilizando o mesmo contrato visual e funcional do cadastro. */
export function FamilyEditPage() {
  const navigate = useNavigate();
  const { familyId } = useParams();
  const [loadedForm, setLoadedForm] = useState<LoadedFamilyForm | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFamily() {
      if (!familyId) {
        setLoadError("Família não identificada.");
        return;
      }

      try {
        setLoadError("");
        const response = await api.get<FamilyDetailResponse>(
          `/families/${familyId}`
        );

        if (!isMounted) {
          return;
        }

        setLoadedForm({
          values: familyDetailToFormValues(response.data),
          additionalContacts: getAdditionalFamilyContacts(response.data),
        });
      } catch (error) {
        if (isMounted) {
          setLoadError(
            getApiErrorMessage(error, "Não foi possível carregar a família.")
          );
        }
      }
    }

    void loadFamily();

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  async function updateFamily(payload: FamilyCreatePayload) {
    if (!familyId) {
      throw new Error("Família não identificada.");
    }

    const response = await api.put<FamilyDetailResponse>(
      `/families/${familyId}`,
      payload
    );

    navigate(`/families/${response.data.id}`, {
      state: {
        flash: {
          type: "success",
          message: "Cadastro da família atualizado com sucesso.",
        },
      },
    });
  }

  if (loadError) {
    return (
      <FamilyFormError
        message={loadError}
        onBack={() => navigate("/families")}
      />
    );
  }

  if (!loadedForm) {
    return <FamilyFormLoading />;
  }

  return (
    <FamilyForm
      mode="edit"
      defaultValues={loadedForm.values}
      additionalContacts={loadedForm.additionalContacts}
      cancelTo={`/families/${familyId}`}
      onSubmit={updateFamily}
    />
  );
}
