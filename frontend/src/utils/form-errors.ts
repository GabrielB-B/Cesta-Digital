export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function focusFirstFieldError<T extends string>(
  errors: FieldErrors<T>
): void {
  const firstField = Object.keys(errors)[0];
  if (!firstField) {
    return;
  }

  window.requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
    field?.focus();
  });
}

