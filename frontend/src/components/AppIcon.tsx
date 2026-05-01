type AppIconName =
  | "dashboard"
  | "families"
  | "finance"
  | "items"
  | "categories"
  | "baskets"
  | "deliveries"
  | "audit"
  | "users"
  | "sidebarToggle"
  | "logout";

interface AppIconProps {
  name: AppIconName;
  className?: string;
}

export function AppIcon({ name, className }: AppIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "dashboard" ? (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </>
      ) : null}

      {name === "families" ? (
        <>
          <path d="M16 19a4 4 0 0 0-8 0" />
          <circle cx="12" cy="11" r="3" />
          <path d="M6.5 19a3.5 3.5 0 0 0-1.95-3.14" />
          <path d="M17.5 19a3.5 3.5 0 0 1 1.95-3.14" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </>
      ) : null}

      {name === "finance" ? (
        <>
          <path d="M4 7.5h16" />
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <circle cx="15.5" cy="12" r="2.5" />
          <path d="M7 12h1" />
        </>
      ) : null}

      {name === "items" ? (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12 4 7.5" />
          <path d="M12 12l8-4.5" />
          <path d="M12 21v-9" />
        </>
      ) : null}

      {name === "categories" ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
        </>
      ) : null}

      {name === "baskets" ? (
        <>
          <path d="M5 10h14l-1.1 8.2A2 2 0 0 1 15.92 20H8.08a2 2 0 0 1-1.98-1.8L5 10Z" />
          <path d="m9 10 3-5 3 5" />
          <path d="M9 14h.01" />
          <path d="M15 14h.01" />
        </>
      ) : null}

      {name === "deliveries" ? (
        <>
          <path d="M3 7h11v8H3Z" />
          <path d="M14 10h3l3 3v2h-6" />
          <circle cx="8" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </>
      ) : null}

      {name === "audit" ? (
        <>
          <path d="M12 3l7 3v6c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V6l7-3Z" />
          <path d="M9 11h6" />
          <path d="M9 14h4" />
        </>
      ) : null}

      {name === "users" ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 19a6 6 0 0 1 12 0" />
          <path d="M18.5 6.5h2.5" />
          <path d="M19.75 5.25v2.5" />
        </>
      ) : null}

      {name === "logout" ? (
        <>
          <path d="M10 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1" />
          <path d="M14 16l5-4-5-4" />
          <path d="M19 12H9" />
        </>
      ) : null}

      {name === "sidebarToggle" ? (
        <>
          <path d="M7 4v16" />
          <path d="m16 7-5 5 5 5" />
        </>
      ) : null}
    </svg>
  );
}
