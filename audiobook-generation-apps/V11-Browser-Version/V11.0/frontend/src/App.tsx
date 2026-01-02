import { useState, useEffect } from 'react'
import { api, Project } from './api'
import { Timeline } from './components/Timeline'

// Types for local state
interface ParsedChapter {
    title: string;
    chunks: { 
        text: string; 
        status: 'pending' | 'generating' | 'done' | 'error'; 
        audioUrl?: string;
        voiceId: string; // Specific voice for this chunk
        role: 'narrator' | 'character';
    }[];
    chapterAudioUrl?: string; // New: Merged audio for the whole chapter
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [manuscript, setManuscript] = useState('')
  const [voices, setVoices] = useState<{id: string, name: string}[]>([])
  
  // Dual Voice Settings
  const [narratorVoice, setNarratorVoice] = useState('af_heart')
  const [characterVoice, setCharacterVoice] = useState('am_michael')
  
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Parsed Timeline State
  const [timelineData, setTimelineData] = useState<ParsedChapter[]>([])
  const [activeTab, setActiveTab] = useState<'edit' | 'timeline'>('edit')
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark')

  useEffect(() => {
    loadProjects()
    loadVoices()
    
    // Add Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            handleSaveManuscript();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, manuscript]) // Re-bind shortcuts when manuscript changes

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  // Auto-parse manuscript when switching to timeline
  useEffect(() => {
    if (activeTab === 'timeline') {
        parseManuscript()
    }
  }, [activeTab, narratorVoice, characterVoice]) // Re-parse if voices change

  function parseManuscript() {
    if (!manuscript) return
    
    const lines = manuscript.split('\n');
    const chapters: ParsedChapter[] = [];
    let currentChapter: ParsedChapter = { title: 'Introduction', chunks: [] };
    
    // State for parsing
    let currentRole: 'narrator' | 'character' = 'narrator';

    const addChunk = (text: string, role: 'narrator' | 'character') => {
        if (!text.trim()) return;
        
        // Split long chunks
        const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
        let buffer = "";
        
        const commitBuffer = () => {
            if (buffer.trim()) {
                currentChapter.chunks.push({ 
                    text: buffer.trim(), 
                    status: 'pending', 
                    role: role,
                    voiceId: role === 'narrator' ? narratorVoice : characterVoice
                });
                buffer = "";
            }
        };

        sentences.forEach(s => {
            if (buffer.length + s.length > 300) {
                commitBuffer();
            }
            buffer += s;
        });
        commitBuffer();
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        
        // 1. Chapter Detection
        if (trimmed.startsWith('#')) {
            if (currentChapter.chunks.length > 0) chapters.push(currentChapter);
            currentChapter = { title: trimmed.replace(/^#+\s*/, ''), chunks: [] };
            currentRole = 'narrator'; // Reset role on new chapter
        } 
        // 2. Voice Switch Detection
        else if (trimmed === '* * *' || trimmed === '***') {
            currentRole = currentRole === 'narrator' ? 'character' : 'narrator';
        }
        // 3. Content
        else {
            addChunk(trimmed, currentRole);
        }
    });
    
    if (currentChapter.chunks.length > 0) chapters.push(currentChapter);
    
    // In a real app, merge with existing 'done' chunks here to avoid re-generating
    // For now, we simply set the state, which resets status (Prototype limitation)
    setTimelineData(chapters); 
  }

  async function loadProjects() {
    try {
      const data = await api.getProjects()
      setProjects(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadVoices() {
    try {
      const data = await api.getVoices()
      setVoices(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectTitle.trim()) return
    try {
      const newProj = await api.createProject(newProjectTitle, '')
      setNewProjectTitle('')
      loadProjects()
      handleSelectProject(newProj)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSelectProject(project: Project) {
    try {
      const fullProject = await api.getProject(project.id)
      setSelectedProject(fullProject)
      setManuscript(fullProject.data?.manuscript || '')
      setActiveTab('edit')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveManuscript() {
    if (!selectedProject) return
    try {
      const updatedData = { ...selectedProject.data, manuscript }
      await api.updateProject(selectedProject.id, { data: updatedData })
      setSelectedProject({ ...selectedProject, data: updatedData })
      alert('Project Saved')
    } catch (err) {
      console.error(err)
    }
  }

  // Full Loop Generation with Merging
  async function handleGenerateAll() {
    if (timelineData.length === 0) return;
    setIsGenerating(true);

    const newTimeline = [...timelineData];

    try {
        for (let cIdx = 0; cIdx < newTimeline.length; cIdx++) {
            const chapter = newTimeline[cIdx];
            const chapterAudioUrls: string[] = [];

            for (let chIdx = 0; chIdx < chapter.chunks.length; chIdx++) {
                const chunk = chapter.chunks[chIdx];
                
                // If already done, preserve it
                if (chunk.status === 'done' && chunk.audioUrl) {
                    chapterAudioUrls.push(chunk.audioUrl);
                    continue; 
                }

                // Update UI: Generating
                newTimeline[cIdx].chunks[chIdx].status = 'generating';
                setTimelineData([...newTimeline]);

                try {
                    const res = await api.generateAudio(chunk.text, chunk.voiceId);
                    
                    // Update UI: Done
                    newTimeline[cIdx].chunks[chIdx].status = 'done';
                    newTimeline[cIdx].chunks[chIdx].audioUrl = `http://localhost:3000${res.url}`;
                    setTimelineData([...newTimeline]);
                    
                    chapterAudioUrls.push(`http://localhost:3000${res.url}`);

                } catch (e) {
                    console.error(e);
                    newTimeline[cIdx].chunks[chIdx].status = 'error';
                    setTimelineData([...newTimeline]);
                }
            }

            // MERGE CHAPTER
            if (chapterAudioUrls.length > 0) {
                 try {
                     const mergeRes = await api.mergeAudio(chapterAudioUrls, chapter.title);
                     newTimeline[cIdx].chapterAudioUrl = `http://localhost:3000${mergeRes.url}`;
                     setTimelineData([...newTimeline]);
                 } catch (e) {
                     console.error("Merge failed for chapter " + cIdx, e);
                 }
            }
        }
        alert('Batch Generation & Merging Complete!');
    } catch (err) {
        alert('Generation interrupted: ' + err);
    } finally {
        setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-200">
      {/* HEADER */}
      <header className="h-12 bg-bg-card border-b border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="font-bold text-lg flex items-center gap-2 cursor-pointer" onClick={() => setSelectedProject(null)}>
          Audiobook Studio <span className="text-[10px] bg-primary-blue px-2 py-0.5 rounded text-white">V11 HYBRID</span>
        </div>
        {selectedProject && (
          <div className="flex gap-4 text-sm">
             <button onClick={() => setActiveTab('edit')} className={`px-3 py-1 rounded ${activeTab === 'edit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Editor</button>
             <button onClick={() => setActiveTab('timeline')} className={`px-3 py-1 rounded ${activeTab === 'timeline' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Timeline</button>
          </div>
        )}
        <div className="flex gap-4 items-center">
            <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-full hover:bg-slate-700 transition-colors text-lg"
                title="Toggle Theme"
            >
                {theme === 'dark' ? '☀' : '🌙'}
            </button>
            <button className="text-sm hover:text-white transition-colors">Settings</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col p-4 gap-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</div>
            <button onClick={() => { setSelectedProject(null); loadProjects(); }} className="text-xs text-primary-blue hover:underline">View All</button>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => handleSelectProject(p)}
                className={`p-2 rounded cursor-pointer text-sm truncate transition-colors ${selectedProject?.id === p.id ? 'bg-primary-blue/20 text-primary-blue border-l-2 border-primary-blue' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                📂 {p.title}
              </div>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <section className="flex-1 bg-bg-dark overflow-hidden flex flex-col">
          {!selectedProject ? (
            <div className="p-8 max-w-4xl mx-auto w-full">
              {/* Project List */}
              <h1 className="text-3xl font-bold mb-8 text-white">Welcome to Audiobook Studio</h1>
              
              <div className="bg-bg-card p-6 rounded-lg border border-slate-700 shadow-xl">
                <h2 className="text-xl font-semibold mb-4 text-slate-100">Start a New Project</h2>
                <form onSubmit={handleCreateProject} className="flex gap-4">
                  <input 
                    type="text" 
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Project Title (e.g. My Great Novel)" 
                    className="flex-1 bg-bg-input border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-primary-blue text-white"
                  />
                  <button type="submit" className="bg-primary-blue hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors shadow-lg shadow-blue-900/20">
                    Create
                  </button>
                </form>
              </div>

              <div className="mt-12">
                <h2 className="text-xl font-semibold mb-6 text-slate-100">Recent Projects</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handleSelectProject(p)}
                        className="bg-bg-card p-4 rounded border border-slate-700 hover:border-primary-blue/50 cursor-pointer transition-all hover:shadow-lg group"
                      >
                        <div className="font-bold text-lg group-hover:text-primary-blue transition-colors">{p.title}</div>
                        <div className="text-sm text-slate-500 mt-1">Created: {new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
                {/* EDITOR / TIMELINE PANEL */}
                <div className="flex-1 flex flex-col border-r border-slate-700">
                    <div className="h-10 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{activeTab === 'edit' ? 'Manuscript' : 'Timeline Preview'}</span>
                        <div className="flex gap-2">
                            <button onClick={handleSaveManuscript} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors">SAVE PROJECT</button>
                        </div>
                    </div>
                    
                    {activeTab === 'edit' ? (
                        <textarea 
                            className="flex-1 bg-bg-dark p-6 resize-none focus:outline-none text-lg leading-relaxed font-serif text-slate-300"
                            value={manuscript}
                            onChange={(e) => setManuscript(e.target.value)}
                            placeholder="Enter your story here...&#10;# Chapter 1&#10;Once upon a time...&#10;* * *&#10;Dialogue here...&#10;* * *&#10;Back to narrator..."
                        />
                    ) : (
                        <Timeline 
                            chapters={timelineData}
                            onPlayChunk={(url) => { const a = new Audio(url); a.play(); }}
                        />
                    )}
                </div>

                {/* CONTROLS PANEL */}
                <div className="w-80 bg-bg-card flex flex-col shrink-0">
                    <div className="h-10 bg-slate-800/50 border-b border-slate-700 flex items-center px-4 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Voice Casting</span>
                    </div>
                    <div className="p-4 flex flex-col gap-6">
                        {/* Narrator Voice */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-primary-blue">Narrator Voice</label>
                            <select 
                                value={narratorVoice}
                                onChange={(e) => setNarratorVoice(e.target.value)}
                                className="bg-bg-input border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-blue"
                            >
                                {voices.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                                ))}
                            </select>
                        </div>

                        {/* Character Voice */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-success-green">Character Voice</label>
                            <select 
                                value={characterVoice}
                                onChange={(e) => setCharacterVoice(e.target.value)}
                                className="bg-bg-input border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-success-green"
                            >
                                {voices.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                                ))}
                            </select>
                            <div className="text-[10px] text-slate-500">
                                Use <span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">* * *</span> in text to toggle.
                            </div>
                        </div>

                        <div className="h-px bg-slate-700 my-2"></div>

                        <button 
                            disabled={isGenerating || timelineData.length === 0}
                            onClick={handleGenerateAll}
                            className={`w-full py-3 rounded font-bold text-sm shadow-lg transition-all ${isGenerating ? 'bg-warning-orange/50 cursor-wait' : 'bg-primary-blue hover:bg-blue-600 shadow-blue-900/20'}`}
                        >
                            {isGenerating ? 'GENERATING BATCH...' : 'GENERATE ALL'}
                        </button>
                        
                        <div className="mt-auto border-t border-slate-700 pt-4">
                             <div className="text-[10px] text-slate-500 italic leading-tight">
                                Audio is generated sequentially. Do not close this tab while processing.
                             </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
