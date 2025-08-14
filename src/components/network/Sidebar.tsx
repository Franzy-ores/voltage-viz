import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointer, Zap, Home, Sun, Cable, Layers } from "lucide-react";
import { CableType } from "../ElectricalNetworkCalculator";

interface SidebarProps {
  selectedTool: 'select' | 'supply' | 'load' | 'pv' | 'cable';
  onToolChange: (tool: 'select' | 'supply' | 'load' | 'pv' | 'cable') => void;
  cableTypes: CableType[];
}

const tools = [
  { id: 'select', name: 'Sélection', icon: MousePointer, color: 'tech-600' },
  { id: 'supply', name: 'Fourniture', icon: Zap, color: 'electrical-supply' },
  { id: 'load', name: 'Charge', icon: Home, color: 'electrical-load' },
  { id: 'pv', name: 'Production PV', icon: Sun, color: 'electrical-pv' },
  { id: 'cable', name: 'Câble', icon: Cable, color: 'tech-400' }
] as const;

export const Sidebar = ({ selectedTool, onToolChange, cableTypes }: SidebarProps) => {
  return (
    <div className="w-64 bg-card border-r p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Outils
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            
            return (
              <Button
                key={tool.id}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={`w-full justify-start ${
                  isSelected 
                    ? `bg-${tool.color} hover:bg-${tool.color}/90 text-white` 
                    : 'text-foreground hover:bg-secondary'
                }`}
                onClick={() => onToolChange(tool.id as any)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tool.name}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Types de câbles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cableTypes.map((cable) => (
            <div
              key={cable.id}
              className="p-2 rounded-md bg-muted text-xs"
            >
              <div className="font-medium">{cable.name}</div>
              <div className="text-muted-foreground">
                R: {cable.r12} Ω/km | X: {cable.x12} Ω/km
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Légende</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-status-compliant"></div>
            <span>Conforme (± 10%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-status-warning"></div>
            <span>Limite (± 7-10%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-status-critical"></div>
            <span>Non conforme</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};