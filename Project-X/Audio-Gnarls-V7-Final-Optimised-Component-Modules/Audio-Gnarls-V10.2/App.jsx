import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Play, Square, Volume2, VolumeX, Settings, Save, RotateCcw } from 'lucide-react'
import SeedSynth from '../react/SeedSynth'
import './App.css'

function App() {
  const [seed, setSeed] = useState('5s567g67')
  const [showSequencer, setShowSequencer] = useState(false)
  const [currentShape, setCurrentShape] = useState('hum')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [options, setOptions] = useState([])
  const [savedState, setSavedState] = useState(null)
  
  const synthRef = useRef()

  const handleReady = () => {
    setStatus('Ready - Tone.js loaded')
    if (synthRef.current) {
      setOptions(synthRef.current.options)
      setCurrentShape(synthRef.current.currentKey)
    }
  }

  const handleOptionChange = (event) => {
    setCurrentShape(event.detail.key)
    setStatus(`Current: ${event.detail.label} (${event.detail.key})`)
  }

  const handleStateChange = (event) => {
    console.log('State changed:', event.detail.state)
    if (synthRef.current) {
      setIsMuted(synthRef.current.muted)
    }
  }

  const handleStart = async () => {
    try {
      await synthRef.current?.start()
      setIsPlaying(true)
      setStatus('Audio started')
    } catch (error) {
      setStatus('Error: ' + error.message)
    }
  }

  const handleStop = () => {
    synthRef.current?.stop()
    setIsPlaying(false)
    setStatus('Audio stopped')
  }

  const handleMute = () => {
    synthRef.current?.mute()
    const newMuted = synthRef.current?.muted || false
    setIsMuted(newMuted)
    setStatus(newMuted ? 'Muted' : 'Unmuted')
  }

  const handleShapeChange = (value) => {
    synthRef.current?.setCurrent(value)
    setCurrentShape(value)
  }

  const handleSeedChange = () => {
    if (synthRef.current) {
      synthRef.current.seed = seed
      setOptions(synthRef.current.options)
      setStatus(`Seed set to: ${seed}`)
    }
  }

  const handleToggleSequencer = () => {
    setShowSequencer(!showSequencer)
    setStatus(showSequencer ? 'Sequencer hidden' : 'Sequencer shown')
  }

  const handleSaveState = () => {
    const state = synthRef.current?.getState()
    setSavedState(state)
    setStatus('State saved')
  }

  const handleRestoreState = () => {
    if (savedState && synthRef.current) {
      synthRef.current.setState(savedState)
      setStatus('State restored')
    } else {
      setStatus('No saved state')
    }
  }

  const testRecordStep = () => {
    synthRef.current?.recordStep(1)
    setStatus('Recorded step 1')
  }

  const testPlaySequence = () => {
    synthRef.current?.playSequence()
    setStatus('Playing sequence')
  }

  const testStopSequence = () => {
    synthRef.current?.stopSequence()
    setStatus('Stopped sequence')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/20 bg-white/10 p-4">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">
          SeedSynth - React Example
        </h1>
        <p className="text-gray-300">
          A deterministic synthesizer with 10 options per seed (9 shapes + hum)
        </p>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <Button onClick={handleStart} disabled={isPlaying} className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Start Audio
          </Button>
          
          <Button onClick={handleStop} disabled={!isPlaying} variant="outline">
            <Square className="w-4 h-4 mr-2" />
            Stop Audio
          </Button>
          
          <Button onClick={handleMute} variant="outline">
            {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          
          <Select value={currentShape} onValueChange={handleShapeChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Shape..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="Enter seed..."
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-32"
            />
            <Button onClick={handleSeedChange} variant="outline">
              Set Seed
            </Button>
          </div>
          
          <Button onClick={handleToggleSequencer} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Toggle Sequencer
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <SeedSynth
          ref={synthRef}
          seed={seed}
          showSequencer={showSequencer}
          onReady={handleReady}
          onOptionChange={handleOptionChange}
          onStateChange={handleStateChange}
          className="w-full h-[calc(100vh-200px)]"
        />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="secondary" className="bg-black/80 text-white">
            {status}
          </Badge>
        </div>
        
        {/* API Demo Panel */}
        <Card className="absolute bottom-4 left-4 w-80 bg-black/80 border-white/20 z-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-400 text-lg">API Demo</CardTitle>
            <CardDescription className="text-gray-300">
              Test the component's programmatic interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={testRecordStep} size="sm" variant="outline">
                Record Step 1
              </Button>
              <Button onClick={testPlaySequence} size="sm" variant="outline">
                Play Sequence
              </Button>
              <Button onClick={testStopSequence} size="sm" variant="outline">
                Stop Sequence
              </Button>
              <Button 
                onClick={() => synthRef.current?.setStepTime(200)} 
                size="sm" 
                variant="outline"
              >
                Set Step Time
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleSaveState} size="sm" variant="outline">
                <Save className="w-3 h-3 mr-1" />
                Save State
              </Button>
              <Button 
                onClick={handleRestoreState} 
                size="sm" 
                variant="outline"
                disabled={!savedState}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restore State
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

