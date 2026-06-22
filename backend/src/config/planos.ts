export const PLANOS = {
  free: {
    nome: "Free",
    preco: 0,
    disparos_mes: 100,
    instancias: 1,
    leads: 200,
    buscas_dia: 3,
    templates: 2,
    campanhas: 1,
    followups: false,
    busca_plataforma: false,
    enriquecimento: false,
    ia: false,
    usuarios: 1,
    suporte: "Comunidade"
  },
  starter: {
    nome: "Starter",
    preco: 4990,
    disparos_mes: 1000,
    instancias: 1,
    leads: 2000,
    buscas_dia: 20,
    templates: 10,
    campanhas: 3,
    followups: true,
    busca_plataforma: false,
    enriquecimento: false,
    ia: false,
    usuarios: 1,
    suporte: "Email"
  },
  pro: {
    nome: "Pro",
    preco: 12990,
    disparos_mes: 5000,
    instancias: 3,
    leads: 10000,
    buscas_dia: 100,
    templates: -1,
    campanhas: 10,
    followups: true,
    busca_plataforma: true,
    enriquecimento: true,
    ia: true,
    usuarios: 3,
    suporte: "Prioritário"
  },
  enterprise: {
    nome: "Enterprise",
    preco: 29990,
    disparos_mes: 20000,
    instancias: 10,
    leads: -1,
    buscas_dia: -1,
    templates: -1,
    campanhas: -1,
    followups: true,
    busca_plataforma: true,
    enriquecimento: true,
    ia: true,
    usuarios: -1,
    suporte: "Dedicado"
  }
};

export type PlanKey = keyof typeof PLANOS;
