import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'

const HUDManager = ({ 
  hudElements, 
  onHudElementsChange,
  hudLetterColor,
  onHudLetterColorChange,
  hudTextSize,
  onHudTextSizeChange 
}) => {
  const [selectedElement, setSelectedElement] = useState(null)
  const [customText, setCustomText] = useState('')
  const [curvedMode, setCurvedMode] = useState(false)

  const addHUDElement = useCallback((text, position = null) => {
    // Auto-position if no position specified
    const autoPosition = position || {
      x: 15 + (hudElements.length * 3),
      y: 15 + (hudElements.length % 3) * 5
    }

    const newElement = {
      id: Date.now(),
      text,
      position: autoPosition,
      size: hudTextSize,
      color: hudLetterColor,
      curved: curvedMode,
      opacity: 1.0,
      rotation: 0
    }
    
    onHudElementsChange([...hudElements, newElement])
  }, [hudElements, hudTextSize, hudLetterColor, curvedMode, onHudElementsChange])

  const updateHUDElement = useCallback((id, updates) => {
    const updatedElements = hudElements.map(element =>
      element.id === id ? { ...element, ...updates } : element
    )
    onHudElementsChange(updatedElements)
  }, [hudElements, onHudElementsChange])

  const removeHUDElement = useCallback((id) => {
    const filteredElements = hudElements.filter(element => element.id !== id)
    onHudElementsChange(filteredElements)
    if (selectedElement?.id === id) {
      setSelectedElement(null)
    }
  }, [hudElements, selectedElement, onHudElementsChange])

  const addLetterToHUD = useCallback((letter) => {
    addHUDElement(letter)
  }, [addHUDElement])

  const addCustomText = useCallback(() => {
    if (customText.trim()) {
      addHUDElement(customText.trim())
      setCustomText('')
    }
  }, [customText, addHUDElement])

  const presetTexts = [
    'DISPLAY', 'HELMET', 'STATUS', 'ONLINE', 'READY',
    'POWER', 'SYSTEM', 'ERROR', 'WARNING', 'OK'
  ]

  const visorShapes = [
    { name: 'Flat', curved: false, rotation: 0 },
    { name: 'Curved', curved: true, rotation: 0 },
    { name: 'Angled', curved: false, rotation: -5 },
    { name: 'Dome', curved: true, rotation: 10 }
  ]

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">HUD Elements</h2>
      
      {/* HUD Color and Size Controls */}
      <div className="mb-4 space-y-3">
        <div>
          <h3 className="text-sm font-medium mb-2">Letter Colour:</h3>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="w-8 h-8 border rounded cursor-pointer"
              value={hudLetterColor}
              onChange={(e) => onHudLetterColorChange(e.target.value)}
            />
            <span className="font-mono text-sm">{hudLetterColor}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Text Size:</h3>
          <div className="flex gap-2">
            {['S', 'M', 'L'].map((size) => (
              <Button 
                key={size}
                size="sm" 
                variant={hudTextSize === size ? 'default' : 'outline'}
                onClick={() => onHudTextSizeChange(size)}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Visor Style:</h3>
          <div className="flex gap-1 flex-wrap">
            {visorShapes.map((shape) => (
              <Button
                key={shape.name}
                size="sm"
                variant={curvedMode === shape.curved ? 'default' : 'outline'}
                onClick={() => setCurvedMode(shape.curved)}
                className="text-xs"
              >
                {shape.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Letter Bank */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Letter Bank:</h3>
        <div className="grid grid-cols-10 gap-1 text-xs">
          {'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => (
            <Button
              key={char}
              size="sm"
              variant="outline"
              className="w-6 h-6 p-0 text-xs"
              onClick={() => addLetterToHUD(char)}
            >
              {char}
            </Button>
          ))}
        </div>
      </div>

      {/* Preset Text Buttons */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Preset Text:</h3>
        <div className="grid grid-cols-2 gap-1">
          {presetTexts.map((text) => (
            <Button
              key={text}
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => addHUDElement(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Text Input */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Custom Text:</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter custom text..."
            className="flex-1 px-2 py-1 text-sm border rounded"
            onKeyPress={(e) => e.key === 'Enter' && addCustomText()}
          />
          <Button size="sm" onClick={addCustomText}>
            Add
          </Button>
        </div>
      </div>

      {/* HUD Elements List */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">
          Active Elements ({hudElements.length}):
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {hudElements.map((element) => (
            <div 
              key={element.id} 
              className={`flex items-center justify-between p-2 border rounded text-xs ${
                selectedElement?.id === element.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
              }`}
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => setSelectedElement(element)}
              >
                <span className="font-medium">"{element.text}"</span>
                <div className="text-gray-500">
                  Pos: ({element.position.x}, {element.position.y}) | 
                  Size: {element.size} | 
                  {element.curved ? 'Curved' : 'Flat'}
                </div>
              </div>
              <button
                onClick={() => removeHUDElement(element.id)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ×
              </button>
            </div>
          ))}
          {hudElements.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No HUD elements added yet
            </div>
          )}
        </div>
      </div>

      {/* Element Editor */}
      {selectedElement && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">
            Edit: "{selectedElement.text}"
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs">X Position:</label>
                <input
                  type="number"
                  value={selectedElement.position.x}
                  onChange={(e) => updateHUDElement(selectedElement.id, {
                    position: { ...selectedElement.position, x: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
              </div>
              <div>
                <label className="text-xs">Y Position:</label>
                <input
                  type="number"
                  value={selectedElement.position.y}
                  onChange={(e) => updateHUDElement(selectedElement.id, {
                    position: { ...selectedElement.position, y: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs">Text:</label>
              <input
                type="text"
                value={selectedElement.text}
                onChange={(e) => updateHUDElement(selectedElement.id, { text: e.target.value })}
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs">
                <input
                  type="checkbox"
                  checked={selectedElement.curved}
                  onChange={(e) => updateHUDElement(selectedElement.id, { curved: e.target.checked })}
                  className="mr-1"
                />
                Curved Visor Effect
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Quick Actions:</h3>
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onHudElementsChange([])}
          >
            Clear All
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              const updatedElements = hudElements.map(el => ({ ...el, curved: !el.curved }))
              onHudElementsChange(updatedElements)
            }}
          >
            Toggle Curve
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              const updatedElements = hudElements.map(el => ({ 
                ...el, 
                color: hudLetterColor 
              }))
              onHudElementsChange(updatedElements)
            }}
          >
            Apply Color
          </Button>
        </div>
      </div>
    </div>
  )
}

export default HUDManager

