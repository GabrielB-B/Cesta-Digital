import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { FamilyForm } from "../features/families/FamilyForm";
import { createFamilyDefaultValues } from "../features/families/familyFormModel";
import type {
  FamilyCreatePayload,
  FamilyListItemResponse,
} from "../types/family";

/** Cadastro inicial de família com payload preservado. */
export function FamilyCreatePage() {
  const navigate = useNavigate();

  async function createFamily(payload: FamilyCreatePayload) {
    const response = await api.post<FamilyListItemResponse>("/families", payload);

    navigate(`/families/${response.data.id}`, {
      state: {
        flash: {
          type: "success",
          message: "Família cadastrada com sucesso.",
        },
      },
    });
  }

  return (
    <FamilyForm
      mode="create"
      defaultValues={createFamilyDefaultValues}
      cancelTo="/families"
      onSubmit={createFamily}
    />
  );
}
