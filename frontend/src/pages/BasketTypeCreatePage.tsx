import { useState } from "react";
import { ArrowLeft, Check, ShoppingBasket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { BasketTypeCreatePayload, BasketTypeResponse } from "../types/basket";
import { getApiErrorMessage } from "../utils/api-error";
import styles from "./BasketTypeEditorPage.module.css";

export function BasketTypeCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Informe o nome do tipo de cesta.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BasketTypeCreatePayload = {
        name: name.trim(),
        is_active: isActive,
        notes: notes.trim() || null,
      };
      const response = await api.post<BasketTypeResponse>("/basket-types", payload);
      navigate(`/basket-types/${response.data.id}`, {
        state: { flash: { type: "success", message: "Cesta criada. Agora defina sua composição." } },
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Não foi possível cadastrar a cesta."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/basket-types" className={styles.backLink}><ArrowLeft aria-hidden="true" />Tipos de cesta</Link>
        <div><h1>Nova cesta</h1><p>Crie o modelo e, na próxima etapa, adicione os produtos da composição.</p></div>
      </header>

      <section className={styles.createLayout}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.cardHeading}><span className={styles.headingIcon}><ShoppingBasket aria-hidden="true" /></span><div><h2>Dados da cesta</h2><p>Use um nome claro para facilitar agendamentos e entregas.</p></div></div>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome da cesta <b>*</b></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Cesta básica mensal" maxLength={100} required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição operacional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} placeholder="Informe o propósito ou orientações desta composição." /></label>
            <label className={`${styles.switchField} ${styles.fieldWide}`}><span><strong>Disponível para operação</strong><small>Permite usar esta cesta em novos agendamentos.</small></span><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><i aria-hidden="true" /></label>
          </div>
          {error ? <div className={styles.feedbackError} role="alert">{error}</div> : null}
          <div className={styles.formActions}><Link to="/basket-types">Cancelar</Link><button type="submit" disabled={isSubmitting}><Check aria-hidden="true" />{isSubmitting ? "Criando..." : "Criar e montar composição"}</button></div>
        </form>

        <aside className={styles.guidanceCard}>
          <span className={styles.guidanceIcon}><ShoppingBasket aria-hidden="true" /></span>
          <h2>Como funciona</h2>
          <ol><li><b>1</b><span><strong>Cadastre o modelo</strong><small>Defina nome, descrição e disponibilidade.</small></span></li><li><b>2</b><span><strong>Monte a composição</strong><small>Escolha produtos e quantidades obrigatórias.</small></span></li><li><b>3</b><span><strong>Valide a capacidade</strong><small>O sistema calcula quantas cestas o estoque permite montar.</small></span></li></ol>
        </aside>
      </section>
    </div>
  );
}
