import { useEffect, useId, useRef, useState } from "react";
import { Check, ImagePlus, Search, Trash2, Upload } from "lucide-react";
import { api } from "../api/client";
import type { OpenFactsCandidateResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { ProductImage } from "./ProductImage";
import styles from "./ProductImagePicker.module.css";

export type ProductImageSelection =
  | { kind: "unchanged" }
  | { kind: "upload"; file: File }
  | { kind: "open_facts"; barcode: string }
  | { kind: "remove" };

interface ProductImagePickerProps {
  productName: string;
  barcode: string;
  onBarcodeChange: (barcode: string) => void;
  selection: ProductImageSelection;
  onSelectionChange: (selection: ProductImageSelection) => void;
  currentImagePath?: string | null;
  currentImageSource?: string | null;
  currentImageAttribution?: string | null;
  disabled?: boolean;
}

function normalizeBarcodeInput(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function ProductImagePicker({
  productName,
  barcode,
  onBarcodeChange,
  selection,
  onSelectionChange,
  currentImagePath,
  currentImageSource,
  currentImageAttribution,
  disabled = false,
}: ProductImagePickerProps) {
  const uploadId = useId();
  const previewUrlRef = useRef<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<OpenFactsCandidateResponse | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleBarcodeChange(value: string) {
    onBarcodeChange(value);
    setCandidate(null);
    setLookupError("");
    if (selection.kind === "open_facts") onSelectionChange({ kind: "unchanged" });
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = URL.createObjectURL(file);
    previewUrlRef.current = nextPreview;
    setUploadPreview(nextPreview);
    setCandidate(null);
    setLookupError("");
    onSelectionChange({ kind: "upload", file });
  }

  async function handleLookup() {
    const normalizedBarcode = normalizeBarcodeInput(barcode);
    if (normalizedBarcode.length < 8 || normalizedBarcode.length > 14 || !/^\d+$/.test(normalizedBarcode)) {
      setLookupError("Informe um código de barras válido, com 8 a 14 dígitos.");
      return;
    }

    try {
      setIsLookingUp(true);
      setLookupError("");
      const response = await api.get<OpenFactsCandidateResponse>(
        "/product-images/open-facts",
        { params: { barcode: normalizedBarcode } },
      );
      setCandidate(response.data);
      onBarcodeChange(normalizedBarcode);
      if (!response.data.found) {
        setLookupError("Produto não localizado no catálogo. Você ainda pode enviar uma foto própria.");
      } else if (!response.data.has_image) {
        setLookupError("Produto localizado, mas sem foto disponível. Envie uma imagem própria.");
      }
    } catch (error) {
      setCandidate(null);
      setLookupError(getApiErrorMessage(error, "Não foi possível consultar o catálogo agora."));
    } finally {
      setIsLookingUp(false);
    }
  }

  const displayedImage =
    selection.kind === "upload"
      ? uploadPreview
      : selection.kind === "open_facts"
        ? candidate?.image_url
        : selection.kind === "remove"
          ? null
          : currentImagePath;
  const displayedName = candidate?.product_name || productName || "produto";

  return (
    <section className={styles.picker} aria-labelledby={`${uploadId}-title`}>
      <header className={styles.header}>
        <div>
          <h3 id={`${uploadId}-title`}>Imagem do produto</h3>
        </div>
        <ProductImage name={displayedName} src={displayedImage} size="detail" eager />
      </header>

      <div className={styles.options}>
        <div className={`${styles.option} ${selection.kind === "upload" ? styles.selected : ""}`}>
          <span className={styles.optionIcon}><Upload aria-hidden="true" /></span>
          <div>
            <strong>Enviar foto própria</strong>
            <p>JPEG, PNG ou WebP · até 5 MB.</p>
          </div>
          <label className={styles.uploadButton} htmlFor={uploadId}>
            <ImagePlus aria-hidden="true" /> Escolher imagem
          </label>
          <input
            id={uploadId}
            className={styles.hiddenInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={disabled}
          />
          {selection.kind === "upload" ? (
            <span className={styles.selectionNote}><Check aria-hidden="true" /> {selection.file.name}</span>
          ) : null}
        </div>

        <div className={`${styles.option} ${selection.kind === "open_facts" ? styles.selected : ""}`}>
          <span className={styles.optionIcon}><Search aria-hidden="true" /></span>
          <div>
            <strong>Buscar pelo código de barras</strong>
            <p>Consulta manual ao Open Facts.</p>
          </div>
          <div className={styles.barcodeRow}>
            <label>
              <span>Código EAN/GTIN</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={barcode}
                onChange={(event) => handleBarcodeChange(event.target.value)}
                disabled={disabled}
              />
            </label>
            <button type="button" onClick={handleLookup} disabled={disabled || isLookingUp}>
              {isLookingUp ? "Consultando…" : "Consultar"}
            </button>
          </div>

          {candidate?.found && candidate.has_image && candidate.image_url ? (
            <div className={styles.candidate}>
              <ProductImage name={displayedName} src={candidate.image_url} size="card" />
              <div>
                <strong>{candidate.product_name || "Produto localizado"}</strong>
                <span>{[candidate.brands, candidate.quantity].filter(Boolean).join(" · ")}</span>
                <small>{candidate.attribution}</small>
              </div>
              <button
                type="button"
                onClick={() => onSelectionChange({ kind: "open_facts", barcode: candidate.barcode })}
                disabled={disabled || selection.kind === "open_facts"}
              >
                {selection.kind === "open_facts" ? <Check aria-hidden="true" /> : null}
                {selection.kind === "open_facts" ? "Selecionada" : "Usar esta foto"}
              </button>
            </div>
          ) : null}
          {lookupError ? <p className={styles.lookupError} role="status">{lookupError}</p> : null}
        </div>
      </div>

      {currentImagePath && selection.kind !== "remove" ? (
        <footer className={styles.currentMeta}>
          <span>
            Imagem atual: {currentImageSource === "open_facts" ? "catálogo Open Facts" : "envio da organização"}
            {currentImageAttribution ? ` · ${currentImageAttribution}` : ""}
          </span>
          <button type="button" onClick={() => onSelectionChange({ kind: "remove" })} disabled={disabled}>
            <Trash2 aria-hidden="true" /> Remover imagem
          </button>
        </footer>
      ) : selection.kind === "remove" ? (
        <footer className={styles.removeNotice}>
          <span>A imagem atual será removida ao salvar.</span>
          <button type="button" onClick={() => onSelectionChange({ kind: "unchanged" })}>Desfazer</button>
        </footer>
      ) : null}
    </section>
  );
}
