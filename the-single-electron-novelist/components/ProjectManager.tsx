import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, Save, FolderOpen, X, Headphones, Loader2 } from 'lucide-react';
import { ProjectState, downloadJSON, uploadJSON, clearLocal } from '../services/storage';
import { generateSpeechRaw } from '../services/geminiService';
import { createWavBlob } from '../services/audioUtils';
import JSZip from 'jszip';

interface ProjectManagerProps {
  currentState: ProjectState;
  onLoad: (state: ProjectState) => void;
  onReset: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ currentState, onLoad, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    downloadJSON(currentState);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const state = await uploadJSON(file);
        onLoad(state);
        setIsOpen(false);
      } catch (error) {
        alert("Failed to load project file. Invalid format.");
        console.error(error);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to delete your current progress? This cannot be undone.")) {
      clearLocal();
      onReset();
      setIsOpen(false);
    }
  };

  const handleBatchAudioExport = async () => {
    const chapters = currentState.outline.filter(ch => ch.content && ch.content.trim().length > 0);
    
    if (chapters.length === 0) {
        alert("No chapter content to export.");
        return;
    }

    if (!confirm(`Generate and download audiobook for ${chapters.length} chapters? This may take some time.`)) {
        return;
    }

    setIsExportingAudio(true);
    setExportProgress(0);
    
    try {
        const zip = new JSZip();
        const folder = zip.folder("audiobook");

        for (let i = 0; i < chapters.length; i++) {
            const ch = chapters[i];
            // Update progress
            setExportProgress(Math.round(((i) / chapters.length) * 100));
            
            // Generate audio
            const rawBytes = await generateSpeechRaw(ch.content);
            
            if (rawBytes && folder) {
                const wavBlob = createWavBlob(rawBytes);
                // Convert blob to ArrayBuffer for JSZip
                const arrayBuffer = await wavBlob.arrayBuffer();
                const filename = `Chapter_${ch.number}_${ch.title.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}.wav`;
                folder.file(filename, arrayBuffer);
            }
            
            // Minimal delay to be nice to API rate limits if necessary
            await new Promise(r => setTimeout(r, 200));
        }

        setExportProgress(100);

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentState.concept.title.replace(/[^a-z0-9]/gi, '_') || 'Novel'}_Audiobook.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Export failed", e);
        alert("Audio export failed. Please check your API key and quota.");
    } finally {
        setIsExportingAudio(false);
        setExportProgress(0);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      
      {isOpen ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-bottom-4 duration-200 w-72">
           <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
             <h3 className="font-bold text-gray-800 dark:text-gray-100">Project Manager</h3>
             <button onClick={() => !isExportingAudio && setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
               <X size={16} />
             </button>
           </div>
           
           <div className="space-y-2">
             <button 
                onClick={handleDownload}
                disabled={isExportingAudio}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
             >
               <Download size={16} className="text-blue-500" /> Save Project (JSON)
             </button>
             
             <button 
                onClick={handleUploadClick}
                disabled={isExportingAudio}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
             >
               <Upload size={16} className="text-green-500" /> Load Project (JSON)
             </button>
             
             <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2">
                 {isExportingAudio ? (
                     <div className="px-3 py-2">
                         <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
                             <Loader2 size={16} className="animate-spin" />
                             Generating Audio... {exportProgress}%
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${exportProgress}%` }}></div>
                         </div>
                     </div>
                 ) : (
                    <button 
                        onClick={handleBatchAudioExport}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                    >
                        <Headphones size={16} className="text-purple-500" /> Export Audiobook (ZIP)
                    </button>
                 )}
             </div>

             <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2">
               <button 
                  onClick={handleReset}
                  disabled={isExportingAudio}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
               >
                 <Trash2 size={16} /> Reset All Data
               </button>
             </div>
           </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
          title="Manage Project"
        >
          <FolderOpen size={24} />
        </button>
      )}
    </div>
  );
};
