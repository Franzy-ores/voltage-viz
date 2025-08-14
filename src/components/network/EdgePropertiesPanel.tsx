import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Cable } from "lucide-react";
import { NetworkEdge, CableType } from "../ElectricalNetworkCalculator";
import { useState } from "react";

interface EdgePropertiesPanelProps {
  edge: NetworkEdge;
  cableTypes: CableType[];
  onEdgeUpdate: (edgeId: string, updates: Partial<NetworkEdge>) => void;
  onClose: () => void;
}

export const EdgePropertiesPanel = ({ 
  edge, 
  cableTypes, 
  onEdgeUpdate, 
  onClose 
}: EdgePropertiesPanelProps) => {
  const [length, setLength] = useState(edge.length.toString());
  const [cableTypeId, setCableTypeId] = useState(edge.cableTypeId);

  const selectedCable = cableTypes.find(c => c.id === cableTypeId);

  const handleLengthChange = (value: string) => {
    setLength(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onEdgeUpdate(edge.id, { length: numValue });
    }
  };

  const handleCableTypeChange = (newCableTypeId: string) => {
    setCableTypeId(newCableTypeId);
    onEdgeUpdate(edge.id, { cableTypeId: newCableTypeId });
  };

  return (
    <div className="w-80 bg-card border-l p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cable className="h-4 w-4" />
              Propriétés du câble
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cable-type">Type de câble</Label>
            <Select value={cableTypeId} onValueChange={handleCableTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un câble" />
              </SelectTrigger>
              <SelectContent>
                {cableTypes.map((cable) => (
                  <SelectItem key={cable.id} value={cable.id}>
                    {cable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">Longueur (m)</Label>
            <Input
              id="length"
              type="number"
              step="0.1"
              min="0.1"
              value={length}
              onChange={(e) => handleLengthChange(e.target.value)}
              placeholder="Longueur en mètres"
            />
          </div>

          {selectedCable && (
            <div className="space-y-2">
              <Label>Caractéristiques du câble</Label>
              <div className="text-xs space-y-1 p-2 rounded-md bg-muted">
                <div><strong>Matériau:</strong> {selectedCable.material}</div>
                <div><strong>R12:</strong> {selectedCable.r12} Ω/km</div>
                <div><strong>X12:</strong> {selectedCable.x12} Ω/km</div>
                <div><strong>R0:</strong> {selectedCable.r0} Ω/km</div>
                <div><strong>X0:</strong> {selectedCable.x0} Ω/km</div>
              </div>
            </div>
          )}

          {edge.current && (
            <div className="space-y-2">
              <Label>Résultats de calcul</Label>
              <div className="text-xs space-y-1 p-2 rounded-md bg-muted">
                <div><strong>Courant:</strong> {edge.current.toFixed(2)} A</div>
                {edge.voltageDropPercent && (
                  <div><strong>Chute de tension:</strong> {edge.voltageDropPercent.toFixed(2)} %</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};