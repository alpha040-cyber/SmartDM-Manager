import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  FileCode, 
  Copy, 
  Check, 
  Trash2, 
  BookOpen, 
  MessageSquare,
  Zap,
  Terminal,
  Apple,
  Eye,
  Monitor,
  LayoutGrid,
  Plus,
  FolderPlus,
  Box,
  ChevronRight,
  Settings,
  MoreVertical,
  Key,
  ShieldCheck,
  Search,
  Lock,
  Clock,
  LogOut,
  Hash,
  User,
  Mic,
  MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import yaml from 'js-yaml';

type AuthStep = 'email' | 'code' | 'license' | 'maintenance' | 'success';

interface AnchorSlot {
  slot: number;
  description: string;
}

interface Menu {
  id: string;
  name: string;
  prompt: string;
  rawConfig: string;
  referenceMenu: string;
  isExact?: boolean;
  screenshot?: string;
  fillerItem?: string;
  anchorSlots?: AnchorSlot[];
}

interface Project {
  id: string;
  name: string;
  menus: Menu[];
}

const AppleStudio = () => {
  // Auth & Licensing
  const [authStep, setAuthStep] = useState<AuthStep>('license');
  const [accessToken, setAccessToken] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<{ maintenance: boolean; maintenanceMessage: string } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [adminLicenseSecret, setAdminLicenseSecret] = useState('studio-admin-2026'); // Demo default

  // Persistence
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExactMode, setIsExactMode] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('smartdm_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
    return [];
  });

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          setSystemStatus(data);
          if (data.maintenance) setAuthStep('maintenance');
        } else {
          setSystemStatus({ maintenance: false, maintenanceMessage: '' });
        }
      } catch (err) {
        setSystemStatus({ maintenance: false, maintenanceMessage: '' });
      }
    };
    checkSystem();

    // Load session
    const savedAuth = localStorage.getItem('smartdm_auth_token');
    if (savedAuth === 'A4D6X-PR91-NV3R') {
      setIsAuthorized(true);
      setAuthStep('success');
    }
  }, []);

  const handleVerifyToken = async () => {
    if (accessToken !== 'A4D6X-PR91-NV3R') {
      setError('Invalid neural access token.');
      return;
    }
    setAuthLoading(true);
    setError('');
    
    // Aesthetic delay for the link sequence
    setTimeout(() => {
      setIsAuthorized(true);
      setAuthStep('success');
      localStorage.setItem('smartdm_auth_token', accessToken);
      setNotification({ message: 'Neural link established.', type: 'success' });
      setAuthLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    localStorage.removeItem('smartdm_auth_token');
    setIsAuthorized(false);
    setAuthStep('license');
    setAccessToken('');
  };

  const [activeProjectId, setActiveProjectId] = useState<string | null>(projects.length > 0 ? projects[0].id : null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(projects.length > 0 && projects[0].menus.length > 0 ? projects[0].menus[0].id : null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'console'>('code');
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'player' | 'console' | 'system', text: string, time: string }[]>([]);

  // Effect to save state
  useEffect(() => {
    localStorage.setItem('smartdm_projects', JSON.stringify(projects));
  }, [projects]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const activeMenu = useMemo(() => {
    if (!activeProject) return null;
    return activeProject.menus.find(m => m.id === activeMenuId) || activeProject.menus[0];
  }, [activeProject, activeMenuId]);

  const updateActiveMenu = (updates: Partial<Menu>) => {
    if (!activeProjectId || !activeMenuId) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        menus: p.menus.map(m => {
          if (m.id !== activeMenuId) return m;
          return { ...m, ...updates };
        })
      };
    }));
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (activeMenu) {
          updateActiveMenu({ prompt: activeMenu.prompt + ' ' + transcript });
        }
      };

      recog.onend = () => setIsListening(false);
      recog.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(recog);
    }
  }, [activeMenuId]);

  const toggleListening = () => {
    if (!recognition) {
      setNotification({ message: 'Speech recognition not supported in this browser.', type: 'error' });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setNotification({ message: 'Neural dictation offline.', type: 'success' });
    } else {
      try {
        recognition.start();
        setIsListening(true);
        setNotification({ message: 'Neural dictation active...', type: 'success' });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const id = Date.now().toString();
    const newProject: Project = {
      id,
      name: newProjectName,
      menus: [{
        id: 'main-' + id,
        name: 'Main Menu',
        prompt: '',
        rawConfig: '',
        referenceMenu: '',
        isExact: isExactMode,
        anchorSlots: [],
        fillerItem: 'GRAY_STAINED_GLASS_PANE'
      }]
    };
    
    setProjects([...projects, newProject]);
    setActiveProjectId(id);
    setActiveMenuId(newProject.menus[0].id);
    setNewProjectName('');
    setIsExactMode(false);
    setIsModalOpen(false);
    setView('workspace');
  };

  const addMenuToProject = (projectId: string) => {
    const id = 'menu-' + Date.now();
    const newMenu: Menu = {
      id,
      name: 'New Menu',
      prompt: '',
      rawConfig: '',
      referenceMenu: '',
      isExact: false,
      anchorSlots: [],
      fillerItem: 'GRAY_STAINED_GLASS_PANE'
    };
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, menus: [...p.menus, newMenu] };
    }));
    setActiveProjectId(projectId);
    setActiveMenuId(id);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    if (activeProjectId === id) {
      setActiveProjectId(updatedProjects.length > 0 ? updatedProjects[0].id : null);
      setActiveMenuId(updatedProjects.length > 0 && updatedProjects[0].menus.length > 0 ? updatedProjects[0].menus[0].id : null);
    }
  };

  const deleteMenu = (projectId: string, menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const updatedMenus = p.menus.filter(m => m.id !== menuId);
      return { ...p, menus: updatedMenus };
    }));
    if (activeMenuId === menuId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const remainingMenus = project.menus.filter(m => m.id !== menuId);
        setActiveMenuId(remainingMenus.length > 0 ? remainingMenus[0].id : null);
      }
    }
  };

  const parsedMenu = useMemo(() => {
    if (!activeMenu || !activeMenu.rawConfig) return null;
    try {
      const yamlContent = activeMenu.rawConfig.replace(/```yaml\n|```/g, '');
      return yaml.load(yamlContent) as any;
    } catch (e) {
      return null;
    }
  }, [activeMenu]);

  const addLog = (type: 'player' | 'console' | 'system', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setConsoleLogs(prev => [{ type, text, time }, ...prev].slice(0, 50));
  };

  const handleSlotClick = (item: any, isRight: boolean) => {
    const commands = isRight ? item.right_click_commands : item.left_click_commands;
    if (!commands || !Array.isArray(commands)) return;

    commands.forEach((cmd: string) => {
      if (cmd.startsWith('[player]')) {
        addLog('player', cmd.replace('[player]', '').trim());
      } else if (cmd.startsWith('[console]')) {
        addLog('console', cmd.replace('[console]', '').trim());
      } else {
        addLog('system', `Executed: ${cmd}`);
      }
    });
  };

  const handleGenerate = async () => {
    if (!activeMenu || !activeMenu.prompt.trim()) {
      setError('Please enter a prompt first.');
      return;
    }

    setIsGenerating(true);
    setError('');
    addLog('system', 'Initializing neural engine for DeluxeMenus synthesis...');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        addLog('system', 'Error: GEMINI_API_KEY is missing from environment.');
        throw new Error('API Key configuration missing. Please check your project settings.');
      }

      console.log('AI Studio: Gemini API initialized with key presence:', !!apiKey);
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
          You are an expert Minecraft plugin developer specialized in DeluxeMenus.
          Current focus: Latest versions (1.21+).
          
          Guidelines:
          1. Material names must match latest MC standards (e.g., IRON_INGOT instead of IRON).
          2. Indentation is critical (2 spaces). No tabs.
          3. Match provided reference menu style exactly if one is provided.
          4. Return ONLY the YAML configuration. Do not include markdown code block fences (\`\`\`yaml).

          ${activeMenu.isExact ? `
          SPECIAL MODE: EXACT REPRODUCTION
          - You must analyze the provided screenshot to match colors, titles, and layout.
          - Use the "Filler Item" (${activeMenu.fillerItem || 'GRAY_STAINED_GLASS_PANE'}) for all slots NOT marked as anchor slots.
          - Ensure all lore and display names match the visual theme of the image.
          ` : ''}
        `;

      const promptParts: any[] = [`Generate a DeluxeMenus config based on this prompt: ${activeMenu.prompt}\n\n${activeMenu.referenceMenu ? `Use this as a reference:\n\n${activeMenu.referenceMenu}` : ""}`];
      
      if (activeMenu.isExact && activeMenu.screenshot) {
        promptParts.push({
          inlineData: {
            data: activeMenu.screenshot.split(',')[1],
            mimeType: "image/png"
          }
        });
        
        promptParts.push(`
          ANCHOR SLOTS (Important Items):
          ${activeMenu.anchorSlots?.map(s => `Slot ${s.slot}: ${s.description}`).join('\n')}
          
          FILTER/BACKGROUND:
          All other slots should be filled with: ${activeMenu.fillerItem || 'GRAY_STAINED_GLASS_PANE'}
        `);
      }

      const result = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: promptParts.map(p => typeof p === 'string' ? { text: p } : p) }],
        config: { systemInstruction, temperature: 0.7 }
      });

      let fullText = '';
      updateActiveMenu({ rawConfig: '' });

      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          // Real-time update with minimal filtering
          updateActiveMenu({ rawConfig: fullText });
        }
      }

      // Final sanitization
      const cleanCode = fullText.replace(/```[a-z]*\n|```/g, '').trim();
      updateActiveMenu({ rawConfig: cleanCode });
      
      addLog('system', 'Synthesis complete. Configuration is ready for deployment.');
      setNotification({ message: 'Configuration synthesized successfully', type: 'success' });
      setActiveTab('code');
    } catch (err: any) {
      console.error("Generation error:", err);
      let msg = err.message || 'Synthesis aborted due to an internal error.';
      
      // Handle Specific 429 Error
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        msg = 'The neural engine is under heavy demand. Please wait 30 seconds and try again.';
      }
      
      setError(msg);
      addLog('system', `Failure: ${msg}`);
      setNotification({ message: 'Synthesis Failed', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!activeMenu) return;
    navigator.clipboard.writeText(activeMenu.rawConfig.replace(/```yaml\n|```/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [adminLicenses, setAdminLicenses] = useState<any[]>([]);

  const fetchAllLicenses = async () => {
    try {
      const res = await fetch(`/api/admin/all-licenses?secret=${adminLicenseSecret}`);
      const data = await res.json();
      if(data && Array.isArray(data)) setAdminLicenses(data);
    } catch (err) {
      console.error("Failed to fetch licenses", err);
    }
  };

  useEffect(() => {
    if (terminalOpen) {
      fetchAllLicenses();
    }
  }, [terminalOpen]);

  if (authStep === 'maintenance') {
    return (
      <div className="h-screen bg-black text-white font-sans flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF3B30]/5 blur-[120px] rounded-full" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-12 bg-[#1C1C1E] border border-[#333333] rounded-[3rem] shadow-2xl relative z-10 space-y-8 text-center"
        >
          <div className="w-16 h-16 bg-[#FF3B30] rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,59,48,0.3)]">
            <Settings className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold uppercase tracking-wider">System Maintenance</h1>
            <p className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl text-xs font-medium text-[#FF3B30] leading-relaxed italic">
              "{systemStatus?.maintenanceMessage}"
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white font-sans selection:bg-[#FF3B30] selection:text-white overflow-hidden relative">
      <AnimatePresence>
        {!isAuthorized && view === 'workspace' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="max-w-md w-full p-12 bg-[#1C1C1E] border border-[#333333] rounded-[3rem] shadow-2xl relative z-10 space-y-8"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="w-16 h-16 bg-[#FF3B30] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,59,48,0.3)]">
                   <Lock className="w-8 h-8 text-white" />
                 </div>
                 <div className="space-y-1">
                   <h1 className="text-2xl font-bold tracking-tight uppercase tracking-wider">Neural Access</h1>
                   <p className="text-[9px] text-[#86868B] font-bold uppercase tracking-[0.3em]">Apple Studio Secure Protocol</p>
                 </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key="token" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] ml-2">Neural Access Token</label>
                    <input 
                      type="text"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value.toUpperCase())}
                      placeholder="XXXXX-XXXX-XXXX"
                      className="w-full bg-black/40 border border-[#333333] rounded-2xl p-4 text-sm font-mono tracking-widest focus:ring-2 focus:ring-[#FF3B30]/20 focus:border-[#FF3B30] transition-all outline-none text-center"
                    />
                  </div>
                  <button 
                    onClick={handleVerifyToken}
                    disabled={authLoading || accessToken.length < 5}
                    className="w-full bg-[#FF3B30] py-4 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                  >
                    {authLoading ? 'ESTABLISHING...' : 'AUTHORIZE ACCESS'}
                  </button>
                  <button onClick={() => setView('landing')} className="w-full text-[10px] font-bold text-[#86868B] uppercase tracking-widest hover:text-white transition-colors">Return to Dashboard</button>
                </motion.div>
              </AnimatePresence>

              {error && <p className="text-[10px] font-bold text-[#FF3B30] text-center uppercase border border-[#FF3B30]/20 p-3 rounded-xl">{error}</p>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Management (Hidden Trigger: Alt + A) */}
      <AnimatePresence>
        {terminalOpen && (
          <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
             <div className="max-w-2xl w-full p-12 space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                   <h2 className="text-xl font-bold uppercase tracking-widest text-orange-500">Neural Core Debug</h2>
                   <button onClick={() => setTerminalOpen(false)} className="text-[#86868B] hover:text-white"><LogOut /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-white/5 rounded-3xl space-y-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#86868B]">System Maintenance</span>
                       <button 
                        onClick={async () => {
                          const res = await fetch('/api/admin/toggle-maintenance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ secret: adminLicenseSecret, state: !systemStatus?.maintenance })
                          });
                          if(res.ok) {
                            const data = await res.json();
                            setSystemStatus(data.settings);
                          }
                        }}
                        className={`w-full py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${systemStatus?.maintenance ? 'bg-red-500' : 'bg-green-500'}`}
                       >
                         {systemStatus?.maintenance ? 'DEACTIVATE' : 'ACTIVATE'}
                       </button>
                   </div>
                   <div className="p-6 bg-white/5 rounded-3xl space-y-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#86868B]">Simulator</span>
                       <p className="text-[8px] text-[#86868B]">Use this to test the bot API.</p>
                       <button onClick={async () => {
                          const res = await fetch('/api/admin/generate-license', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ secret: adminLicenseSecret, durationId: 'monthly' })
                          });
                          const data = await res.json();
                          setNotification({ message: `BOT GEN: ${data.license.key}`, type: 'success' });
                       }} className="w-full py-3 bg-white/10 rounded-xl text-[10px] font-bold">GENERATE TOKEN</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Auth Info removed from absolute positioning */}

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col relative overflow-hidden"
          >
             {/* Nav */}
             <nav className="h-20 flex items-center justify-between px-12 border-b border-white/5 bg-black/40 backdrop-blur-xl z-10 shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FF3B30] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,59,48,0.4)]">
                    <Apple className="w-6 h-6 text-white mb-0.5" />
                  </div>
                  <span className="font-bold text-xl tracking-tight uppercase tracking-[0.1em]">Smart DM's</span>
               </div>
               
               <div className="flex items-center gap-10">
                  <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-[#86868B]">
                    <a href="#" className="hover:text-white transition-colors">Workspace</a>
                    <a href="#" className="hover:text-white transition-colors">Documentation</a>
                    <a href="#" className="hover:text-white transition-colors">Community</a>
                  </div>
                  {projects.length > 0 && (
                    <button 
                      onClick={() => setView('workspace')}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-all border border-white/10"
                    >
                      Enter Workspace
                    </button>
                  )}
               </div>
             </nav>

             {/* Content */}
             <main className="flex-1 flex flex-col items-center justify-center relative p-10">
                <div className="absolute inset-0 pointer-events-none">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF3B30]/5 blur-[120px] rounded-full" />
                </div>

                <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
                   <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                   >
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block px-4 py-1.5 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-[10px] font-bold uppercase tracking-[0.2em]"
                      >
                        Apple Studio Presents
                      </motion.div>
                      <h1 className="text-7xl md:text-9xl font-bold tracking-tighter leading-none">
                        Smart <span className="text-[#FF3B30]">DM</span>'s
                      </h1>
                      <p className="text-xl md:text-2xl text-[#86868B] max-w-2xl mx-auto font-medium leading-relaxed">
                        The definitive neural engine for DeluxeMenus synthesis. <br />
                        Forge complexity into elegance with single-layer intelligence.
                      </p>
                   </motion.div>

                   <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center gap-8"
                   >
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button 
                         onClick={() => setView('workspace')}
                         className="group relative px-12 py-6 bg-[#FF3B30] rounded-full text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,59,48,0.3)] flex items-center gap-4 border-2 border-transparent hover:border-white/20"
                        >
                          <Plus className="w-6 h-6" />
                          LAUNCH WORKSPACE
                          <div className="absolute inset-0 rounded-full border-2 border-[#FF3B30] animate-ping opacity-20" />
                        </button>
                     </div>
                     
                     <div className="flex gap-12 items-center text-[#86868B]">
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-2xl font-bold text-white">100%</span>
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Success Rate</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-2xl font-bold text-white">YAML</span>
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Syntax Verified</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-2xl font-bold text-white">FAST</span>
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">AI Generation</span>
                        </div>
                     </div>
                   </motion.div>
                </div>
             </main>

             {/* Footer */}
             <footer className="h-20 flex items-center justify-between px-12 text-[10px] font-bold uppercase tracking-widest text-[#86868B] border-t border-white/5 opacity-40">
                <span>© 2026 SmartDM Studio</span>
                <div className="flex gap-8">
                   <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                   <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                </div>
             </footer>
           </motion.div>
        ) : (
          <motion.div 
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex overflow-hidden"
          >
             {/* Sidebar */}
             <aside className="w-72 bg-[#1C1C1E] border-r border-[#333333] flex flex-col pt-6 shrink-0 z-50">
                <div className="px-6 mb-10 flex items-center justify-between">
                  <button onClick={() => setView('landing')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-9 h-9 bg-[#FF3B30] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,59,48,0.2)]">
                        <Apple className="text-white w-5 h-5 mb-0.5" />
                      </div>
                      <span className="font-bold text-lg tracking-tight uppercase">Smart DM's</span>
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="w-8 h-8 flex items-center justify-center bg-[#FF3B30]/10 hover:bg-[#FF3B30] rounded-lg transition-all text-[#FF3B30] hover:text-white group"
                    title="New Project"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
                  {projects.map(project => (
                    <div key={project.id} className="space-y-3 group/project">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Box className="w-4 h-4 text-[#86868B] group-hover/project:text-[#FF3B30] transition-colors" />
                          <input 
                            value={project.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: val } : p));
                            }}
                            className="bg-transparent border-none text-[12px] font-bold uppercase tracking-widest text-[#86868B] focus:text-white transition-colors focus:ring-0 w-full hover:bg-white/5 rounded px-1 -ml-1 cursor-text"
                          />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/project:opacity-100 transition-opacity">
                          <button 
                            onClick={() => addMenuToProject(project.id)} 
                            className="p-1 hover:bg-[#FF3B30]/20 rounded text-[#FF3B30] transition-all"
                            title="Add Menu"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => deleteProject(project.id, e)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-all"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {project.menus.map(menu => (
                          <div 
                            key={menu.id}
                            className="group/menu relative"
                          >
                            <div
                              onClick={() => {
                                setActiveProjectId(project.id);
                                setActiveMenuId(menu.id);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                                activeMenuId === menu.id 
                                ? 'bg-[#FF3B30] text-white shadow-lg' 
                                : 'hover:bg-white/5 text-[#86868B] hover:text-white'
                              }`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                              <input 
                                value={menu.name}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProjects(prev => prev.map(p => {
                                    if (p.id !== project.id) return p;
                                    return {
                                      ...p,
                                      menus: p.menus.map(m => m.id === menu.id ? { ...m, name: val } : m)
                                    };
                                  }));
                                }}
                                className="bg-transparent border-none text-sm font-medium truncate flex-1 focus:ring-0 hover:bg-white/10 rounded px-1 -ml-1 text-inherit cursor-text"
                              />
                              {activeMenuId === menu.id ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <button 
                                  onClick={(e) => deleteMenu(project.id, menu.id, e)}
                                  className="opacity-0 group-hover/menu:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-[#333333] flex items-center justify-between">
                   <button onClick={() => setView('landing')} className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] hover:text-white flex items-center gap-2 transition-colors">
                      <ChevronRight className="w-3 h-3 rotate-180" /> Dashboard
                   </button>
                   <Settings className="w-4 h-4 text-[#86868B] hover:text-white cursor-pointer" />
                </div>
             </aside>

             {/* Workspace Main Area */}
             <div className="flex-1 flex flex-col overflow-hidden">
                {projects.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-[#FF3B30]/5 rounded-[3rem] border border-[#FF3B30]/10 flex items-center justify-center">
                      <FolderPlus className="w-12 h-12 text-[#FF3B30] opacity-40" />
                    </div>
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-bold tracking-tight">Empty Studio</h2>
                      <p className="text-[#86868B] text-lg max-w-sm mx-auto">Click the <Plus className="inline w-4 h-4" /> icon in the sidebar to create your first project and start designing.</p>
                    </div>
                  </div>
                ) : activeMenu ? (
                  <>
                    <header className="h-16 border-b border-[#333333] flex items-center justify-between px-10 bg-black/40 backdrop-blur-xl shrink-0">
                      <div className="flex items-center gap-4">
                         <div className="relative group/name">
                           <input 
                            value={activeMenu.name}
                            onChange={(e) => updateActiveMenu({ name: e.target.value })}
                            className="bg-transparent border-none text-xl font-bold tracking-tight focus:ring-0 text-white w-64 hover:bg-white/5 rounded-lg transition-colors px-2 -ml-2"
                           />
                           <div className="absolute -top-6 left-0 text-[8px] font-bold text-[#FF3B30] uppercase tracking-tighter opacity-0 group-hover/name:opacity-100 transition-opacity">Click to Rename Menu</div>
                         </div>
                         <div className="h-4 w-px bg-[#333333]" />
                         <span className="text-xs font-bold text-[#86868B] uppercase tracking-[0.2em]">{activeProject?.name}</span>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Session Auth Info integrated into header */}
                        <div className="hidden lg:flex items-center gap-4 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-full">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Link Active</span>
                           </div>
                           <div className="h-3 w-px bg-white/10" />
                           <button onClick={handleLogout} className="text-[#86868B] hover:text-[#FF3B30] transition-colors" title="Disconnect Neural Link">
                              <LogOut className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                          <button onClick={() => setActiveTab('code')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-[#FF3B30] text-white' : 'text-[#86868B] hover:text-white'}`}>
                            <FileCode className="w-3.5 h-3.5" /> Code
                          </button>
                          <button onClick={() => setActiveTab('preview')} disabled={!parsedMenu} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-[#FF3B30] text-white' : 'text-[#86868B] hover:text-white'} ${!parsedMenu ? 'opacity-30 cursor-not-allowed' : ''}`}>
                            <Eye className="w-3.5 h-3.5" /> GUI
                          </button>
                          <button onClick={() => setActiveTab('console')} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'console' ? 'bg-[#FF3B30] text-white' : 'text-[#86868B] hover:text-white'}`}>
                            <Monitor className="w-3.5 h-3.5" /> Console
                          </button>
                        </div>
                      </div>
                    </header>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-black relative p-8 lg:p-12">
                      <div className="max-w-[1600px] mx-auto">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                          {/* Controls */}
                          <div className="space-y-12">
                            <section className="space-y-6">
                              <h3 className="text-xl font-bold flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-[#FF3B30]" /> Design Intent
                              </h3>
                              <div className="flex gap-4 mb-4">
                                <button 
                                  onClick={() => updateActiveMenu({ isExact: false })}
                                  className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${!activeMenu.isExact ? 'bg-[#FF3B30]/10 border-[#FF3B30] text-[#FF3B30]' : 'bg-white/5 border-white/10 text-[#86868B]'}`}
                                >
                                  Standard Intent
                                </button>
                                <button 
                                  onClick={() => updateActiveMenu({ isExact: true })}
                                  className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${activeMenu.isExact ? 'bg-[#FF3B30]/10 border-[#FF3B30] text-[#FF3B30]' : 'bg-white/5 border-white/10 text-[#86868B]'}`}
                                >
                                  Exact Image Mode
                                </button>
                              </div>
                              <div className="relative group/prompt">
                                <textarea
                                  value={activeMenu.prompt}
                                  onChange={(e) => updateActiveMenu({ prompt: e.target.value })}
                                  placeholder={activeMenu.isExact ? "Describe any extra details (commands, permissions)..." : "Describe your menu..."}
                                  className="w-full min-h-[200px] p-6 pr-20 rounded-[2rem] bg-[#1C1C1E] border border-[#333333] focus:border-[#FF3B30]/40 focus:ring-8 focus:ring-[#FF3B30]/5 transition-all text-base leading-relaxed resize-none shadow-2xl"
                                />
                                <button 
                                  onClick={toggleListening}
                                  className={`absolute top-6 right-6 p-4 rounded-2xl border transition-all ${isListening ? 'bg-[#FF3B30] border-[#FF3B30] shadow-[0_0_20px_rgba(255,59,48,0.4)] animate-pulse' : 'bg-black/40 border-white/10 text-[#86868B] hover:text-[#FF3B30] hover:border-[#FF3B30]/40'}`}
                                  title={isListening ? "Stop Dictation" : "Start Neural Dictation"}
                                >
                                  {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5" />}
                                </button>
                              </div>
                            </section>

                            {activeMenu.isExact && (
                              <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="space-y-4">
                                  <h3 className="text-xl font-bold flex items-center gap-3 text-orange-500">
                                    <Monitor className="w-6 h-6" /> GUI Vision
                                  </h3>
                                  <div className="relative group/upload h-64 bg-[#1C1C1E] border-2 border-dashed border-[#333333] hover:border-orange-500/50 rounded-[3rem] transition-all flex flex-col items-center justify-center gap-4 overflow-hidden">
                                    {activeMenu.screenshot ? (
                                      <>
                                        <img src={activeMenu.screenshot} className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all" />
                                        <div className="relative z-10 flex flex-col items-center gap-2">
                                          <Check className="w-8 h-8 text-green-500" />
                                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Image Linked</span>
                                          <button onClick={() => updateActiveMenu({ screenshot: '' })} className="mt-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-full text-[8px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Replace Image</button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                          <Plus className="w-8 h-8 text-[#86868B]" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868B]">Drop GUI Screenshot</p>
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => updateActiveMenu({ screenshot: reader.result as string });
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-6 bg-[#1C1C1E] border border-[#333333] rounded-[2rem] space-y-4">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] block">Background Filter</label>
                                    <input 
                                      value={activeMenu.fillerItem}
                                      onChange={(e) => updateActiveMenu({ fillerItem: e.target.value })}
                                      placeholder="e.g. BLACK_STAINED_GLASS_PANE"
                                      className="w-full bg-black/40 border-none rounded-xl p-4 text-xs font-mono focus:ring-1 focus:ring-orange-500 transition-all"
                                    />
                                    <p className="text-[8px] text-[#86868B] leading-relaxed italic">The AI will use this item to fill all non-important slots detected in the image.</p>
                                  </div>
                                  <div className="p-6 bg-[#1C1C1E] border border-[#333333] rounded-[2rem] space-y-4">
                                     <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B]">Anchor Slots</label>
                                        <button 
                                          onClick={() => updateActiveMenu({ anchorSlots: [...(activeMenu.anchorSlots || []), { slot: 0, description: '' }] })}
                                          className="text-[10px] text-orange-500 font-bold"
                                        >
                                          + ADD
                                        </button>
                                     </div>
                                     <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {activeMenu.anchorSlots?.map((slot, idx) => (
                                          <div key={idx} className="flex gap-2">
                                            <input 
                                              type="number"
                                              value={slot.slot}
                                              onChange={(e) => {
                                                const newSlots = [...(activeMenu.anchorSlots || [])];
                                                newSlots[idx].slot = parseInt(e.target.value);
                                                updateActiveMenu({ anchorSlots: newSlots });
                                              }}
                                              className="w-12 bg-black/40 border-none rounded-lg p-2 text-xs font-mono text-center"
                                            />
                                            <input 
                                              value={slot.description}
                                              onChange={(e) => {
                                                const newSlots = [...(activeMenu.anchorSlots || [])];
                                                newSlots[idx].description = e.target.value;
                                                updateActiveMenu({ anchorSlots: newSlots });
                                              }}
                                              placeholder="Menu Name/Function"
                                              className="flex-1 bg-black/40 border-none rounded-lg p-2 text-xs"
                                            />
                                            <button 
                                              onClick={() => {
                                                const newSlots = activeMenu.anchorSlots?.filter((_, i) => i !== idx);
                                                updateActiveMenu({ anchorSlots: newSlots });
                                              }}
                                              className="text-red-500 p-2"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                                </div>
                              </section>
                            )}

                            <section className="space-y-6">
                              <h3 className="text-xl font-bold flex items-center gap-3 text-[#86868B]">
                                <BookOpen className="w-6 h-6" /> Structural Reference
                              </h3>
                              <textarea
                                value={activeMenu.referenceMenu}
                                onChange={(e) => updateActiveMenu({ referenceMenu: e.target.value })}
                                placeholder="Paste reference YAML..."
                                className="w-full min-h-[160px] p-6 rounded-[2rem] bg-[#1C1C1E] border border-[#333333] focus:border-[#FF3B30]/40 transition-all font-mono text-sm leading-relaxed resize-none shadow-2xl"
                              />
                            </section>

                            <div className="flex items-center justify-between pt-8 border-t border-[#333333]">
                               <button onClick={() => updateActiveMenu({ prompt: '', rawConfig: '', referenceMenu: '' })} className="text-xs font-bold uppercase tracking-widest text-[#86868B] hover:text-white transition-colors flex items-center gap-2">
                                  <Trash2 className="w-4 h-4" /> Reset 
                               </button>
                               <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !activeMenu.prompt.trim()}
                                className={`px-12 py-5 rounded-full font-bold shadow-2xl transition-all ${
                                  isGenerating || !activeMenu.prompt.trim() ? 'bg-white/5 opacity-50' : 'bg-[#FF3B30] hover:bg-[#FF453A] active:scale-95'
                                }`}
                               >
                                 {isGenerating ? 'FORGING...' : 'GENERATE CONFIG'}
                               </button>
                            </div>
                            {error && <p className="text-[#FF453A] font-bold text-xs uppercase tracking-widest bg-red-950/20 p-4 rounded-xl border border-red-900/40">{error}</p>}
                          </div>

                          {/* Output Area */}
                          <div className="relative flex flex-col h-full lg:min-h-[900px]">
                            <AnimatePresence mode="wait">
                               {activeTab === 'code' && (
                                 <motion.div key="code" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 bg-[#1C1C1E] rounded-[3rem] border border-[#333333] flex flex-col shadow-2xl overflow-hidden group">
                                    <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                       <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Configuration Editor</span>
                                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors ${isGenerating ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                                            <div className={`w-1 h-1 rounded-full animate-pulse ${isGenerating ? 'bg-orange-500' : 'bg-green-500'}`} />
                                            <span className={`text-[8px] font-bold uppercase tracking-tighter ${isGenerating ? 'text-orange-500' : 'text-green-500'}`}>
                                              {isGenerating ? 'Forging...' : 'Live Edit Ready'}
                                            </span>
                                          </div>
                                       </div>
                                       {activeMenu.rawConfig && (
                                         <div className="flex items-center gap-4">
                                            <button 
                                              onClick={handleCopy} 
                                              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#86868B] hover:text-[#FF3B30] transition-colors"
                                            >
                                              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                              {copied ? 'Copied' : 'Copy'}
                                            </button>
                                         </div>
                                       )}
                                    </div>
                                    <div className="flex-1 relative">
                                      {activeMenu.rawConfig || isGenerating ? (
                                        <textarea 
                                          value={activeMenu.rawConfig.replace(/```yaml\n|```/g, '')}
                                          onChange={(e) => updateActiveMenu({ rawConfig: e.target.value })}
                                          spellCheck={false}
                                          className="w-full h-full p-10 bg-transparent border-none focus:ring-0 font-mono text-sm leading-[1.8] text-white/90 resize-none selection:bg-[#FF3B30]/30 custom-scrollbar"
                                          placeholder="Enter YAML configuration here..."
                                        />
                                      ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
                                           <Terminal className="w-16 h-16" />
                                           <p className="font-bold uppercase tracking-widest">Awaiting Intent or Input</p>
                                        </div>
                                      )}
                                      
                                      {isGenerating && (
                                        <div className="absolute inset-0 bg-[#1C1C1E]/60 backdrop-blur-[4px] flex items-center justify-center pointer-events-none z-10 rounded-[3rem]">
                                          <div className="flex flex-col items-center gap-6">
                                            <div className="flex items-end gap-1.5 h-8">
                                              <motion.div animate={{ height: [4, 24, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 bg-[#FF3B30] rounded-full" />
                                              <motion.div animate={{ height: [12, 32, 12] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 bg-[#FF3B30] rounded-full" />
                                              <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 bg-[#FF3B30] rounded-full" />
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF3B30]">Synthesizing Engine</span>
                                              <span className="text-[8px] text-[#86868B] font-mono">NEURAL_LINK_STABLE</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                 </motion.div>
                               )}

                               {activeTab === 'preview' && (
                                 <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 bg-[#1C1C1E] rounded-[3rem] border border-[#333333] flex flex-col items-center justify-center p-12 shadow-2xl gap-10">
                                    <div className="w-full max-w-sm bg-[#2C2C2E] border border-[#3D3D3F] rounded-2xl overflow-hidden shadow-2xl">
                                      <div className="bg-[#3D3D3F] px-6 py-4 flex justify-center border-b border-black/20 font-bold text-xs">
                                        {parsedMenu?.menu_title || 'Chest'}
                                      </div>
                                      <div className="p-4 grid grid-cols-9 gap-1.5 bg-[#8B8B8B]">
                                        {Array.from({ length: parsedMenu?.size || 27 }).map((_, i) => {
                                          const itemKey = Object.keys(parsedMenu?.items || {}).find(key => parsedMenu.items[key].slot === i);
                                          const item = itemKey ? parsedMenu.items[itemKey] : null;
                                          return (
                                            <div 
                                              key={i} 
                                              className={`aspect-square w-full rounded border-black/10 flex items-center justify-center relative group cursor-pointer ${item ? 'bg-[#C6C6C6] hover:bg-white transition-all transform hover:scale-105 active:translate-y-0.5' : 'bg-[#C6C6C6] opacity-30 cursor-default'}`}
                                              onClick={() => item && handleSlotClick(item, false)}
                                            >
                                              {item && (
                                                <>
                                                  <LayoutGrid className="w-5 h-5 text-gray-700" />
                                                  <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-4 w-48 p-3 bg-black/95 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none border border-white/10 shadow-2xl">
                                                    <p className="text-[#FF3B30] font-bold mb-1">{item.display_name?.replace(/&[0-9a-fk-orx]/g, '')}</p>
                                                    {item.lore?.map((line: string, li: number) => <p key={li} className="text-white/60">{line.replace(/&[0-9a-fk-orx]/g, '')}</p>)}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className="text-center space-y-2 opacity-40">
                                       <Eye className="w-6 h-6 mx-auto mb-2 text-[#FF3B30]" />
                                       <p className="font-bold uppercase tracking-widest text-[10px]">Real-time Simulation</p>
                                    </div>
                                 </motion.div>
                               )}

                               {activeTab === 'console' && (
                                 <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 bg-[#1C1C1E] rounded-[3rem] border border-[#333333] flex flex-col p-8 shadow-2xl relative overflow-hidden">
                                     <div className="flex-1 bg-black/60 rounded-[2rem] border border-white/5 p-8 font-mono text-[12px] overflow-y-auto custom-scrollbar">
                                        {consoleLogs.length === 0 ? (
                                           <div className="h-full flex items-center justify-center opacity-10">
                                              <p className="font-bold uppercase tracking-[0.3em]">No Activity Logs</p>
                                           </div>
                                        ) : (
                                          <div className="space-y-3">
                                            {consoleLogs.map((log, i) => (
                                              <div key={i} className="flex gap-4 border-l-2 border-white/5 pl-4 py-1">
                                                 <span className="text-[#444446]">{log.time}</span>
                                                 <span className={`font-bold ${log.type === 'player' ? 'text-blue-400' : 'text-[#FF3B30]'}`}>{log.type === 'player' ? 'P' : 'S'}</span>
                                                 <span className="text-white/80">{log.text}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                     </div>
                                     <div className="mt-8 flex justify-end">
                                        <button onClick={() => setConsoleLogs([])} className="text-[10px] font-bold text-[#86868B] hover:text-white uppercase tracking-widest transition-colors">Clear Console</button>
                                     </div>
                                 </motion.div>
                               )}
                            </AnimatePresence>
                            {/* Workspace Stats / Intelligence Dashboard */}
                            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                               <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] space-y-2 group hover:bg-white/[0.05] transition-colors">
                                  <div className="flex items-center gap-2 text-[#86868B]">
                                     <Terminal className="w-3 h-3" />
                                     <span className="text-[9px] font-bold uppercase tracking-widest">Environment</span>
                                  </div>
                                  <p className="text-xs font-bold text-white">Production v1.21</p>
                               </div>
                               <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] space-y-2 group hover:bg-white/[0.05] transition-colors">
                                  <div className="flex items-center gap-2 text-[#86868B]">
                                     <Zap className="w-3 h-3 text-[#FF3B30]" />
                                     <span className="text-[9px] font-bold uppercase tracking-widest">Compiler</span>
                                  </div>
                                  <p className="text-xs font-bold text-white">Gemini 2.0 Flash</p>
                               </div>
                               <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] space-y-2 group hover:bg-white/[0.05] transition-colors">
                                  <div className="flex items-center gap-2 text-[#86868B]">
                                     <Box className="w-3 h-3" />
                                     <span className="text-[9px] font-bold uppercase tracking-widest">Active Menus</span>
                                  </div>
                                  <p className="text-xs font-bold text-white">{projects.reduce((acc, p) => acc + p.menus.length, 0)} Units</p>
                               </div>
                               <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] space-y-1.5 group hover:bg-white/[0.05] transition-colors">
                                  <div className="flex items-center gap-2 text-[#86868B]">
                                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                     <span className="text-[9px] font-bold uppercase tracking-widest text-green-500">Live Sync</span>
                                  </div>
                                  <p className="text-xs font-bold text-white">Cloud Active</p>
                               </div>
                            </div>
                          </div>

                   
                        </div>
                      </div>
                    </main>
                  </>
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-6">
                      <Box className="w-24 h-24" />
                      <p className="text-2xl font-bold tracking-tight">Select or Create a Project</p>
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4"
          >
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Project Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
             <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1C1C1E] border border-white/10 w-full max-w-lg rounded-[3rem] p-12 shadow-[0_30px_100px_rgba(0,0,0,0.5)] space-y-10"
             >
                <div className="space-y-4">
                   <h2 className="text-4xl font-bold tracking-tight text-white">Create New Project</h2>
                   <p className="text-[#86868B] text-lg font-medium">Define your new workspace category.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#86868B] ml-4">Project Name</label>
                      <input 
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g. Factions Coin Shop"
                        className="w-full bg-[#2C2C2E] border-none rounded-2xl p-6 text-xl font-bold text-white placeholder:text-white/10 focus:ring-4 focus:ring-[#FF3B30]/20 transition-all outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                      />
                   </div>

                   <div 
                    onClick={() => setIsExactMode(!isExactMode)}
                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${isExactMode ? 'bg-[#FF3B30]/10 border-[#FF3B30]' : 'bg-[#2C2C2E]/50 border-white/5 hover:border-white/10'}`}
                   >
                      <div className="space-y-1">
                         <h4 className={`font-bold transition-colors ${isExactMode ? 'text-[#FF3B30]' : 'text-white'}`}>Exact Image Mode</h4>
                         <p className="text-[10px] text-[#86868B] font-medium">Map GUI screenshots to pixel-perfect code.</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative transition-colors ${isExactMode ? 'bg-[#FF3B30]' : 'bg-[#3D3D3F]'}`}>
                         <motion.div 
                          animate={{ x: isExactMode ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" 
                         />
                      </div>
                   </div>

                   <div className="flex gap-4 p-4 bg-white/5 rounded-2xl items-center border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-[#FF3B30]" />
                      </div>
                      <p className="text-xs text-[#86868B] leading-relaxed">Projects act as containers for related menus. You can manage multiple configs within one project.</p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 rounded-full font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors text-white"
                   >
                    CANCEL
                   </button>
                   <button 
                    onClick={handleCreateProject}
                    className="flex-1 py-5 rounded-full font-bold text-sm bg-[#FF3B30] hover:bg-[#FF453A] transition-colors shadow-lg active:scale-95 text-white"
                   >
                    CREATE PROJECT
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444446; }
      `}} />
    </div>
  );
};

export default AppleStudio;
