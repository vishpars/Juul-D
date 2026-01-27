
import { CharacterData } from '../types';

export const downloadCharacterFile = (data: CharacterData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.profile.name.replace(/\s+/g, '_')}_sheet.json`;
  a.click();
  URL.revokeObjectURL(url);
};
