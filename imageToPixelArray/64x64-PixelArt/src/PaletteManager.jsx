import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'

const PaletteManager = ({ 
  selectedColor, 
  onColorSelect,
  customColors,
  onCustomColorsChange 
}) => {
  // Predefined color palettes
  const predefinedPalettes = {
    default: [
      '#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#FF4500',
      '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
      '#FFFFFF', '#0066CC', '#4169E1', '#8A2BE2', '#FF1493'
    ],
    helmet: [
      '#FFD700', '#FFA500', '#FF8C00', '#B8860B', '#DAA520',
      '#000000', '#1C1C1C', '#2F2F2F', '#404040', '#696969',
      '#C0C0C0', '#D3D3D3', '#E5E5E5', '#F5F5F5', '#FFFFFF'
    ],
    visor: [
      '#0066CC', '#1E90FF', '#4169E1', '#6495ED', '#87CEEB',
      '#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#AFEEEE',
      '#000080', '#191970', '#483D8B', '#6A5ACD', '#9370DB'
    ]
  }

  const [activePalette, setActivePalette] = useState('default')
  const [showColorPicker, setShowColorPicker] = useState(null)

  const handleCustomColorChange = useCallback((index, color) => {
    const newColors = [...customColors]
    newColors[index] = color
    onCustomColorsChange(newColors)
    setShowColorPicker(null)
  }, [customColors, onCustomColorsChange])

  const loadPalette = useCallback((paletteName) => {
    setActivePalette(paletteName)
    // Optionally update custom colors with the selected palette
    if (predefinedPalettes[paletteName]) {
      const paletteColors = predefinedPalettes[paletteName].slice(0, 5)
      onCustomColorsChange(paletteColors)
    }
  }, [onCustomColorsChange])

  const exportPalette = useCallback(() => {
    const paletteData = {
      name: `custom-palette-${Date.now()}`,
      colors: customColors,
      timestamp: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(paletteData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${paletteData.name}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }, [customColors])

  const importPalette = useCallback((event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const paletteData = JSON.parse(e.target.result)
        if (paletteData.colors && Array.isArray(paletteData.colors)) {
          onCustomColorsChange(paletteData.colors.slice(0, 5))
        }
      } catch (error) {
        console.error('Error importing palette:', error)
        alert('Error importing palette file')
      }
    }
    reader.readAsText(file)
  }, [onCustomColorsChange])

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Palette</h2>
      
      {/* Palette Presets */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Presets:</h3>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(predefinedPalettes).map((paletteName) => (
            <Button
              key={paletteName}
              size="sm"
              variant={activePalette === paletteName ? 'default' : 'outline'}
              onClick={() => loadPalette(paletteName)}
              className="capitalize"
            >
              {paletteName}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Palette Colors */}
      <div className="grid grid-cols-8 gap-1 mb-4">
        {predefinedPalettes[activePalette].map((color, index) => (
          <button
            key={index}
            className={`w-8 h-8 border-2 rounded transition-all hover:scale-110 ${
              selectedColor === color ? 'border-gray-800 ring-2 ring-blue-300' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(color)}
            title={color}
          />
        ))}
      </div>
      
      {/* Custom Colors */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">User Palette Colors:</h3>
        <div className="space-y-2">
          {customColors.map((color, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm w-16">Color {index + 1}:</span>
              <div className="relative">
                <button
                  className={`w-8 h-8 border-2 rounded cursor-pointer transition-all hover:scale-110 ${
                    selectedColor === color ? 'border-gray-800 ring-2 ring-blue-300' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setShowColorPicker(showColorPicker === index ? null : index)}
                />
                {showColorPicker === index && (
                  <div className="absolute top-10 left-0 z-10 bg-white p-2 border rounded shadow-lg">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleCustomColorChange(index, e.target.value)}
                      className="w-16 h-8 border rounded cursor-pointer"
                    />
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => setShowColorPicker(null)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onColorSelect(color)}
              >
                Use
              </Button>
              <input
                type="text"
                value={color}
                onChange={(e) => handleCustomColorChange(index, e.target.value)}
                className="w-20 px-2 py-1 text-xs border rounded font-mono"
                placeholder="#FFFFFF"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Palette Management */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Palette Management:</h3>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportPalette}>
            Export Palette
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={importPalette}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button size="sm" variant="outline">
              Import Palette
            </Button>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onCustomColorsChange(['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF1493'])}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Current Color Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Selected Color:</span>
          <div
            className="w-8 h-8 border-2 border-gray-300 rounded"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="font-mono text-sm">{selectedColor}</span>
        </div>
      </div>
    </div>
  )
}

export default PaletteManager

