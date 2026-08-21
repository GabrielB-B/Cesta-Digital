import { api } from "../api/client";
import type { ProductImageSelection } from "../components/ProductImagePicker";
import type { ItemImageMetadataResponse } from "../types/item";

export async function persistProductImageSelection(
  itemId: number,
  selection: ProductImageSelection,
): Promise<ItemImageMetadataResponse | null> {
  if (selection.kind === "unchanged") return null;

  if (selection.kind === "remove") {
    await api.delete(`/items/${itemId}/image`);
    return null;
  }

  if (selection.kind === "open_facts") {
    const response = await api.post<ItemImageMetadataResponse>(
      `/items/${itemId}/image/import-open-facts`,
      { barcode: selection.barcode },
    );
    return response.data;
  }

  const formData = new FormData();
  formData.append("image", selection.file);
  const response = await api.post<ItemImageMetadataResponse>(
    `/items/${itemId}/image`,
    formData,
  );
  return response.data;
}
