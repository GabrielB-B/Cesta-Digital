type FamilyContactIdentity = {
  contact_name?: string | null;
  contact_type?: string | null;
};

type FamilyPersonIdentity = {
  full_name?: string | null;
  is_family_responsible?: boolean;
};

export type FamilyIdentitySource = {
  responsible_name?: string | null;
  contacts?: FamilyContactIdentity[];
  people?: FamilyPersonIdentity[];
  neighborhood?: string | null;
};

const NAME_PARTICLES = new Set(["da", "das", "de", "do", "dos", "e"]);
const NAME_SUFFIXES = new Set(["filho", "filha", "júnior", "junior", "neto", "neta", "sobrinho", "sobrinha"]);

function getResponsibleName(source: FamilyIdentitySource): string | null {
  const explicitName = source.responsible_name?.trim();
  if (explicitName) return explicitName;

  const responsiblePerson = source.people?.find(
    (person) => person.is_family_responsible && person.full_name?.trim(),
  );
  if (responsiblePerson?.full_name?.trim()) return responsiblePerson.full_name.trim();

  const primaryContact = source.contacts?.find(
    (contact) => contact.contact_type === "principal" && contact.contact_name?.trim(),
  );
  if (primaryContact?.contact_name?.trim()) return primaryContact.contact_name.trim();

  const firstNamedContact = source.contacts?.find((contact) => contact.contact_name?.trim());
  return firstNamedContact?.contact_name?.trim() || null;
}

function getFamilySurname(fullName: string): string | null {
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return null;

  const lastPart = nameParts.at(-1)!;
  if (NAME_SUFFIXES.has(lastPart.toLocaleLowerCase("pt-BR")) && nameParts.length > 1) {
    const previousPart = [...nameParts]
      .slice(0, -1)
      .reverse()
      .find((part) => !NAME_PARTICLES.has(part.toLocaleLowerCase("pt-BR")));
    return previousPart ? `${previousPart} ${lastPart}` : lastPart;
  }

  return NAME_PARTICLES.has(lastPart.toLocaleLowerCase("pt-BR"))
    ? [...nameParts]
        .reverse()
        .find((part) => !NAME_PARTICLES.has(part.toLocaleLowerCase("pt-BR"))) ?? null
    : lastPart;
}

export function getFamilyDisplayName(source: FamilyIdentitySource): string {
  const responsibleName = getResponsibleName(source);
  const familySurname = responsibleName ? getFamilySurname(responsibleName) : null;

  if (familySurname) return `Família ${familySurname}`;
  if (source.neighborhood?.trim()) return `Família em ${source.neighborhood.trim()}`;
  return "Família cadastrada";
}
