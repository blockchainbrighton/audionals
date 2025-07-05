import { useState, useRef, useCallback, useEffect } from 'react'

const GRID_SIZE = 64
const PIXEL_SIZE = 8
const MAX_HISTORY = 50

const PixelCanvas = ({ 
  selectedColor = '#FFD700', 
  selectedTool = 'brush',
  brushSize = 1,
  onPixelDataChange,
  hudElements = [],
  onUndo,
  onRedo,
  onHistoryChange
}) => {
  // Initialize 64x64 grid with transparent pixels (null)
  const [pixelGrid, setPixelGrid] = useState(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  )
  
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [previewGrid, setPreviewGrid] = useState(null)
  
  const canvasRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Update parent component when pixel data changes
  useEffect(() => {
    if (onPixelDataChange) {
      onPixelDataChange(pixelGrid)
    }
  }, [pixelGrid, onPixelDataChange])

  // Update history change callback
  useEffect(() => {
    if (onHistoryChange) {
      onHistoryChange({
        canUndo: historyIndex >= 0,
        canRedo: historyIndex < history.length - 1
      })
    }
  }, [history, historyIndex, onHistoryChange])

  const saveToHistory = useCallback((newGrid) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newGrid.map(row => [...row]))
      return newHistory.slice(-MAX_HISTORY)
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setPixelGrid(history[historyIndex])
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setPixelGrid(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // Expose undo/redo to parent
  useEffect(() => {
    if (onUndo) onUndo.current = undo
    if (onRedo) onRedo.current = redo
  }, [undo, redo, onUndo, onRedo])

  const getPixelCoordinates = useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left - pan.x) / (PIXEL_SIZE * zoom))
    const y = Math.floor((event.clientY - rect.top - pan.y) / (PIXEL_SIZE * zoom))
    return { x, y }
  }, [zoom, pan])

  const isValidCoordinate = (x, y) => {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
  }

  const paintPixel = useCallback((x, y, grid = pixelGrid, color = selectedColor) => {
    if (!isValidCoordinate(x, y)) return grid

    const newGrid = grid.map(row => [...row])
    
    // Apply brush size
    const halfSize = Math.floor(brushSize / 2)
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const px = x + dx
        const py = y + dy
        if (isValidCoordinate(px, py)) {
          switch (selectedTool) {
            case 'brush':
              newGrid[py][px] = color
              break
            case 'eraser':
              newGrid[py][px] = null
              break
            default:
              break
          }
        }
      }
    }
    
    return newGrid
  }, [selectedColor, selectedTool, brushSize, pixelGrid])

  const floodFill = useCallback((startX, startY, targetColor, newColor) => {
    if (targetColor === newColor) return pixelGrid
    
    const newGrid = pixelGrid.map(row => [...row])
    const stack = [[startX, startY]]
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()
      
      if (!isValidCoordinate(x, y) || newGrid[y][x] !== targetColor) continue
      
      newGrid[y][x] = newColor
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    
    return newGrid
  }, [pixelGrid])

  const drawLine = useCallback((x0, y0, x1, y1, grid = pixelGrid) => {
    const newGrid = grid.map(row => [...row])
    
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    
    let x = x0
    let y = y0
    
    while (true) {
      if (isValidCoordinate(x, y)) {
        newGrid[y][x] = selectedColor
      }
      
      if (x === x1 && y === y1) break
      
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
    
    return newGrid
  }, [selectedColor, pixelGrid])

  const drawRectangle = useCallback((x0, y0, x1, y1, grid = pixelGrid) => {
    const newGrid = grid.map(row => [...row])
    
    const minX = Math.min(x0, x1)
    const maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1)
    const maxY = Math.max(y0, y1)
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (isValidCoordinate(x, y)) {
          // Draw outline only
          if (x === minX || x === maxX || y === minY || y === maxY) {
            newGrid[y][x] = selectedColor
          }
        }
      }
    }
    
    return newGrid
  }, [selectedColor, pixelGrid])

  const pickColor = useCallback((x, y) => {
    if (isValidCoordinate(x, y) && pixelGrid[y][x]) {
      return pixelGrid[y][x]
    }
    return null
  }, [pixelGrid])

  const handleMouseDown = useCallback((event) => {
    const { x, y } = getPixelCoordinates(event)
    setIsDrawing(true)
    setStartPoint({ x, y })
    
    switch (selectedTool) {
      case 'brush':
      case 'eraser':
        const newGrid = paintPixel(x, y)
        setPixelGrid(newGrid)
        break
      case 'fill':
        const targetColor = pixelGrid[y]?.[x] || null
        const filledGrid = floodFill(x, y, targetColor, selectedColor)
        setPixelGrid(filledGrid)
        saveToHistory(filledGrid)
        break
      case 'eyedropper':
        const pickedColor = pickColor(x, y)
        if (pickedColor && window.onColorPick) {
          window.onColorPick(pickedColor)
        }
        break
      case 'line':
      case 'rectangle':
        // Start preview for shape tools
        setPreviewGrid(pixelGrid.map(row => [...row]))
        break
      default:
        break
    }
  }, [getPixelCoordinates, selectedTool, paintPixel, pixelGrid, floodFill, selectedColor, saveToHistory, pickColor])

  const handleMouseMove = useCallback((event) => {
    const { x, y } = getPixelCoordinates(event)
    
    if (!isDrawing) return
    
    switch (selectedTool) {
      case 'brush':
      case 'eraser':
        const newGrid = paintPixel(x, y)
        setPixelGrid(newGrid)
        break
      case 'line':
        if (startPoint && previewGrid) {
          const lineGrid = drawLine(startPoint.x, startPoint.y, x, y, previewGrid)
          setPixelGrid(lineGrid)
        }
        break
      case 'rectangle':
        if (startPoint && previewGrid) {
          const rectGrid = drawRectangle(startPoint.x, startPoint.y, x, y, previewGrid)
          setPixelGrid(rectGrid)
        }
        break
      default:
        break
    }
  }, [isDrawing, selectedTool, getPixelCoordinates, paintPixel, startPoint, previewGrid, drawLine, drawRectangle])

  const handleMouseUp = useCallback(() => {
    if (isDrawing && (selectedTool === 'brush' || selectedTool === 'eraser' || selectedTool === 'line' || selectedTool === 'rectangle')) {
      saveToHistory(pixelGrid)
    }
    
    setIsDrawing(false)
    setStartPoint(null)
    setPreviewGrid(null)
  }, [isDrawing, selectedTool, saveToHistory, pixelGrid])

  const handleWheel = useCallback((event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.5, Math.min(4, prev * delta)))
  }, [])

  const clearCanvas = () => {
    const emptyGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
    setPixelGrid(emptyGrid)
    saveToHistory(emptyGrid)
  }

  const getCurvedTransform = (element) => {
    if (!element.curved) return 'none'
    
    const perspective = 200
    const rotateX = 15
    const rotateY = element.position.x > 32 ? -5 : 5
    
    return `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }

  const getTextShadow = (element) => {
    if (!element.curved) return 'none'
    
    return `
      1px 1px 2px rgba(0,0,0,0.3),
      2px 2px 4px rgba(0,0,0,0.2),
      0 0 10px ${element.color}40
    `
  }

  const renderHUDElements = () => {
    return hudElements.map((element, index) => {
      const fontSize = element.size === 'S' ? 10 : element.size === 'M' ? 14 : 18
      const pixelX = element.position.x * PIXEL_SIZE * zoom + pan.x
      const pixelY = element.position.y * PIXEL_SIZE * zoom + pan.y
      
      return (
        <div
          key={element.id}
          className="absolute pointer-events-none font-mono font-bold select-none"
          style={{
            left: `${pixelX}px`,
            top: `${pixelY}px`,
            color: element.color,
            fontSize: `${fontSize * zoom}px`,
            transform: getCurvedTransform(element),
            textShadow: getTextShadow(element),
            opacity: element.opacity || 1,
            transformOrigin: 'center center',
            zIndex: 10,
            filter: element.curved ? `drop-shadow(0 0 ${2 * zoom}px ${element.color}80)` : 'none'
          }}
        >
          {element.text}
        </div>
      )
    })
  }

  const renderVisorOverlay = () => {
    const hasHudElements = hudElements.length > 0
    if (!hasHudElements) return null

    return (
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 30%,
              rgba(0, 100, 200, 0.05) 60%,
              rgba(0, 100, 200, 0.1) 100%
            )
          `,
          borderRadius: '8px',
          zIndex: 5
        }}
      />
    )
  }

  return (
    <div className="relative bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">64x64 Pixel Canvas</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Zoom:</span>
            <span className="text-sm font-mono">{(zoom * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Tool:</span>
            <span className="text-sm font-mono capitalize">{selectedTool}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">HUD:</span>
            <span className="text-sm font-mono">{hudElements.length} elements</span>
          </div>
          <button
            onClick={clearCanvas}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="relative overflow-hidden border-2 border-gray-300 bg-gray-50 rounded-lg">
        <div
          ref={canvasRef}
          className="relative cursor-crosshair"
          style={{
            width: `${GRID_SIZE * PIXEL_SIZE * zoom}px`,
            height: `${GRID_SIZE * PIXEL_SIZE * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Render pixel grid */}
          <div 
            className="grid gap-0"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${PIXEL_SIZE * zoom}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${PIXEL_SIZE * zoom}px)`
            }}
          >
            {pixelGrid.flat().map((color, index) => {
              const x = index % GRID_SIZE
              const y = Math.floor(index / GRID_SIZE)
              
              return (
                <div
                  key={index}
                  className="border border-gray-200"
                  style={{
                    width: `${PIXEL_SIZE * zoom}px`,
                    height: `${PIXEL_SIZE * zoom}px`,
                    backgroundColor: color || 'transparent',
                    borderWidth: zoom < 1 ? '0px' : '1px'
                  }}
                />
              )
            })}
          </div>
          
          {/* Visor Overlay Effect */}
          {renderVisorOverlay()}
          
          {/* HUD Elements Overlay */}
          {renderHUDElements()}
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>• Click and drag to paint pixels</p>
        <p>• Scroll to zoom in/out</p>
        <p>• Use keyboard shortcuts: B (brush), E (eraser), F (fill)</p>
        <p>• Ctrl+Z to undo, Ctrl+Y to redo</p>
        <p>• HUD elements support curved visor effects and custom positioning</p>
      </div>
    </div>
  )
}

export default PixelCanvas

