import { ConnectionType, Node, Cable, CableType, CalculationScenario, CalculationResult } from '@/types/network';

function getVoltageConfig(connectionType: ConnectionType) {
  switch (connectionType) {
    case 'MONO_230V_PN':
      return { U: 230, isThreePhase: false, useR0: true };
    case 'MONO_230V_PP':
      return { U: 230, isThreePhase: false, useR0: false };
    case 'TRI_230V_3F':
      return { U: 230, isThreePhase: true, useR0: false };
    case 'TÉTRA_3P+N_230_400V':
      return { U: 400, isThreePhase: true, useR0: false };
    default:
      return { U: 230, isThreePhase: true, useR0: false };
  }
}

function getComplianceStatus(voltageDropPercent: number): 'compliant' | 'warning' | 'critical' {
  const absP = Math.abs(voltageDropPercent);
  if (absP <= 8) return 'compliant';
  if (absP <= 10) return 'warning';
  return 'critical';
}

export class ElectricalCalculator {
  private cosPhi: number;

  constructor(cosPhi: number = 0.95) {
    this.cosPhi = cosPhi;
  }

  setCosPhi(value: number) {
    this.cosPhi = value;
  }

  calculateScenario(
    nodes: Node[],
    cables: Cable[],
    cableTypes: CableType[],
    scenario: CalculationScenario
  ): CalculationResult {
    const nodeById = new Map(nodes.map(n => [n.id, n] as const));
    const cableTypeById = new Map(cableTypes.map(ct => [ct.id, ct] as const));

    const sources = nodes.filter(n => n.isSource);
    if (sources.length !== 1) throw new Error('Le calcul requiert exactement une source.');
    const source = sources[0];

    // --- Construction arbre depuis la source ---
    const adj = new Map<string, { cableId: string; neighborId: string }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const c of cables) {
      if (!nodeById.has(c.nodeAId) || !nodeById.has(c.nodeBId)) continue;
      adj.get(c.nodeAId)!.push({ cableId: c.id, neighborId: c.nodeBId });
      adj.get(c.nodeBId)!.push({ cableId: c.id, neighborId: c.nodeAId });
    }

    const parent = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue = [source.id];
    parent.set(source.id, null);
    visited.add(source.id);

    while (queue.length) {
      const u = queue.shift()!;
      for (const edge of adj.get(u) || []) {
        if (!visited.has(edge.neighborId)) {
          visited.add(edge.neighborId);
          parent.set(edge.neighborId, u);
          queue.push(edge.neighborId);
        }
      }
    }

    // --- Puissances nettes par nœud ---
    const S_eq = new Map<string, number>();
    for (const n of nodes) {
      const S_prel = (n.clients || []).reduce((s, c) => s + (c.S_kVA || 0), 0);
      const S_pv = (n.productions || []).reduce((s, p) => s + (p.S_kVA || 0), 0);
      let val = 0;
      if (scenario === 'PRÉLÈVEMENT') val = S_prel;
      else if (scenario === 'PRODUCTION') val = -S_pv;
      else val = S_prel - S_pv;
      S_eq.set(n.id, val);
    }

    // --- Agrégation descendante des puissances ---
    const children = new Map<string, string[]>();
    for (const n of nodes) children.set(n.id, []);
    for (const [nodeId, p] of parent.entries()) {
      if (p && children.has(p)) children.get(p)!.push(nodeId);
    }

    const postOrder: string[] = [];
    const dfs = (u: string) => {
      for (const v of children.get(u) || []) dfs(v);
      postOrder.push(u);
    };
    dfs(source.id);

    const S_aval = new Map<string, number>();
    for (const nodeId of postOrder) {
      let sum = S_eq.get(nodeId) || 0;
      for (const childId of (children.get(nodeId) || [])) {
        sum += S_aval.get(childId) || 0;
      }
      S_aval.set(nodeId, sum);
    }

    // --- Calcul câbles ---
    const calculatedCables: Cable[] = [];
    let globalLosses = 0;
    let maxVoltageDropPercent = 0;

    for (const cable of cables) {
      let distalNodeId: string | null = null;
      if (parent.get(cable.nodeBId) === cable.nodeAId) distalNodeId = cable.nodeBId;
      else if (parent.get(cable.nodeAId) === cable.nodeBId) distalNodeId = cable.nodeAId;
      else distalNodeId = cable.nodeBId;

      const distalS_kVA = S_aval.get(distalNodeId) || 0;
      const distalNode = nodeById.get(distalNodeId)!;

      const ct = cableTypeById.get(cable.typeId);
      if (!ct) throw new Error(`Type de câble introuvable: ${cable.typeId}`);

      const { U, isThreePhase, useR0 } = getVoltageConfig(distalNode.connectionType);
      const R_per_km = useR0 ? ct.R0_ohm_per_km : ct.R12_ohm_per_km;
      const X_per_km = useR0 ? ct.X0_ohm_per_km : ct.X12_ohm_per_km;

      const denom = (isThreePhase ? Math.sqrt(3) * U : U) * this.cosPhi;
      const currentSigned = denom > 0 ? (distalS_kVA * 1000) / denom : 0;
      const current = Math.abs(currentSigned);

      const sinPhi = Math.sqrt(1 - this.cosPhi * this.cosPhi);
      const L_km = (cable.length_m || 0) / 1000;

      let deltaU_V;
      if (isThreePhase) {
        deltaU_V = Math.sqrt(3) * current * (R_per_km * this.cosPhi + X_per_km * sinPhi) * L_km;
      } else {
        deltaU_V = current * (R_per_km * this.cosPhi + X_per_km * sinPhi) * L_km;
      }

      // ✅ inversion signe en cas d’injection
      if (distalS_kVA < 0) {
        deltaU_V = -deltaU_V;
      }

      const deltaU_percent = (deltaU_V / U) * 100;
      const R_total = R_per_km * L_km;
      const losses_kW = (current * current * R_total) / 1000;

      globalLosses += losses_kW;
      maxVoltageDropPercent = Math.max(maxVoltageDropPercent, Math.abs(deltaU_percent));

      calculatedCables.push({
        ...cable,
        current_A: current,
        voltageDrop_V: deltaU_V,
        voltageDropPercent: deltaU_percent,
        losses_kW,
        statusColor: getComplianceStatus(deltaU_percent)
      });
    }

    return {
      scenario,
      cables: calculatedCables,
      totalLoads_kVA: nodes.reduce((s, n) => s + (n.clients || []).reduce((ss, c) => ss + (c.S_kVA || 0), 0), 0),
      totalProductions_kVA: nodes.reduce((s, n) => s + (n.productions || []).reduce((ss, p) => ss + (p.S_kVA || 0), 0), 0),
      globalLosses_kW: Number(globalLosses.toFixed(6)),
      maxVoltageDropPercent: Number(maxVoltageDropPercent.toFixed(6)),
      compliance: getComplianceStatus(maxVoltageDropPercent)
    };
  }
}
