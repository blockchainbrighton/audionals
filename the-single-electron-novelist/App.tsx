import React, { useState, useEffect } from 'react';
import { NovelConcept, Chapter, WorldContext, AppPhase } from './types';
import { ConceptPhase } from './components/ConceptPhase';
import { OutlinePhase } from './components/OutlinePhase';
import { WritingPhase } from './components/WritingPhase';
import { ProjectManager } from './components/ProjectManager';
import { ProjectState, saveLocal, loadLocal } from './services/storage';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [phase, setPhase] = useState<AppPhase>('concept');
  
  // App State
  const [concept, setConcept] = useState<NovelConcept>({
    title: "",
    premise: "",
    style: "",
    theme: ""
  });
  
  const [outline, setOutline] = useState<Chapter[]>([]);
  
  const [worldContext, setWorldContext] = useState<WorldContext>({
    characters: [],
    locations: []
  });

  // Load on startup
  useEffect(() => {
    const savedState = loadLocal();
    if (savedState) {
      setConcept(savedState.concept);
      setOutline(savedState.outline);
      setWorldContext(savedState.worldContext);
      setPhase(savedState.phase);
    }
    setIsLoaded(true);
  }, []);

  // Auto-save on change
  useEffect(() => {
    if (!isLoaded) return;
    
    const currentState: ProjectState = {
      concept,
      outline,
      worldContext,
      phase,
      lastUpdated: Date.now()
    };
    saveLocal(currentState);
  }, [concept, outline, worldContext, phase, isLoaded]);

  const handleLoadProject = (state: ProjectState) => {
    setConcept(state.concept);
    setOutline(state.outline);
    setWorldContext(state.worldContext);
    setPhase(state.phase);
  };

  const handleReset = () => {
    setConcept({ title: "", premise: "", style: "", theme: "" });
    setOutline([]);
    setWorldContext({ characters: [], locations: [] });
    setPhase('concept');
  };

  if (!isLoaded) return null; // Or a loading spinner

  const currentState: ProjectState = {
    concept,
    outline,
    worldContext,
    phase,
    lastUpdated: Date.now()
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans relative">
      {phase === 'concept' && (
        <ConceptPhase 
          concept={concept} 
          setConcept={setConcept} 
          onNext={() => setPhase('outline')} 
        />
      )}
      
      {phase === 'outline' && (
        <OutlinePhase 
          concept={concept}
          outline={outline}
          setOutline={setOutline}
          onBack={() => setPhase('concept')}
          onNext={() => setPhase('writing')}
        />
      )}
      
      {phase === 'writing' && (
        <WritingPhase 
          concept={concept}
          outline={outline}
          setOutline={setOutline}
          worldContext={worldContext}
          setWorldContext={setWorldContext}
          onBack={() => setPhase('outline')}
        />
      )}

      <ProjectManager 
        currentState={currentState}
        onLoad={handleLoadProject}
        onReset={handleReset}
      />
    </div>
  );
};

export default App;
