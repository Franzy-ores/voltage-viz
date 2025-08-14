import { useState } from "react";
import { Sidebar } from "./network/Sidebar";
import { Canvas } from "./network/Canvas";
import { TopBar } from "./network/TopBar";
import { NodePropertiesPanel } from "./network/NodePropertiesPanel";
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
    id: 'cu-25',
    name: 'Cuivre 25mm²',
    r12: 0.727,
    x12: 0.08,
    r0: 2.18,
    x0: 0.32,
    material: 'Cuivre'
  },
  {
    id: 'cu-35',
    name: 'Cuivre 35mm²',
    r12: 0.524,
    x12: 0.08,
    r0: 1.57,
    x0: 0.32,
    material: 'Cuivre'
  },
  {
    id: 'al-50',
    name: 'Aluminium 50mm²',
    r12: 0.641,
    x12: 0.08,
    r0: 1.92,
    x0: 0.32,
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
  const [selectedTool, setSelectedTool] = useState<'select' | 'supply' | 'load' | 'pv' | 'cable'>('select');

  const addNode = (type: NodeType, position: { x: number; y: number }) => {
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
    // Implémentation du calcul de chute de tension
    // Pour l'instant, simulation basique
    const updatedNodes = project.nodes.map(node => {
      const statusColors: Array<'compliant' | 'warning' | 'critical'> = ['compliant', 'warning', 'critical'];
      const randomStatus = statusColors[Math.floor(Math.random() * statusColors.length)];
      
      return {
        ...node,
        voltage: node.type === 'supply' 
          ? (project.voltageType === '400V' ? 400 : 230)
          : Math.random() * 20 + (project.voltageType === '400V' ? 380 : 220),
        current: Math.random() * 50 + 10,
        statusColor: Math.random() > 0.7 ? 'warning' : 'compliant' as 'compliant' | 'warning' | 'critical'
      };
    });

    const updatedEdges = project.edges.map(edge => ({
      ...edge,
      current: Math.random() * 30 + 5,
      voltageDropPercent: Math.random() * 8 + 1,
      statusColor: Math.random() > 0.8 ? 'critical' : 'compliant' as 'compliant' | 'warning' | 'critical'
    }));

    setProject(prev => ({
      ...prev,
      nodes: updatedNodes,
      edges: updatedEdges
    }));

    toast.success("Calcul terminé");
  };

  const selectedNode = selectedNodeId ? project.nodes.find(n => n.id === selectedNodeId) : null;

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
            onNodeAdd={addNode}
            onNodeSelect={setSelectedNodeId}
            onNodeDelete={deleteNode}
            onEdgeAdd={addEdge}
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
        </div>
      </div>
    </div>
  );
};