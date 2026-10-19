NAME_PARTICLES = {"da", "das", "de", "do", "dos", "e"}
NAME_SUFFIXES = {
    "filho",
    "filha",
    "júnior",
    "junior",
    "neto",
    "neta",
    "sobrinho",
    "sobrinha",
}


def family_display_name(responsible_name: str | None, neighborhood: str) -> str:
    """Monta um identificador humano sem expor o código interno da família."""
    name_parts = (responsible_name or "").strip().split()
    if name_parts:
        last_part = name_parts[-1]
        if last_part.casefold() in NAME_SUFFIXES and len(name_parts) > 1:
            previous_part = next(
                (
                    part
                    for part in reversed(name_parts[:-1])
                    if part.casefold() not in NAME_PARTICLES
                ),
                None,
            )
            surname = f"{previous_part} {last_part}" if previous_part else last_part
        else:
            surname = next(
                (
                    part
                    for part in reversed(name_parts)
                    if part.casefold() not in NAME_PARTICLES
                ),
                last_part,
            )
        return f"Família {surname}"

    return f"Família em {neighborhood}"
