import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'

const ToolManager = ({ 
  selectedTool, 
  onToolSelect,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  brushSize = 1,
  onBrushSizeChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const tools = [
    {
      id: 'brush',
      name: 'Brush',
      icon: '🖌️',
      description: 'Paint pixels with selected color',
      shortcut: 'B'
    },
    {
      id: 'eraser',
      name: 'Eraser',
      icon: '🧽',
      description: 'Remove pixels (make transparent)',
      shortcut: 'E'
    },
    {
      id: 'fill',
      name: 'Fill',
      icon: '🪣',
      description: 'Fill connected area with color',
      shortcut: 'F'
    },
    {
      id: 'eyedropper',
      name: 'Eyedropper',
      icon: '💧',
      description: 'Pick color from canvas',
      shortcut: 'I'
    },
    {
      id: 'line',
      name: 'Line',
      icon: '📏',
      description: 'Draw straight lines',
      shortcut: 'L'
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: '⬜',
      description: 'Draw rectangles',
      shortcut: 'R'
    }
  ]

  const brushSizes = [1, 2, 3, 4, 5]

  const handleKeyboardShortcut = useCallback((event) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          event.preventDefault()
          if (event.shiftKey) {
            onRedo()
          } else {
            onUndo()
          }
          break
        case 'y':
          event.preventDefault()
          onRedo()
          break
        default:
          break
      }
    } else {
      const tool = tools.find(t => t.shortcut.toLowerCase() === event.key.toLowerCase())
      if (tool) {
        event.preventDefault()
        onToolSelect(tool.id)
      }
    }
  }, [tools, onToolSelect, onUndo, onRedo])

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut)
    return () => document.removeEventListener('keydown', handleKeyboardShortcut)
  }, [handleKeyboardShortcut])

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Tools</h2>
      
      {/* Main Tools */}
      <div className="space-y-2 mb-4">
        {tools.slice(0, 3).map((tool) => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => onToolSelect(tool.id)}
            title={`${tool.description} (${tool.shortcut})`}
          >
            <span className="mr-2">{tool.icon}</span>
            {tool.name}
          </Button>
        ))}
      </div>

      {/* Advanced Tools Toggle */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Tools
        </Button>
        
        {showAdvanced && (
          <div className="mt-2 space-y-2">
            {tools.slice(3).map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? 'default' : 'outline'}
                className="w-full justify-start text-sm"
                onClick={() => onToolSelect(tool.id)}
                title={`${tool.description} (${tool.shortcut})`}
              >
                <span className="mr-2">{tool.icon}</span>
                {tool.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Brush Size */}
      {(selectedTool === 'brush' || selectedTool === 'eraser') && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Brush Size:</h3>
          <div className="flex gap-1">
            {brushSizes.map((size) => (
              <Button
                key={size}
                size="sm"
                variant={brushSize === size ? 'default' : 'outline'}
                className="w-8 h-8 p-0 text-xs"
                onClick={() => onBrushSizeChange(size)}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Undo/Redo */}
      <div className="space-y-2 mb-4">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
        >
          ↷ Redo
        </Button>
      </div>

      {/* Tool Info */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Current Tool:</h3>
        <div className="bg-gray-50 p-3 rounded text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">
              {tools.find(t => t.id === selectedTool)?.icon}
            </span>
            <span className="font-medium">
              {tools.find(t => t.id === selectedTool)?.name}
            </span>
          </div>
          <p className="text-gray-600 text-xs">
            {tools.find(t => t.id === selectedTool)?.description}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Shortcut: {tools.find(t => t.id === selectedTool)?.shortcut}
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-2">Shortcuts:</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• B - Brush tool</div>
          <div>• E - Eraser tool</div>
          <div>• F - Fill tool</div>
          <div>• Ctrl+Z - Undo</div>
          <div>• Ctrl+Y - Redo</div>
          <div>• Mouse wheel - Zoom</div>
        </div>
      </div>
    </div>
  )
}

export default ToolManager

