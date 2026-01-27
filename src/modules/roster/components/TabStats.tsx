
import React from 'react';
import { CharacterData, Resource } from '../types';
import { Card, SectionHeader, StyledInput, Button, Icons } from './Shared';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  onStatsChange: (stats: CharacterData['stats']) => void;
  onResourcesChange: (resources: Resource[]) => void;
}

const TabStats: React.FC<Props> = ({ character, isEditMode, onStatsChange, onResourcesChange }) => {

  const addResource = () => {
    onResourcesChange([...character.resources, { label: "Новый", current: 10, max: 10 }]);
  };

  const removeResource = (index: number) => {
    const next = [...character.resources];
    next.splice(index, 1);
    onResourcesChange(next);
  };

  const updateResource = (index: number, field: keyof Resource, value: any) => {
    const next = [...character.resources];
    next[index] = { ...next[index], [field]: value };
    onResourcesChange(next);
  };

  // Data for Chart
  const chartData = [
    { subject: 'Физ', A: character.stats.phys, fullMark: 20 },
    { subject: 'Маг', A: character.stats.magic, fullMark: 20 },
    { subject: 'Уник', A: character.stats.unique, fullMark: 20 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <div className="space-y-6">
        <Card>
          <SectionHeader title="Характеристики" />
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 p-4 bg-red-900/20 rounded border border-red-900/50">
              <div className="text-2xl font-bold text-red-500 w-12 text-center">ФИЗ</div>
              <div className="flex-1">
                <StyledInput
                  label="Физическая мощь"
                  type="number"
                  value={character.stats.phys}
                  onChange={(e) => onStatsChange({ ...character.stats, phys: parseInt(e.target.value) || 0 })}
                  isEditMode={isEditMode}
                  className="text-lg font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-900/20 rounded border border-blue-900/50">
              <div className="text-2xl font-bold text-blue-500 w-12 text-center">МАГ</div>
              <div className="flex-1">
                <StyledInput
                  label="Магическая сила"
                  type="number"
                  value={character.stats.magic}
                  onChange={(e) => onStatsChange({ ...character.stats, magic: parseInt(e.target.value) || 0 })}
                  isEditMode={isEditMode}
                  className="text-lg font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-purple-900/20 rounded border border-purple-900/50">
              <div className="text-2xl font-bold text-purple-500 w-12 text-center">УНИК</div>
              <div className="flex-1">
                <StyledInput
                  label="Уникальное свойство"
                  type="number"
                  value={character.stats.unique}
                  onChange={(e) => onStatsChange({ ...character.stats, unique: parseInt(e.target.value) || 0 })}
                  isEditMode={isEditMode}
                  className="text-lg font-bold"
                />
              </div>
            </div>
          </div>
        </Card>

        {!isEditMode && (
          <Card className="h-64 relative block">
             {/* Fix: explicit pixel min-height/width on parent div to prevent Recharts calculation errors */}
             <div style={{ width: '100%', height: '100%', minHeight: '200px', minWidth: '300px', position: 'relative' }}>
               <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 20]} tick={false} axisLine={false} />
                        <Radar
                          name="Stats"
                          dataKey="A"
                          stroke="#06b6d4"
                          strokeWidth={3}
                          fill="#06b6d4"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
               </div>
             </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <SectionHeader title="Ресурсы">
            {isEditMode && <Button size="sm" onClick={addResource}><Icons.Plus /> Добавить</Button>}
          </SectionHeader>
          
          <div className="space-y-4">
            {character.resources.map((res, idx) => (
              <div key={idx} className="flex items-end gap-3 bg-gray-800 p-3 rounded border border-gray-700">
                <div className="flex-1">
                  <StyledInput
                    label="Название"
                    value={res.label}
                    onChange={(e) => updateResource(idx, 'label', e.target.value)}
                    isEditMode={isEditMode}
                    className="font-semibold text-cyan-400"
                  />
                </div>
                <div className="w-20">
                   <StyledInput
                    label="Тек."
                    type="number"
                    value={res.current}
                    onChange={(e) => updateResource(idx, 'current', parseInt(e.target.value))}
                    isEditMode={isEditMode}
                    className="text-center"
                  />
                </div>
                <div className="text-gray-500 pb-3">/</div>
                <div className="w-20">
                   <StyledInput
                    label="Макс."
                    type="number"
                    value={res.max}
                    onChange={(e) => updateResource(idx, 'max', parseInt(e.target.value))}
                    isEditMode={isEditMode}
                    className="text-center"
                  />
                </div>
                
                {/* Visual Bar in Preview */}
                {!isEditMode && (
                  <div className="absolute bottom-0 left-0 h-1 bg-cyan-600 rounded-b opacity-50" style={{ width: `${Math.min(100, (res.current / res.max) * 100)}%` }}></div>
                )}
                
                {isEditMode && (
                  <div className="pb-1">
                    <Button variant="danger" size="sm" onClick={() => removeResource(idx)}><Icons.Trash /></Button>
                  </div>
                )}
              </div>
            ))}
            {character.resources.length === 0 && <div className="text-center text-gray-500 py-4">Нет ресурсов</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TabStats;
