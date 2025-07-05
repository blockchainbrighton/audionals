import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import PixelCanvas from './components/canvas/PixelCanvas.jsx'
import PaletteManager from './components/palette/PaletteManager.jsx'
import HUDManager from './components/hud/HUDManager.jsx'
import ToolManager from './components/tools/ToolManager.jsx'
import './App.css'

function App() {
  const [selectedColor, setSelectedColor] = useState('#FFD700')
  const [selectedTool, setSelectedTool] = useState('brush')
  const [brushSize, setBrushSize] = useState(1)
  const [pixelData, setPixelData] = useState(null)
  const [hudElements, setHudElements] = useState([])
  const [projectName, setProjectName] = useState('helmet-design')
  const [hudLetterColor, setHudLetterColor] = useState('#0066CC')
  const [hudTextSize, setHudTextSize] = useState('M')
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })
  
  // Custom palette colors
  const [customColors, setCustomColors] = useState([
    '#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF1493'
  ])

  // Refs for undo/redo functions
  const undoRef = useRef()
  const redoRef = useRef()

  const handlePixelDataChange = useCallback((newPixelData) => {
    setPixelData(newPixelData)
  }, [])

  const handleColorSelect = useCallback((color) => {
    setSelectedColor(color)
  }, [])

  const handleCustomColorsChange = useCallback((newColors) => {
    setCustomColors(newColors)
  }, [])

  const handleHudElementsChange = useCallback((newElements) => {
    setHudElements(newElements)
  }, [])

  const handleToolSelect = useCallback((tool) => {
    setSelectedTool(tool)
  }, [])

  const handleUndo = useCallback(() => {
    if (undoRef.current) {
      undoRef.current()
    }
  }, [])

  const handleRedo = useCallback(() => {
    if (redoRef.current) {
      redoRef.current()
    }
  }, [])

  const handleHistoryChange = useCallback((newHistoryState) => {
    setHistoryState(newHistoryState)
  }, [])

  const exportPixelData = () => {
    if (!pixelData) return ''
    
    return pixelData.map(row => 
      row.map(pixel => pixel || '000000').join(',')
    ).join('\n')
  }

  const clearCanvas = () => {
    setPixelData(null)
    setHudElements([])
  }

  const exportProject = () => {
    const projectData = {
      name: projectName,
      pixelData,
      hudElements,
      customColors,
      selectedColor,
      selectedTool,
      brushSize,
      hudLetterColor,
      hudTextSize,
      timestamp: new Date().toISOString(),
      version: '1.1'
    }
    
    const dataStr = JSON.stringify(projectData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectName}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  const loadProject = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result)
        
        if (projectData.name) setProjectName(projectData.name)
        if (projectData.pixelData) setPixelData(projectData.pixelData)
        if (projectData.hudElements) setHudElements(projectData.hudElements)
        if (projectData.customColors) setCustomColors(projectData.customColors)
        if (projectData.selectedColor) setSelectedColor(projectData.selectedColor)
        if (projectData.selectedTool) setSelectedTool(projectData.selectedTool)
        if (projectData.brushSize) setBrushSize(projectData.brushSize)
        if (projectData.hudLetterColor) setHudLetterColor(projectData.hudLetterColor)
        if (projectData.hudTextSize) setHudTextSize(projectData.hudTextSize)
        
        alert('Project loaded successfully!')
      } catch (error) {
        console.error('Error loading project:', error)
        alert('Error loading project file')
      }
    }
    reader.readAsText(file)
  }

  const exportPNG = () => {
    // Create a canvas to render the pixel art
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 64
    canvas.height = 64
    
    // Fill with transparent background
    ctx.clearRect(0, 0, 64, 64)
    
    // Draw pixels
    if (pixelData) {
      pixelData.forEach((row, y) => {
        row.forEach((color, x) => {
          if (color) {
            ctx.fillStyle = color
            ctx.fillRect(x, y, 1, 1)
          }
        })
      })
    }
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectName}.png`
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  // Set up color picker for eyedropper tool
  window.onColorPick = handleColorSelect

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Pixel Art Helmet Designer</h1>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={loadProject}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline">📁 Load Project</Button>
            </div>
            <Button variant="outline" onClick={exportProject}>💾 Save Project</Button>
            <Button onClick={clearCanvas}>🗑️ Clear</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Palette and HUD */}
        <aside className="w-80 bg-white border-r p-4 overflow-y-auto">
          {/* Palette Section */}
          <PaletteManager
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
            customColors={customColors}
            onCustomColorsChange={handleCustomColorsChange}
          />

          {/* HUD Section */}
          <HUDManager
            hudElements={hudElements}
            onHudElementsChange={handleHudElementsChange}
            hudLetterColor={hudLetterColor}
            onHudLetterColorChange={setHudLetterColor}
            hudTextSize={hudTextSize}
            onHudTextSizeChange={setHudTextSize}
          />

          {/* Tools Section */}
          <ToolManager
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyState.canUndo}
            canRedo={historyState.canRedo}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
          />
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 p-4 flex items-center justify-center">
          <PixelCanvas
            selectedColor={selectedColor}
            selectedTool={selectedTool}
            brushSize={brushSize}
            onPixelDataChange={handlePixelDataChange}
            hudElements={hudElements}
            onUndo={undoRef}
            onRedo={redoRef}
            onHistoryChange={handleHistoryChange}
          />
        </main>

        {/* Right Sidebar - Project Info */}
        <aside className="w-64 bg-white border-l p-4">
          <h2 className="text-lg font-semibold mb-3">Project Info</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name:</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Statistics:</h3>
              <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                <div>Pixels: {pixelData ? pixelData.flat().filter(p => p).length : 0}/4096</div>
                <div>HUD Elements: {hudElements.length}</div>
                <div>Colors Used: {pixelData ? new Set(pixelData.flat().filter(p => p)).size : 0}</div>
                <div>Tool: {selectedTool}</div>
                <div>Brush Size: {brushSize}px</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Pixel Array Data:</h3>
              <textarea
                className="w-full h-24 px-3 py-2 border rounded-md text-xs font-mono"
                readOnly
                value={exportPixelData()}
                placeholder="Pixel data will appear here..."
              />
            </div>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={exportPNG}>
                📷 Export PNG
              </Button>
              <Button variant="outline" className="w-full" onClick={exportProject}>
                💾 Export JSON
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App

