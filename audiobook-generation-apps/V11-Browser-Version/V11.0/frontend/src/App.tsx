import { useState, useEffect, useMemo } from 'react'
import { api, Project } from './api'
import { Timeline } from './components/Timeline'

// Types for local state
interface ParsedChapter {
    title: string;
    chunks: { text: string; status: 'pending' | 'generating' | 'done' | 'error'; audioUrl?: string }[];
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [manuscript, setManuscript] = useState('')
  const [voices, setVoices] = useState<{id: string, name: string}[]>([])
  const [selectedVoice, setSelectedVoice] = useState('af_heart')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Parsed Timeline State
  const [timelineData, setTimelineData] = useState<ParsedChapter[]>([])
  const [activeTab, setActiveTab] = useState<'edit' | 'timeline'>('edit')

  useEffect(() => {
    loadProjects()
    loadVoices()
  }, [])

  // Auto-parse manuscript when saving or switching tabs
  useEffect(() => {
    if (activeTab === 'timeline') {
        parseManuscript()
    }
  }, [activeTab])

  function parseManuscript() {
    if (!manuscript) return
    
    // Simple parsing logic: Split by "# Header"
    const lines = manuscript.split('\n');
    const chapters: ParsedChapter[] = [];
    let currentChapter: ParsedChapter = { title: 'Introduction', chunks: [] };
    
    // Helper to add chunk
    const addChunk = (text: string) => {
        if (!text.trim()) return;
        // Basic sentence splitting for chunks (~200 chars)
        const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
        let buffer = "";
        sentences.forEach(s => {
            if (buffer.length + s.length > 300) {
                currentChapter.chunks.push({ text: buffer.trim(), status: 'pending' });
                buffer = "";
            }
            buffer += s;
        });
        if (buffer.trim()) currentChapter.chunks.push({ text: buffer.trim(), status: 'pending' });
    };

    lines.forEach(line => {
        if (line.trim().startsWith('#')) {
            if (currentChapter.chunks.length > 0) chapters.push(currentChapter);
            currentChapter = { title: line.replace(/^#+\s*/, ''), chunks: [] };
        } else {
            addChunk(line);
        }
    });
    if (currentChapter.chunks.length > 0) chapters.push(currentChapter);
    
    // Merge with existing state to preserve 'done' status/audio
    // In a real app, we'd use IDs to track chunks more robustly
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

  // Generate SINGLE chunk (placeholder for full loop)
  async function handleGenerateAudio() {
    if (!manuscript.trim()) return
    setIsGenerating(true)
    try {
      // Just demo generating the first chunk of first chapter
      parseManuscript(); // Ensure fresh
      const result = await api.generateAudio(manuscript.substring(0, 100), selectedVoice)
      alert(`Generated demo chunk! Saved to: ${result.outputPath}`)
    } catch (err) {
      alert('Generation failed: ' + err)
    } finally {
      setIsGenerating(false)
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
        <div className="flex gap-4">
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
              {/* Project List (Same as before) */}
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
                            placeholder="Enter your story here... Use # for Chapters."
                        />
                    ) : (
                        <Timeline 
                            chapters={timelineData}
                            onPlayChunk={(url) => { const a = new Audio(`http://localhost:3000${url}`); a.play(); }}
                        />
                    )}
                </div>

                {/* CONTROLS PANEL */}
                <div className="w-80 bg-bg-card flex flex-col shrink-0">
                    <div className="h-10 bg-slate-800/50 border-b border-slate-700 flex items-center px-4 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Generation</span>
                    </div>
                    <div className="p-4 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-400">Select Voice</label>
                            <select 
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="bg-bg-input border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-blue"
                            >
                                {voices.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            disabled={isGenerating || !manuscript.trim()}
                            onClick={handleGenerateAudio}
                            className={`w-full py-3 rounded font-bold text-sm shadow-lg transition-all ${isGenerating ? 'bg-warning-orange/50 cursor-wait' : 'bg-success-green hover:bg-emerald-500 shadow-emerald-900/20'}`}
                        >
                            {isGenerating ? 'GENERATING...' : 'GENERATE (DEMO)'}
                        </button>
                        
                        <div className="mt-auto border-t border-slate-700 pt-4">
                             <div className="text-[10px] text-slate-500 italic leading-tight">
                                Switch to "Timeline" tab to see parsed chapters and segments before generating.
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
