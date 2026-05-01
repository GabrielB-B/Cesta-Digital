export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return "Nao informado";
  }

  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(year, month - 1, day)
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTodayForInput(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
