import { useState } from "react";
import { Sidebar } from "./network/Sidebar";
import { Canvas } from "./network/Canvas";
import { TopBar } from "./network/TopBar";
import { NodePropertiesPanel } from "./network/NodePropertiesPanel";
import { EdgePropertiesPanel } from "./network/EdgePropertiesPanel";
import { toast } from "sonner";

export type NodeType = 'supply' | 'load' | 'pv' | 'mixed';
export type PhaseConfig = 'mono' | 'tri230' | 'tetra400';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  phaseConfig: PhaseConfig;
  position: { x: number; y: number };
  loads: Array<{ kva: number; cosPhi: number }>;
  pvGeneration: Array<{ kw: number }>;
  voltage?: number;
  current?: number;
  statusColor?: 'compliant' | 'warning' | 'critical';
}

export interface NetworkEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  cableTypeId: string;
  length: number;
  current?: number;
  voltageDropPercent?: number;
  statusColor?: 'compliant' | 'warning' | 'critical';
}

export interface CableType {
  id: string;
  name: string;
  r12: number; // Ω/km
  x12: number; // Ω/km
  r0: number;  // Ω/km
  x0: number;  // Ω/km
  material: string;
}

export interface Project {
  id: string;
  name: string;
  voltageType: '230V' | '400V';
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  cableTypes: CableType[];
}

const defaultCableTypes: CableType[] = [
  {
    id: 'baxb-95',
    name: 'BAXB 95',
    r12: 0.383,
    x12: 0.104,
    r0: 2.379,
    x0: 0.263,
    material: 'Aluminium'
  },
  {
    id: 'baxb-150',
    name: 'BAXB 150',
    r12: 0.244,
    x12: 0.098,
    r0: 1.805,
    x0: 0.258,
    material: 'Aluminium'
  },
  {
    id: 'eaxecwb-4x150',
    name: 'EAXeCWB 4x150',
    r12: 0.242,
    x12: 0.069,
    r0: 0.972,
    x0: 0.273,
    material: 'Aluminium'
  }
];

export const ElectricalNetworkCalculator = () => {
  const [project, setProject] = useState<Project>({
    id: 'default',
    name: 'Nouveau réseau',
    voltageType: '400V',
    nodes: [],
    edges: [],
    cableTypes: defaultCableTypes
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'supply' | 'load' | 'pv' | 'cable'>('select');

  const addNode = (type: NodeType, position: { x: number; y: number }) => {
    // Vérifier qu'il n'y a qu'un seul point de fourniture
    if (type === 'supply' && project.nodes.some(node => node.type === 'supply')) {
      toast.error("Un seul point de fourniture est autorisé");
      return;
    }

    const newNode: NetworkNode = {
      id: `node-${Date.now()}`,
      name: `${type === 'supply' ? 'Fourniture' : type === 'load' ? 'Charge' : type === 'pv' ? 'PV' : 'Mixte'} ${project.nodes.length + 1}`,
      type,
      phaseConfig: project.voltageType === '400V' ? 'tetra400' : 'mono',
      position,
      loads: type === 'load' || type === 'mixed' ? [{ kva: 10, cosPhi: 0.95 }] : [],
      pvGeneration: type === 'pv' || type === 'mixed' ? [{ kw: 5 }] : [],
      voltage: type === 'supply' ? (project.voltageType === '400V' ? 400 : 230) : undefined
    };

    setProject(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    toast.success(`Nœud ${newNode.name} ajouté`);
  };

  const updateNode = (nodeId: string, updates: Partial<NetworkNode>) => {
    setProject(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  };

  const deleteNode = (nodeId: string) => {
    setProject(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => 
        edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
      )
    }));
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    
    toast.success("Nœud supprimé");
  };

  const addEdge = (fromNodeId: string, toNodeId: string) => {
    const edgeExists = project.edges.some(edge => 
      (edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) ||
      (edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId)
    );

    if (edgeExists) {
      toast.error("Une connexion existe déjà entre ces nœuds");
      return;
    }

    const newEdge: NetworkEdge = {
      id: `edge-${Date.now()}`,
      fromNodeId,
      toNodeId,
      cableTypeId: project.cableTypes[0].id,
      length: 50
    };

    setProject(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));

    toast.success("Connexion ajoutée");
  };

  const updateEdge = (edgeId: string, updates: Partial<NetworkEdge>) => {
    setProject(prev => ({
      ...prev,
      edges: prev.edges.map(edge => 
        edge.id === edgeId ? { ...edge, ...updates } : edge
      )
    }));
  };

  const deleteEdge = (edgeId: string) => {
    setProject(prev => ({
      ...prev,
      edges: prev.edges.filter(edge => edge.id !== edgeId)
    }));
    
    toast.success("Connexion supprimée");
  };

  const calculateNetwork = () => {
    // Vérifier qu'il y a un point de fourniture
    const supplyNode = project.nodes.find(node => node.type === 'supply');
    if (!supplyNode) {
      toast.error("Un point de fourniture est requis pour le calcul");
      return;
    }

    // Calcul cumulatif de chute de tension depuis la source
    const calculatedNodes = new Map<string, NetworkNode>();
    const calculatedEdges = new Map<string, NetworkEdge>();
    
    // Initialiser le nœud de fourniture
    calculatedNodes.set(supplyNode.id, {
      ...supplyNode,
      voltage: project.voltageType === '400V' ? 400 : 230,
      statusColor: 'compliant'
    });

    // Fonction récursive pour calculer la chute de tension
    const calculatePath = (nodeId: string, currentVoltage: number) => {
      const connectedEdges = project.edges.filter(edge => 
        edge.fromNodeId === nodeId || edge.toNodeId === nodeId
      );

      connectedEdges.forEach(edge => {
        const nextNodeId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
        const nextNode = project.nodes.find(n => n.id === nextNodeId);
        
        if (!nextNode || calculatedNodes.has(nextNodeId)) return;

        // Calcul de la puissance totale du nœud
        const totalLoad = nextNode.loads.reduce((sum, load) => sum + load.kva, 0);
        const totalPV = nextNode.pvGeneration.reduce((sum, pv) => sum + pv.kw, 0);
        const netPower = totalLoad - totalPV;

        // Calcul du courant (simplifié)
        const current = netPower > 0 ? netPower / (currentVoltage * Math.sqrt(3)) * 1000 : 0;
        
        // Calcul de la chute de tension
        const cable = project.cableTypes.find(c => c.id === edge.cableTypeId);
        const resistance = cable ? cable.r12 * edge.length / 1000 : 0.1; // Ω
        const voltageDrop = current * resistance * Math.sqrt(3);
        const voltageDropPercent = (voltageDrop / currentVoltage) * 100;
        
        const newVoltage = currentVoltage - voltageDrop;
        const nominalVoltage = project.voltageType === '400V' ? 400 : 230;
        const voltageDeviationPercent = Math.abs((newVoltage - nominalVoltage) / nominalVoltage) * 100;
        
        // Déterminer le statut selon EN 50160 (±10%)
        let statusColor: 'compliant' | 'warning' | 'critical';
        if (voltageDeviationPercent <= 7) {
          statusColor = 'compliant';
        } else if (voltageDeviationPercent <= 10) {
          statusColor = 'warning';
        } else {
          statusColor = 'critical';
        }

        // Sauvegarder les résultats
        calculatedNodes.set(nextNodeId, {
          ...nextNode,
          voltage: newVoltage,
          current,
          statusColor
        });

        calculatedEdges.set(edge.id, {
          ...edge,
          current,
          voltageDropPercent,
          statusColor: voltageDropPercent > 5 ? 'critical' : voltageDropPercent > 3 ? 'warning' : 'compliant'
        });

        // Continuer récursivement
        calculatePath(nextNodeId, newVoltage);
      });
    };

    // Démarrer le calcul depuis le point de fourniture
    calculatePath(supplyNode.id, calculatedNodes.get(supplyNode.id)!.voltage!);

    // Mettre à jour le projet avec les résultats
    const updatedNodes = project.nodes.map(node => 
      calculatedNodes.get(node.id) || node
    );
    const updatedEdges = project.edges.map(edge => 
      calculatedEdges.get(edge.id) || edge
    );

    setProject(prev => ({
      ...prev,
      nodes: updatedNodes,
      edges: updatedEdges
    }));

    toast.success("Calcul de chute de tension terminé");
  };

  const selectedNode = selectedNodeId ? project.nodes.find(n => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? project.edges.find(e => e.id === selectedEdgeId) : null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar 
        project={project}
        onProjectChange={setProject}
        onCalculate={calculateNetwork}
      />
      
      <div className="flex-1 flex">
        <Sidebar 
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          cableTypes={project.cableTypes}
        />
        
        <div className="flex-1 flex">
          <Canvas
            project={project}
            selectedTool={selectedTool}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onNodeAdd={addNode}
            onNodeSelect={setSelectedNodeId}
            onNodeDelete={deleteNode}
            onEdgeAdd={addEdge}
            onEdgeSelect={setSelectedEdgeId}
            onEdgeDelete={deleteEdge}
            onEdgeUpdate={updateEdge}
          />
          
          {selectedNode && (
            <NodePropertiesPanel
              node={selectedNode}
              cableTypes={project.cableTypes}
              onNodeUpdate={updateNode}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
          
          {selectedEdge && (
            <EdgePropertiesPanel
              edge={selectedEdge}
              cableTypes={project.cableTypes}
              onEdgeUpdate={updateEdge}
              onClose={() => setSelectedEdgeId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};