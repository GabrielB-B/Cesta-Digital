import { useEffect } from "react";

const UNSAVED_CHANGES_MESSAGE =
  "Existem dados preenchidos que ainda nao foram salvos. Deseja sair mesmo assim?";

export function useUnsavedChangesWarning(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);
}

export function confirmDiscardUnsavedChanges(enabled: boolean): boolean {
  if (!enabled) {
    return true;
  }

  return window.confirm(UNSAVED_CHANGES_MESSAGE);
}

