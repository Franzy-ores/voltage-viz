import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download, Upload, Save, FileText } from "lucide-react";
import { Project } from "../ElectricalNetworkCalculator";

interface TopBarProps {
  project: Project;
  onProjectChange: (project: Project) => void;
  onCalculate: () => void;
}

export const TopBar = ({ project, onProjectChange, onCalculate }: TopBarProps) => {
  const handleProjectNameChange = (name: string) => {
    onProjectChange({ ...project, name });
  };

  const handleVoltageTypeChange = (voltageType: '230V' | '400V') => {
    onProjectChange({ ...project, voltageType });
  };

  const saveProject = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}.json`;
    link.click();
  };

  const loadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedProject = JSON.parse(e.target?.result as string);
          onProjectChange(loadedProject);
        } catch (error) {
          console.error('Erreur lors du chargement du projet:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-14 border-b bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <Input
            value={project.name}
            onChange={(e) => handleProjectNameChange(e.target.value)}
            className="w-48"
            placeholder="Nom du projet"
          />
        </div>
        
        <Select value={project.voltageType} onValueChange={handleVoltageTypeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="230V">230V</SelectItem>
            <SelectItem value="400V">400V</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onCalculate}
          className="bg-electrical-supply text-white hover:bg-electrical-supply/90"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calculer
        </Button>
        
        <Button variant="outline" onClick={saveProject}>
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder
        </Button>
        
        <label className="cursor-pointer">
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Charger
            </span>
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={loadProject}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};