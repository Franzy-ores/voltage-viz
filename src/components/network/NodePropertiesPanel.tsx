import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Trash2 } from "lucide-react";
import { NetworkNode, CableType, PhaseConfig } from "../ElectricalNetworkCalculator";

interface NodePropertiesPanelProps {
  node: NetworkNode;
  cableTypes: CableType[];
  onNodeUpdate: (nodeId: string, updates: Partial<NetworkNode>) => void;
  onClose: () => void;
}

export const NodePropertiesPanel = ({ 
  node, 
  cableTypes, 
  onNodeUpdate, 
  onClose 
}: NodePropertiesPanelProps) => {
  const [localNode, setLocalNode] = useState<NetworkNode>(node);

  const handleUpdate = () => {
    onNodeUpdate(node.id, localNode);
    onClose();
  };

  const addLoad = () => {
    setLocalNode(prev => ({
      ...prev,
      loads: [...prev.loads, { kva: 10, cosPhi: 0.95 }]
    }));
  };

  const updateLoad = (index: number, field: 'kva' | 'cosPhi', value: number) => {
    setLocalNode(prev => ({
      ...prev,
      loads: prev.loads.map((load, i) => 
        i === index ? { ...load, [field]: value } : load
      )
    }));
  };

  const removeLoad = (index: number) => {
    setLocalNode(prev => ({
      ...prev,
      loads: prev.loads.filter((_, i) => i !== index)
    }));
  };

  const addPvGeneration = () => {
    setLocalNode(prev => ({
      ...prev,
      pvGeneration: [...prev.pvGeneration, { kw: 5 }]
    }));
  };

  const updatePvGeneration = (index: number, value: number) => {
    setLocalNode(prev => ({
      ...prev,
      pvGeneration: prev.pvGeneration.map((pv, i) => 
        i === index ? { kw: value } : pv
      )
    }));
  };

  const removePvGeneration = (index: number) => {
    setLocalNode(prev => ({
      ...prev,
      pvGeneration: prev.pvGeneration.filter((_, i) => i !== index)
    }));
  };

  const typeLabels = {
    supply: 'Fourniture',
    load: 'Charge',
    pv: 'Production PV',
    mixed: 'Mixte'
  };

  const phaseConfigLabels = {
    mono: 'Monophasé 230V',
    tri230: 'Triphasé 230V',
    tetra400: 'Triphasé + N 400/230V'
  };

  return (
    <div className="w-80 bg-card border-l h-full overflow-y-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Propriétés du nœud</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={localNode.name}
            onChange={(e) => setLocalNode(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select 
            value={localNode.type}
            onValueChange={(value: any) => setLocalNode(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phaseConfig">Configuration des phases</Label>
          <Select 
            value={localNode.phaseConfig}
            onValueChange={(value: PhaseConfig) => setLocalNode(prev => ({ ...prev, phaseConfig: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(phaseConfigLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(localNode.type === 'load' || localNode.type === 'mixed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Charges
                <Button size="sm" variant="outline" onClick={addLoad}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localNode.loads.map((load, index) => (
                <div key={index} className="space-y-2 p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Charge {index + 1}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeLoad(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Puissance (kVA)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={load.kva}
                        onChange={(e) => updateLoad(index, 'kva', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">cos φ</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={load.cosPhi}
                        onChange={(e) => updateLoad(index, 'cosPhi', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(localNode.type === 'pv' || localNode.type === 'mixed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Production PV
                <Button size="sm" variant="outline" onClick={addPvGeneration}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localNode.pvGeneration.map((pv, index) => (
                <div key={index} className="space-y-2 p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PV {index + 1}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removePvGeneration(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Puissance (kW)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={pv.kw}
                      onChange={(e) => updatePvGeneration(index, Number(e.target.value))}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    cos φ = 1 (injection sans réactif)
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {localNode.voltage && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Résultats de calcul</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tension :</span>
                  <div className="font-medium">{localNode.voltage.toFixed(1)} V</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Courant :</span>
                  <div className="font-medium">{localNode.current?.toFixed(1)} A</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    localNode.statusColor === 'compliant' ? 'bg-status-compliant' :
                    localNode.statusColor === 'warning' ? 'bg-status-warning' :
                    localNode.statusColor === 'critical' ? 'bg-status-critical' :
                    'bg-tech-300'
                  }`}
                />
                <span className="text-sm">
                  {localNode.statusColor === 'compliant' ? 'Conforme' :
                   localNode.statusColor === 'warning' ? 'Proche limite' :
                   localNode.statusColor === 'critical' ? 'Non conforme' :
                   'Non calculé'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleUpdate} className="flex-1">
            Appliquer
          </Button>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};