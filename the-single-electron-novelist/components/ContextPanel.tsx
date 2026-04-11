import React, { useState } from 'react';
import { WorldContext, Character, Location } from '../types';
import { Plus, Trash2, Users, MapPin, ChevronRight, ChevronDown } from 'lucide-react';

interface ContextPanelProps {
  worldContext: WorldContext;
  setWorldContext: React.Dispatch<React.SetStateAction<WorldContext>>;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ worldContext, setWorldContext }) => {
  const [activeTab, setActiveTab] = useState<'chars' | 'locs'>('chars');
  const [isOpen, setIsOpen] = useState(true);

  const addCharacter = () => {
    const newChar: Character = { id: crypto.randomUUID(), name: 'New Character', bio: 'Description...' };
    setWorldContext(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
  };

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setWorldContext(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const removeCharacter = (id: string) => {
    setWorldContext(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id)
    }));
  };

  const addLocation = () => {
    const newLoc: Location = { id: crypto.randomUUID(), name: 'New Location', description: 'Description...' };
    setWorldContext(prev => ({ ...prev, locations: [...prev.locations, newLoc] }));
  };

  const updateLocation = (id: string, field: keyof Location, value: string) => {
    setWorldContext(prev => ({
      ...prev,
      locations: prev.locations.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const removeLocation = (id: string) => {
    setWorldContext(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l.id !== id)
    }));
  };

  if (!isOpen) {
    return (
      <div className="w-12 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col items-center pt-4">
        <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
           <Users size={20} className="text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full flex flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">World Context</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('chars')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'chars' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> Characters
        </button>
        <button
          onClick={() => setActiveTab('locs')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'locs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MapPin size={16} /> Places
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'chars' ? (
          <>
            {worldContext.characters.map(char => (
              <div key={char.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 group">
                <div className="flex justify-between items-start">
                  <input
                    value={char.name}
                    onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                    className="bg-transparent font-bold text-gray-800 dark:text-gray-100 w-full focus:outline-none focus:border-b border-blue-500"
                    placeholder="Name"
                  />
                  <button onClick={() => removeCharacter(char.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={char.bio}
                  onChange={(e) => updateCharacter(char.id, 'bio', e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                  rows={3}
                  placeholder="Bio..."
                />
              </div>
            ))}
            <button
              onClick={addCharacter}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-500 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add Character
            </button>
          </>
        ) : (
          <>
            {worldContext.locations.map(loc => (
              <div key={loc.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 group">
                <div className="flex justify-between items-start">
                  <input
                    value={loc.name}
                    onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
                    className="bg-transparent font-bold text-gray-800 dark:text-gray-100 w-full focus:outline-none focus:border-b border-blue-500"
                    placeholder="Name"
                  />
                  <button onClick={() => removeLocation(loc.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={loc.description}
                  onChange={(e) => updateLocation(loc.id, 'description', e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                  rows={3}
                  placeholder="Description..."
                />
              </div>
            ))}
            <button
              onClick={addLocation}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-500 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add Location
            </button>
          </>
        )}
      </div>
    </div>
  );
};
