import ssl


def build_database_ssl_context(
    *,
    ssl_required: bool,
    ca_source: str | None,
) -> ssl.SSLContext | None:
    """Cria TLS fail-closed com validação do certificado e do hostname."""
    if not ssl_required:
        return None

    ssl_context = ssl.create_default_context()
    normalized_ca = ca_source.strip() if ca_source else ""
    if normalized_ca:
        if "-----BEGIN CERTIFICATE-----" in normalized_ca:
            ssl_context.load_verify_locations(cadata=normalized_ca)
        else:
            ssl_context.load_verify_locations(cafile=normalized_ca)

    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.check_hostname = True
    return ssl_context
