import { useRef, useState, useEffect } from "react";
import { Project, NetworkNode, NodeType } from "../ElectricalNetworkCalculator";

interface CanvasProps {
  project: Project;
  selectedTool: 'select' | 'supply' | 'load' | 'pv' | 'cable';
  selectedNodeId: string | null;
  selectedEdgeId?: string | null;
  onNodeAdd: (type: NodeType, position: { x: number; y: number }) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeAdd: (fromNodeId: string, toNodeId: string) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  onEdgeDelete: (edgeId: string) => void;
  onEdgeUpdate: (edgeId: string, updates: any) => void;
}

export const Canvas = ({
  project,
  selectedTool,
  selectedNodeId,
  selectedEdgeId,
  onNodeAdd,
  onNodeSelect,
  onNodeDelete,
  onEdgeAdd,
  onEdgeSelect,
  onEdgeDelete
}: CanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;

    if (selectedTool !== 'select' && selectedTool !== 'cable') {
      onNodeAdd(selectedTool as NodeType, { x, y });
    }
  };

  const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (selectedTool === 'cable') {
      if (!connectionStart) {
        setConnectionStart(nodeId);
      } else if (connectionStart !== nodeId) {
        onEdgeAdd(connectionStart, nodeId);
        setConnectionStart(null);
      }
    } else {
      onNodeSelect(nodeId === selectedNodeId ? null : nodeId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedNodeId) {
      onNodeDelete(selectedNodeId);
    } else if (event.key === 'Escape') {
      onNodeSelect(null);
      setConnectionStart(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  const getNodeColor = (node: NetworkNode) => {
    if (node.statusColor) {
      return {
        'compliant': '#22c55e',
        'warning': '#f59e0b', 
        'critical': '#ef4444'
      }[node.statusColor];
    }
    
    return {
      'supply': '#1e40af',
      'load': '#7c3aed',
      'pv': '#16a34a',
      'mixed': '#dc2626'
    }[node.type];
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'supply': return '⚡';
      case 'load': return '🏠';
      case 'pv': return '☀️';
      case 'mixed': return '⚡🏠';
      default: return '●';
    }
  };

  return (
    <div className="flex-1 bg-canvas-bg relative overflow-hidden">
      {/* Grid pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--grid-lines))" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleSVGClick}
        style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
      >
        {/* Edges */}
        {project.edges.map((edge) => {
          const fromNode = project.nodes.find(n => n.id === edge.fromNodeId);
          const toNode = project.nodes.find(n => n.id === edge.toNodeId);
          
          if (!fromNode || !toNode) return null;

          const edgeColor = edge.statusColor
            ? { 'compliant': '#22c55e', 'warning': '#f59e0b', 'critical': '#ef4444' }[edge.statusColor]
            : '#374151';

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.position.x}
                y1={fromNode.position.y}
                x2={toNode.position.x}
                y2={toNode.position.y}
                stroke={edgeColor}
                strokeWidth={selectedEdgeId === edge.id ? "5" : "3"}
                className="cursor-pointer hover:stroke-width-4"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedTool === 'select') {
                    if (onEdgeSelect) {
                      onEdgeSelect(selectedEdgeId === edge.id ? null : edge.id);
                    }
                  }
                }}
              />
              {edge.voltageDropPercent && (
                <text
                  x={(fromNode.position.x + toNode.position.x) / 2}
                  y={(fromNode.position.y + toNode.position.y) / 2 - 10}
                  textAnchor="middle"
                  className="text-xs fill-tech-600 font-medium"
                >
                  ΔU: {edge.voltageDropPercent.toFixed(1)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {project.nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.position.x}
              cy={node.position.y}
              r="20"
              fill={getNodeColor(node)}
              stroke={selectedNodeId === node.id ? "#3b82f6" : "white"}
              strokeWidth={selectedNodeId === node.id ? "3" : "2"}
              className="cursor-pointer hover:r-22"
              onClick={(e) => handleNodeClick(node.id, e)}
            />
            <text
              x={node.position.x}
              y={node.position.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none text-sm font-bold"
              fill="white"
            >
              {getNodeIcon(node.type)}
            </text>
            <text
              x={node.position.x}
              y={node.position.y + 35}
              textAnchor="middle"
              className="text-xs fill-tech-600 font-medium pointer-events-none"
            >
              {node.name}
            </text>
            {node.voltage && (
              <text
                x={node.position.x}
                y={node.position.y + 50}
                textAnchor="middle"
                className="text-xs fill-tech-500 pointer-events-none"
              >
                {node.voltage.toFixed(0)}V
              </text>
            )}
          </g>
        ))}

        {connectionStart && (
          <text
            x="20"
            y="30"
            className="text-sm fill-primary font-medium"
          >
            Cliquez sur un nœud de destination
          </text>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          className="bg-card border rounded p-2 hover:bg-secondary"
          onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
        >
          +
        </button>
        <button
          className="bg-card border rounded p-2 hover:bg-secondary"
          onClick={() => setZoom(Math.max(zoom / 1.2, 0.3))}
        >
          -
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-card border rounded-lg p-3 text-sm max-w-xs">
        {selectedTool === 'select' && (
          <div>
            <strong>Mode sélection :</strong><br />
            Cliquez sur un nœud pour le sélectionner<br />
            Cliquez sur un câble pour le supprimer<br />
            <kbd>Suppr</kbd> : supprimer le nœud sélectionné
          </div>
        )}
        {selectedTool === 'cable' && (
          <div>
            <strong>Mode câble :</strong><br />
            Cliquez sur le premier nœud, puis sur le second pour les connecter
          </div>
        )}
        {selectedTool !== 'select' && selectedTool !== 'cable' && (
          <div>
            <strong>Mode {selectedTool} :</strong><br />
            Cliquez sur le canvas pour ajouter un nœud
          </div>
        )}
      </div>
    </div>
  );
};