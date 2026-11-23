"""Gera os diagramas arquiteturais do SGH Connect (PNG) com matplotlib.

Uso:  python docs/diagramas/gerar_diagramas.py
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = os.path.dirname(os.path.abspath(__file__))

AZUL = "#1F4E79"
AZUL_CLARO = "#DCE9F5"
VERDE = "#2E7D32"
VERDE_CLARO = "#E3F1E4"
LARANJA = "#B85C00"
LARANJA_CLARO = "#FCEBD9"
CINZA = "#555555"
CINZA_CLARO = "#EFEFEF"
ROXO = "#5B3A8C"
ROXO_CLARO = "#ECE4F7"


def novo(w, h):
    fig, ax = plt.subplots(figsize=(w, h), dpi=200)
    ax.set_xlim(0, w * 10)
    ax.set_ylim(0, h * 10)
    ax.axis("off")
    return fig, ax


def caixa(ax, x, y, w, h, titulo, sub=None, cor=AZUL, fundo=AZUL_CLARO, fs=9, tracejada=False, raio=1.2):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={raio}",
                       linewidth=1.6, edgecolor=cor, facecolor=fundo,
                       linestyle="--" if tracejada else "-")
    ax.add_patch(p)
    if sub:
        ax.text(x + w / 2, y + h * 0.64, titulo, ha="center", va="center", fontsize=fs,
                fontweight="bold", color=cor)
        ax.text(x + w / 2, y + h * 0.30, sub, ha="center", va="center", fontsize=fs - 2.2,
                color="#222222", linespacing=1.25)
    else:
        ax.text(x + w / 2, y + h / 2, titulo, ha="center", va="center", fontsize=fs,
                fontweight="bold", color=cor)
    return (x, y, w, h)


def seta(ax, p1, p2, texto=None, cor=CINZA, tracejada=False, fs=6.8, curva=0.0, off=(0, 0)):
    a = FancyArrowPatch(p1, p2, arrowstyle="-|>", mutation_scale=11, linewidth=1.3,
                        color=cor, linestyle=(0, (4, 3)) if tracejada else "-",
                        connectionstyle=f"arc3,rad={curva}", shrinkA=2, shrinkB=2)
    ax.add_patch(a)
    if texto:
        mx, my = (p1[0] + p2[0]) / 2 + off[0], (p1[1] + p2[1]) / 2 + off[1]
        ax.text(mx, my, texto, ha="center", va="center", fontsize=fs, color=cor,
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.95))


def salvar(fig, nome, titulo=None, ax=None):
    if titulo and ax is not None:
        ax.set_title(titulo, fontsize=12, fontweight="bold", color=AZUL, pad=6)
    fig.savefig(os.path.join(OUT, nome), bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------- 1. C4 Contexto
def c4_contexto():
    fig, ax = novo(11, 6.4)
    atores = [
        ("Recepcionista", "cadastra pacientes,\nagenda consultas"),
        ("Médico / Enfermeiro", "realiza atendimentos,\nregistra prontuário"),
        ("Gestor de Leitos", "controla internações\ne altas"),
        ("Faturista", "gera e acompanha\ncontas hospitalares"),
        ("Administrador", "gerencia usuários,\nperfis e relatórios"),
    ]
    xs = [2, 23, 44, 65, 86]
    for (n, s), x in zip(atores, xs):
        caixa(ax, x, 47, 20, 12, n, s, cor=CINZA, fundo=CINZA_CLARO, fs=8.5)
        seta(ax, (x + 10, 47), (55, 34))
    caixa(ax, 33, 20, 44, 14, "SGH Connect",
          "Sistema Integrado de Gestão Hospitalar\n(monólito modular — sistema em escopo)",
          cor=AZUL, fundo=AZUL_CLARO, fs=11)
    caixa(ax, 4, 2, 30, 11, "Serviço de E-mail / SMS", "[sistema externo]\nlembretes e avisos",
          cor=ROXO, fundo=ROXO_CLARO, fs=8.5)
    caixa(ax, 76, 2, 30, 11, "Operadoras de Convênio", "[sistema externo — evolução futura]\nenvio de guias/faturas",
          cor=ROXO, fundo=ROXO_CLARO, fs=8.5, tracejada=True)
    seta(ax, (40, 20), (22, 13), "envia notificações\n(adaptador SMTP)")
    seta(ax, (70, 20), (88, 13), "exporta faturas\n(porta FaturaExportador)", tracejada=True)
    salvar(fig, "01_c4_contexto.png", "C4 — Nível 1: Diagrama de Contexto", ax)


# ---------------------------------------------------------------- 2. C4 Conteineres
def c4_conteineres():
    fig, ax = novo(11, 6.2)
    caixa(ax, 40, 50, 30, 10, "Usuários do hospital", "navegador web", cor=CINZA, fundo=CINZA_CLARO, fs=9)
    ax.add_patch(FancyBboxPatch((3, 3), 104, 41, boxstyle="round,pad=0,rounding_size=1.5",
                                linewidth=1.2, edgecolor=AZUL, facecolor="none", linestyle="--"))
    ax.text(5, 41.5, "SGH Connect  [fronteira do sistema]", fontsize=8, color=AZUL, fontweight="bold")
    caixa(ax, 6, 22, 28, 14, "sgh-connect-web", "[SPA — React + TypeScript]\ntelas por módulo,\nconsome API REST",
          cor=AZUL, fundo=AZUL_CLARO, fs=9)
    caixa(ax, 41, 22, 30, 14, "sgh-connect-api", "[NestJS + TypeScript]\nmonólito modular\n(9 módulos + barramento de eventos)",
          cor=AZUL, fundo=AZUL_CLARO, fs=9)
    caixa(ax, 78, 22, 26, 14, "Banco de Dados", "[PostgreSQL]\num schema por módulo\n(pacientes, agenda, ...)",
          cor=VERDE, fundo=VERDE_CLARO, fs=9)
    caixa(ax, 41, 6, 30, 10, "Worker de eventos", "[mesmo deploy da API]\nprocessa outbox / handlers",
          cor=LARANJA, fundo=LARANJA_CLARO, fs=8.5)
    seta(ax, (55, 50), (20, 36), "HTTPS")
    seta(ax, (34, 29), (41, 29), "REST/JSON\n+ JWT", off=(0, 5))
    seta(ax, (71, 29), (78, 29), "SQL (ORM)", off=(0, 4))
    seta(ax, (56, 22), (56, 16), "eventos de domínio", off=(9, 0))
    seta(ax, (71, 11), (91, 22), "lê outbox", curva=0.2)
    salvar(fig, "02_c4_conteineres.png", "C4 — Nível 2: Diagrama de Contêineres", ax)


# ---------------------------------------------------------------- 3. Modulos e dependencias
def modulos():
    fig, ax = novo(12, 8)
    B = {}
    B["identidade"] = caixa(ax, 2, 64, 24, 11, "Identidade e Acesso", "usuários, perfis,\nlogin, JWT, RBAC")
    B["pacientes"] = caixa(ax, 30, 64, 24, 11, "Pacientes", "cadastro, CPF,\nconvênio, contatos")
    B["profissionais"] = caixa(ax, 58, 64, 24, 11, "Corpo Clínico", "médicos, enfermeiros,\nCRM/COREN, escalas")
    B["agendamento"] = caixa(ax, 30, 44, 24, 11, "Agendamento", "consultas, horários,\nconflitos de agenda")
    B["atendimento"] = caixa(ax, 58, 44, 24, 11, "Atendimento", "triagem, prontuário,\nprescrição, evolução")
    B["internacao"] = caixa(ax, 86, 44, 24, 11, "Internação e Leitos", "leitos, internação,\ntransferência, alta")
    B["faturamento"] = caixa(ax, 4, 6, 24, 11, "Faturamento", "contas, itens,\nfechamento", cor=LARANJA, fundo=LARANJA_CLARO)
    B["notificacoes"] = caixa(ax, 44, 6, 24, 11, "Notificações", "e-mail / SMS,\nlembretes", cor=LARANJA, fundo=LARANJA_CLARO)
    B["relatorios"] = caixa(ax, 84, 6, 24, 11, "Relatórios", "indicadores,\nocupação, produção", cor=LARANJA, fundo=LARANJA_CLARO)
    # barramento
    ax.add_patch(FancyBboxPatch((2, 25), 108, 7, boxstyle="round,pad=0,rounding_size=1",
                                linewidth=1.6, edgecolor=ROXO, facecolor=ROXO_CLARO))
    ax.text(56, 28.5, "Barramento de Eventos de Domínio (in-process + outbox)", ha="center", va="center",
            fontsize=9.5, fontweight="bold", color=ROXO)

    def top(k): x, y, w, h = B[k]; return (x + w / 2, y + h)
    def bot(k): x, y, w, h = B[k]; return (x + w / 2, y)
    def left(k): x, y, w, h = B[k]; return (x, y + h / 2)
    def right(k): x, y, w, h = B[k]; return (x + w, y + h / 2)

    # dependencias sincronas (via contrato/facade)
    seta(ax, top("agendamento"), bot("pacientes"), cor=AZUL)
    seta(ax, (50, 55), (62, 64), cor=AZUL)
    seta(ax, (64, 55), (48, 64), cor=AZUL)
    seta(ax, (74, 55), (74, 64), cor=AZUL)
    seta(ax, (98, 55), (52, 75), cor=AZUL, curva=0.25)
    # publicacao de eventos
    for k in ("agendamento", "atendimento", "internacao"):
        x, y, w, h = B[k]
        seta(ax, (x + w / 2, y), (x + w / 2, 32), tracejada=True, cor=ROXO)
    ax.text(43.5, 37.5, "ConsultaAgendada\nConsultaCancelada", fontsize=6.5, color=ROXO, ha="left")
    ax.text(71.5, 38.5, "AtendimentoFinalizado", fontsize=6.5, color=ROXO, ha="left")
    ax.text(99.5, 37.5, "PacienteInternado\nAltaRegistrada", fontsize=6.5, color=ROXO, ha="left")
    # consumo de eventos
    for k in ("faturamento", "notificacoes", "relatorios"):
        x, y, w, h = B[k]
        seta(ax, (x + w / 2, 25), (x + w / 2, y + h), tracejada=True, cor=ROXO)
    # identidade transversal
    ax.text(14, 58, "AuthGuard + @Perfis()\naplicado em todos\nos controllers", fontsize=6.8, color=AZUL,
            ha="center", va="top", style="italic")
    # legenda
    ax.plot([2, 8], [-2, -2], color=AZUL, lw=1.4); ax.text(9, -2, "chamada síncrona à interface pública (PacientesApi / CorpoClinicoApi)", fontsize=7, va="center")
    ax.plot([70, 76], [-2, -2], color=ROXO, lw=1.4, ls=(0, (4, 3))); ax.text(77, -2, "evento de domínio assíncrono", fontsize=7, va="center")
    ax.set_ylim(-5, 80)
    salvar(fig, "03_modulos_dependencias.png", "C4 — Nível 3: Módulos da API e mapa de dependências", ax)


# ---------------------------------------------------------------- 4. Camadas internas de um modulo
def camadas():
    fig, ax = novo(10, 6.6)
    ax.add_patch(FancyBboxPatch((2, 2), 64, 60, boxstyle="round,pad=0,rounding_size=1.5",
                                linewidth=1.3, edgecolor=AZUL, facecolor="none", linestyle="--"))
    ax.text(4, 59.5, "modules/internacao/", fontsize=8.5, color=AZUL, fontweight="bold", family="monospace")
    caixa(ax, 6, 45, 56, 10, "api/  (apresentação)", "InternacaoController, DTOs de entrada/saída, validação HTTP", fs=8.5)
    caixa(ax, 6, 31, 56, 10, "application/  (casos de uso)", "InternarPaciente, RegistrarAlta, TransferirLeito — orquestram e publicam eventos", fs=8.5)
    caixa(ax, 6, 17, 56, 10, "domain/  (regras de negócio)", "Leito, Internacao, StatusLeito (enum), regras de ocupação — sem framework",
          cor=VERDE, fundo=VERDE_CLARO, fs=8.5)
    caixa(ax, 6, 4, 56, 9, "infrastructure/  (adaptadores)", "PrismaInternacaoRepository, mapeadores ORM",
          cor=CINZA, fundo=CINZA_CLARO, fs=8.5)
    seta(ax, (34, 45), (34, 41))
    seta(ax, (34, 31), (34, 27))
    seta(ax, (50, 13), (50, 17), "implementa\nporta do domínio", off=(10, 0))
    caixa(ax, 72, 40, 26, 15, "contracts/", "InternacaoApi (interface)\nDTOs públicos\nEventos publicados",
          cor=LARANJA, fundo=LARANJA_CLARO, fs=8.5)
    caixa(ax, 72, 14, 26, 15, "Outros módulos", "só importam\ncontracts/ —\nnunca domain/ ou\ninfrastructure/",
          cor=CINZA, fundo=CINZA_CLARO, fs=8.5)
    seta(ax, (85, 29), (85, 40), "dependem de", off=(7, 0))
    seta(ax, (72, 47), (62, 36), "implementado\npor um caso de uso", off=(0, 3))
    ax.text(50, -1.5, "Regra de dependência: as setas apontam sempre para dentro (api → application → domain ← infrastructure).",
            ha="center", fontsize=7.5, style="italic", color=CINZA)
    ax.set_ylim(-4, 66)
    salvar(fig, "04_camadas_modulo.png", "Estrutura interna de cada módulo (camadas)", ax)


# ---------------------------------------------------------------- 5. Sequencia: finalizar atendimento
def sequencia():
    fig, ax = novo(11, 6.4)
    parts = ["Médico\n(web)", "Atendimento\nController", "Finalizar\nAtendimento\n(caso de uso)", "Barramento /\nOutbox",
             "Faturamento\n(handler)", "Notificações\n(handler)"]
    xs = [8, 26, 46, 66, 84, 102]
    for p, x in zip(parts, xs):
        caixa(ax, x - 8, 54, 16, 8, p, fs=7.2, cor=AZUL, fundo=AZUL_CLARO)
        ax.plot([x, x], [4, 54], color="#999999", lw=1, ls=(0, (3, 3)))
    msgs = [
        (0, 1, 48, "PATCH /atendimentos/{id}/finalizar"),
        (1, 2, 42, "executar(id, usuario)"),
        (2, 2, 37, "valida regras + salva\n(transação)"),
        (2, 3, 28, "grava AtendimentoFinalizado no outbox\n(mesma transação)"),
        (2, 1, 23, "ok"),
        (1, 0, 18.5, "200 OK"),
        (3, 4, 14, "AtendimentoFinalizado (após commit)"),
        (3, 5, 8, "AtendimentoFinalizado"),
    ]
    for a, b, y, t in msgs:
        if a == b:
            ax.annotate("", xy=(xs[a] + 0.3, y - 3), xytext=(xs[a] + 0.3, y),
                        arrowprops=dict(arrowstyle="-|>", connectionstyle="arc,angleA=0,angleB=0,armA=18,armB=18,rad=3", color=CINZA))
            ax.text(xs[a] + 4, y - 1.5, t, fontsize=6.6, va="center", ha="left")
        else:
            tr = a > b
            seta(ax, (xs[a], y), (xs[b], y), cor=VERDE if tr else CINZA, tracejada=tr or a == 3)
            ax.text((xs[a] + xs[b]) / 2, y + 1.6, t, ha="center", fontsize=6.6)
    ax.text(93, 3, "→ cria item na conta do paciente\n→ envia resumo/retorno ao paciente", fontsize=6.6, ha="center", color=LARANJA)
    ax.set_ylim(0, 64)
    salvar(fig, "05_sequencia_finalizar_atendimento.png",
           "Sequência — Finalizar atendimento (acoplamento síncrono só dentro do módulo)", ax)


if __name__ == "__main__":
    c4_contexto()
    c4_conteineres()
    modulos()
    camadas()
    sequencia()
    print("diagramas gerados em", OUT)
