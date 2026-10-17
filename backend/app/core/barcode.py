import re


BARCODE_DIGIT_PATTERN = re.compile(r"^\d{8,14}$")


def normalize_barcode(value: str | None) -> str | None:
    """Normaliza GTIN/EAN/UPC sem inventar ou corrigir digitos do produto."""
    if value is None:
        return None

    normalized = value.strip().replace(" ", "").replace("-", "")
    if not normalized:
        return None
    if BARCODE_DIGIT_PATTERN.fullmatch(normalized) is None:
        raise ValueError("O codigo de barras deve conter entre 8 e 14 digitos.")
    return normalized
