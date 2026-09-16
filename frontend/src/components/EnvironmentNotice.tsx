interface EnvironmentNoticeProps {
  compact?: boolean;
  className?: string;
}

interface EnvironmentMessage {
  title: string;
  description: string;
}

function getEnvironmentMessage(): EnvironmentMessage | null {
  const environment = String(import.meta.env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase();

  if (environment === "production") {
    return null;
  }

  if (environment === "development" || environment === "local") {
    return {
      title: "Ambiente de desenvolvimento",
      description: "Use apenas dados fictícios ou anonimizados.",
    };
  }

  if (environment === "staging") {
    return {
      title: "Ambiente de staging",
      description: "Use apenas dados fictícios ou anonimizados.",
    };
  }

  // Ausência ou valor desconhecido falham para o modo mais seguro.
  return {
    title: "Ambiente de homologação",
    description: "Use apenas dados fictícios ou anonimizados.",
  };
}

export function EnvironmentNotice({
  compact = false,
  className,
}: EnvironmentNoticeProps) {
  const message = getEnvironmentMessage();

  if (!message) {
    return null;
  }

  return (
    <div
      className={[
        styles.notice,
        compact ? styles.compact : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="note"
      aria-label="Aviso do ambiente"
    >
      <strong>{message.title}</strong>
      <span>{message.description}</span>
    </div>
  );
}
import styles from "./EnvironmentNotice.module.css";
