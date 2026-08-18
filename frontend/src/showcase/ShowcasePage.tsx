import { useCallback, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Truck,
  UsersRound,
} from "lucide-react";
import { Button } from "../shared/ui/Button";
import { Drawer } from "../shared/ui/Drawer";
import {
  BottomNavigation,
  SideNavigation,
  type NavigationItem,
} from "../shared/ui/Navigation";
import { PageHeader } from "../shared/ui/PageHeader";
import {
  DataTable,
  MobileList,
  type DataColumn,
} from "../shared/ui/ResponsiveCollection";
import { StatusBadge, type StatusTone } from "../shared/ui/StatusBadge";
import { Surface } from "../shared/ui/Surface";
import { TextField } from "../shared/ui/TextField";
import styles from "./ShowcasePage.module.css";

interface ServiceQueueItem {
  id: string;
  family: string;
  neighborhood: string;
  stage: string;
  tone: StatusTone;
  update: string;
}

type PreviewView = "overview" | "families" | "stock" | "deliveries";
type ModuleView = Exclude<PreviewView, "overview">;

interface ModulePreviewConfig {
  eyebrow: string;
  title: string;
  description: string;
  scopeTitle: string;
  scopeDescription: string;
  icon: ReactNode;
  groups: Array<{
    title: string;
    items: string[];
  }>;
}

const navigationDefinitions: Array<Omit<NavigationItem, "current" | "onSelect"> & { id: PreviewView }> = [
  {
    id: "overview",
    label: "Visão geral",
    href: "#visao-geral",
    icon: <LayoutDashboard />,
  },
  { id: "families", label: "Famílias", href: "#familias", icon: <UsersRound /> },
  { id: "stock", label: "Estoque", href: "#estoque", icon: <Package /> },
  { id: "deliveries", label: "Entregas", href: "#entregas", icon: <Truck /> },
];

const modulePreviewConfig: Record<ModuleView, ModulePreviewConfig> = {
  families: {
    eyebrow: "Prévia de navegação · futura etapa V2-06",
    title: "Famílias",
    description: "Cadastro, composição familiar e acompanhamento social no mesmo contexto.",
    scopeTitle: "O que pertence a esta área",
    scopeDescription:
      "Dados das pessoas atendidas e sua trajetória social. Informações de estoque não aparecem aqui.",
    icon: <UsersRound aria-hidden="true" />,
    groups: [
      {
        title: "Cadastro e composição",
        items: ["Responsável e membros", "Endereço e território", "Renda e vínculos"],
      },
      {
        title: "Proteção social",
        items: ["Avaliações", "Benefícios", "Situação de acompanhamento"],
      },
    ],
  },
  stock: {
    eyebrow: "Prévia de navegação · futura etapa V2-08",
    title: "Estoque",
    description:
      "Controle de alimentos, itens de higiene, limpeza e outros produtos recebidos por doação.",
    scopeTitle: "Alimentos, higiene e itens essenciais",
    scopeDescription:
      "Esta área trata somente dos produtos armazenados. Cadastros de famílias e pessoas não pertencem ao estoque.",
    icon: <Package aria-hidden="true" />,
    groups: [
      {
        title: "Produtos e categorias",
        items: ["Alimentos", "Higiene pessoal", "Limpeza e outros essenciais"],
      },
      {
        title: "Controle físico",
        items: ["Unidade e quantidade", "Lote e validade", "Entradas, saídas e descarte"],
      },
    ],
  },
  deliveries: {
    eyebrow: "Prévia de navegação · futura etapa V2-09",
    title: "Entregas",
    description: "Planejamento, separação e confirmação das cestas destinadas às famílias.",
    scopeTitle: "Distribuição com rastreabilidade",
    scopeDescription:
      "A entrega conecta uma família apta aos itens e lotes efetivamente distribuídos, sem misturar seus cadastros.",
    icon: <Truck aria-hidden="true" />,
    groups: [
      {
        title: "Planejamento",
        items: ["Tipos de cesta", "Agendamentos", "Disponibilidade de estoque"],
      },
      {
        title: "Execução",
        items: ["Confirmação da entrega", "Itens e lotes entregues", "Histórico por família"],
      },
    ],
  },
};

const queueItems: ServiceQueueItem[] = [
  {
    id: "CD-2048",
    family: "Família de Ana Souza",
    neighborhood: "Jardim Aurora",
    stage: "Apta para entrega",
    tone: "success",
    update: "Hoje, 09:42",
  },
  {
    id: "CD-2041",
    family: "Família de José Lima",
    neighborhood: "Vila Esperança",
    stage: "Avaliação pendente",
    tone: "warning",
    update: "Ontem, 16:18",
  },
  {
    id: "CD-2037",
    family: "Família de Maria Alves",
    neighborhood: "Parque Novo",
    stage: "Cadastro incompleto",
    tone: "danger",
    update: "Ontem, 11:05",
  },
  {
    id: "CD-2029",
    family: "Família de Carlos Dias",
    neighborhood: "Centro",
    stage: "Em acompanhamento",
    tone: "info",
    update: "16 ago, 14:31",
  },
];

const columns: DataColumn<ServiceQueueItem>[] = [
  {
    key: "family",
    header: "Família",
    render: (item) => (
      <div className={styles.familyCell}>
        <strong>{item.family}</strong>
        <span>{item.id}</span>
      </div>
    ),
  },
  {
    key: "neighborhood",
    header: "Território",
    render: (item) => item.neighborhood,
  },
  {
    key: "stage",
    header: "Situação",
    render: (item) => <StatusBadge tone={item.tone}>{item.stage}</StatusBadge>,
  },
  {
    key: "update",
    header: "Atualização",
    align: "end",
    render: (item) => item.update,
  },
];

function ModulePreview({ view, onBack }: { view: ModuleView; onBack: () => void }) {
  const config = modulePreviewConfig[view];

  return (
    <>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
      />
      <Surface className={styles.modulePreview} padding="none">
        <div className={styles.previewNotice}>
          <StatusBadge tone="info">Showcase isolado</StatusBadge>
          <p>
            A navegação está sendo validada agora; a tela operacional será migrada somente
            na etapa indicada acima.
          </p>
        </div>
        <div className={styles.moduleIntro}>
          <span className={styles.moduleIcon}>{config.icon}</span>
          <div>
            <h2>{config.scopeTitle}</h2>
            <p>{config.scopeDescription}</p>
          </div>
        </div>
        <div className={styles.domainGrid}>
          {config.groups.map((group) => (
            <section className={styles.domainGroup} key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>
                    <ClipboardCheck aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className={styles.previewFooter}>
          <p>Nenhuma rota, dado ou regra de negócio foi alterada nesta prévia.</p>
          <Button onClick={onBack} variant="neutral">
            Voltar à visão geral
          </Button>
        </div>
      </Surface>
    </>
  );
}

export function ShowcasePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<PreviewView>("overview");
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const selectView = useCallback((view: PreviewView) => {
    setActiveView(view);
    const target = navigationDefinitions.find((item) => item.id === view);
    if (target) window.history.replaceState(null, "", target.href);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const navigationItems: NavigationItem[] = navigationDefinitions.map((item) => ({
    ...item,
    current: item.id === activeView,
    onSelect: () => selectView(item.id),
  }));

  const activeLabel =
    navigationDefinitions.find((item) => item.id === activeView)?.label ?? "Visão geral";

  return (
    <div className={styles.shell} id="visao-geral">
      <SideNavigation items={navigationItems} onBrandSelect={() => selectView("overview")} />
      <header className={styles.topbar}>
        <div className={styles.mobileBrand}>
          <img src="/brand/cesta-digital-symbol.png" alt="" />
          <strong>Cesta Digital</strong>
        </div>
        <div className={styles.breadcrumbs} aria-label="Localização">
          <span>Operação</span>
          <ChevronRight size={14} aria-hidden="true" />
          <strong>{activeLabel}</strong>
        </div>
        <div className={styles.topbarActions}>
          <button className={styles.iconButton} aria-label="Notificações">
            <Bell size={18} aria-hidden="true" />
            <span className={styles.notificationDot} aria-hidden="true" />
          </button>
          <div className={styles.accountPreview} aria-label="Conta de Marina Lima" role="group">
            <span className={styles.accountAvatar} aria-hidden="true">ML</span>
            <span>
              <strong>Marina Lima</strong>
              <small>Líder social</small>
            </span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          {activeView === "overview" ? (
            <>
              <PageHeader
            eyebrow="Frontend V2 · Fundação"
            title="Visão geral da operação"
            description="Uma base mais clara, humana e eficiente para quem coordena o atendimento todos os dias."
            actions={
              <Button
                leadingIcon={<Plus size={17} aria-hidden="true" />}
                onClick={() => setDrawerOpen(true)}
                variant="primary"
              >
                Novo atendimento
              </Button>
            }
          />

          <section className={styles.metrics} aria-label="Resumo operacional">
            <div className={styles.metric}>
              <span>Famílias ativas</span>
              <strong>1.248</strong>
              <small className={styles.positive}>+32 neste mês</small>
            </div>
            <div className={styles.metric}>
              <span>Entregas previstas</span>
              <strong>186</strong>
              <small>Próximos 7 dias</small>
            </div>
            <div className={styles.metric}>
              <span>Itens em atenção</span>
              <strong>14</strong>
              <small className={styles.warningText}>4 com estoque crítico</small>
            </div>
            <div className={styles.metric}>
              <span>Valor distribuído</span>
              <strong>R$ 42,8 mil</strong>
              <small>Agosto de 2026</small>
            </div>
          </section>

          <div className={styles.layoutGrid}>
            <div className={styles.primaryColumn}>
              <Surface className={styles.queueSurface} padding="none" id="atendimentos">
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>Atendimentos recentes</h2>
                    <p>Prioridades da equipe social, ordenadas por atualização.</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Ver todos
                  </Button>
                </div>
                <DataTable
                  caption="Atendimentos sociais recentes"
                  columns={columns}
                  getRowKey={(item) => item.id}
                  items={queueItems}
                />
                <MobileList
                  ariaLabel="Atendimentos sociais recentes"
                  getItemKey={(item) => item.id}
                  items={queueItems}
                  renderItem={(item) => (
                    <a className={styles.mobileQueueItem} href={`#${item.id}`}>
                      <div className={styles.mobileQueueTopline}>
                        <strong>{item.family}</strong>
                        <ChevronRight size={16} aria-hidden="true" />
                      </div>
                      <span>{item.neighborhood} · {item.id}</span>
                      <div className={styles.mobileQueueMeta}>
                        <StatusBadge tone={item.tone}>{item.stage}</StatusBadge>
                        <small>{item.update}</small>
                      </div>
                    </a>
                  )}
                />
              </Surface>

              <Surface className={styles.foundationSurface} id="componentes">
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>Componentes-base</p>
                    <h2>Consistência sem excesso visual</h2>
                    <p>Controles previsíveis, estados explícitos e foco visível.</p>
                  </div>
                </div>
                <div className={styles.componentGrid}>
                  <div className={styles.componentGroup}>
                    <h3>Campos</h3>
                    <TextField
                      label="Buscar família"
                      leadingIcon={<Search aria-hidden="true" />}
                      placeholder="Nome, CPF ou código"
                      hint="A busca aceita dados parciais."
                    />
                    <TextField
                      label="Responsável familiar"
                      defaultValue="Maria"
                      error="Informe o nome completo."
                    />
                  </div>
                  <div className={styles.componentGroup}>
                    <h3>Ações e estados</h3>
                    <div className={styles.buttonRow}>
                      <Button variant="primary">Salvar cadastro</Button>
                      <Button variant="secondary">Nova família</Button>
                      <Button variant="neutral">Cancelar</Button>
                      <Button variant="ghost">Mais opções</Button>
                    </div>
                    <div className={styles.badgeRow} aria-label="Exemplos de status">
                      <StatusBadge tone="success">Concluído</StatusBadge>
                      <StatusBadge tone="warning">Pendente</StatusBadge>
                      <StatusBadge tone="danger">Bloqueado</StatusBadge>
                      <StatusBadge tone="info">Em análise</StatusBadge>
                    </div>
                  </div>
                </div>
              </Surface>
            </div>

            <aside className={styles.reviewRail} id="criterios" aria-labelledby="review-title">
              <p className={styles.sectionEyebrow}>Marco V2-02</p>
              <h2 id="review-title">O que validar</h2>
              <p>Esta prévia exercita a fundação visual antes de migrar qualquer tela real.</p>
              <ul>
                <li>
                  <ClipboardCheck aria-hidden="true" />
                  <span><strong>Hierarquia</strong> Leitura rápida e pouco ruído.</span>
                </li>
                <li>
                  <UsersRound aria-hidden="true" />
                  <span><strong>Uso humano</strong> Linguagem direta para a equipe.</span>
                </li>
                <li>
                  <CircleDollarSign aria-hidden="true" />
                  <span><strong>Semântica</strong> Cor reservada para ação e estado.</span>
                </li>
              </ul>
              <button className={styles.drawerPreview} onClick={() => setDrawerOpen(true)}>
                <span>
                  <Menu size={18} aria-hidden="true" />
                  Testar painel lateral
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              <p className={styles.reviewNote}>
                A marca oficial mantém seu degradê original; nenhum gradiente foi criado na interface.
              </p>
            </aside>
              </div>
            </>
          ) : (
            <ModulePreview view={activeView} onBack={() => selectView("overview")} />
          )}
        </div>
      </main>

      <BottomNavigation items={navigationItems} />

      <Drawer
        description="Exemplo do padrão para ações contextuais e formulários curtos."
        footer={
          <>
            <Button onClick={closeDrawer} variant="ghost">Cancelar</Button>
            <Button onClick={closeDrawer} variant="primary">Continuar</Button>
          </>
        }
        onClose={closeDrawer}
        open={drawerOpen}
        title="Novo atendimento"
      >
        <div className={styles.drawerForm}>
          <TextField
            autoComplete="off"
            label="Família"
            placeholder="Busque pelo nome ou CPF"
            leadingIcon={<Search aria-hidden="true" />}
          />
          <TextField label="Território" defaultValue="Jardim Aurora" />
          <div className={styles.drawerContext}>
            <span>Próxima etapa</span>
            <strong>Confirmar dados e iniciar avaliação social</strong>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
