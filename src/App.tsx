import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Edit3,
  MousePointer2,
  SlidersHorizontal,
  ChevronDown
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
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [accessToken, setAccessToken] = useState('');
  const [systemStatus, setSystemStatus] = useState<{ maintenance: boolean; maintenanceMessage: string } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [adminLicenseSecret, setAdminLicenseSecret] = useState('studio-admin-2026'); // Demo default
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('#FF3B30');
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

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
    const checkToken = async () => {
      const savedAuth = localStorage.getItem('smartdm_auth_token');
      if (savedAuth) {
        try {
          const res = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedAuth })
          });
          if (res.ok) {
            setIsAuthorized(true);
            setAuthStep('success');
          } else {
            localStorage.removeItem('smartdm_auth_token');
            setIsAuthorized(false);
            setAuthStep('email');
          }
        } catch (e) {
          // If we can't reach the server, we'll wait for the user to try again
          setAuthStep('email');
        }
      }
    };
    checkToken();
  }, []);

  const handleVerifyToken = async () => {
    if (accessToken.length < 5) {
      setError('Invalid neural access token format.');
      return;
    }
    setAuthLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken })
      });

      if (res.ok) {
        // Aesthetic delay for the link sequence
        setTimeout(() => {
          setIsAuthorized(true);
          setAuthStep('success');
          localStorage.setItem('smartdm_auth_token', accessToken);
          setNotification({ message: 'Neural link established.', type: 'success' });
          setAuthLoading(false);
        }, 800);
      } else {
        const data = await res.json();
        setError(data.error || 'Access denied.');
        setAuthLoading(false);
      }
    } catch (err) {
      setError('Neural interface failure. Connection unstable.');
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartdm_auth_token');
    setIsAuthorized(false);
    setAuthStep('email');
    setAccessToken('');
    setEmail('');
    setVerificationCode('');
  };

  const handleSendCode = async () => {
    if (!email.includes('@')) {
      setError('Invalid neural identifier.');
      return;
    }
    setAuthLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setAuthStep('code');
        setNotification({ message: 'Neural verification transmission sent.', type: 'success' });
      } else {
        const data = await res.json();
        setError(data.error || 'Transmission failed.');
      }
    } catch (err) {
      setError('Neural core connection unstable.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Invalid code sequence.');
      return;
    }
    setAuthLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.token || 'STUDIO-SESSION';
        
        // Aesthetic delay for the link sequence
        setTimeout(() => {
          setIsAuthorized(true);
          setAuthStep('success');
          localStorage.setItem('smartdm_auth_token', token);
          setNotification({ message: 'Neural link established.', type: 'success' });
          setAuthLoading(false);
        }, 800);
      } else {
        const data = await res.json();
        setError(data.error || 'Verification failed.');
        setAuthLoading(false);
      }
    } catch (err) {
      setError('Neural core connection unstable. Please try again.');
      setAuthLoading(false);
    }
  };

  const [activeProjectId, setActiveProjectId] = useState<string | null>(projects.length > 0 ? projects[0].id : null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(projects.length > 0 && projects[0].menus.length > 0 ? projects[0].menus[0].id : null);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<'name' | 'intent' | 'refs'>('name');
  const [wizardData, setWizardData] = useState({
    name: '',
    prompt: '',
    reference: '',
    isExact: false
  });

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
  const [workspaceTab, setWorkspaceTab] = useState<'intent' | 'builder' | 'source'>('intent');

  // Sync theme color with CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', themeColor);
  }, [themeColor]);
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

  // Ref to track current prompt
  const promptRef = useRef('');
  useEffect(() => {
    if (activeMenu) {
      promptRef.current = activeMenu.prompt;
    }
  }, [activeMenu?.prompt]);

  const handleCreateProject = () => {
    if (!wizardData.name.trim()) return;
    
    const id = Date.now().toString();
    const newProject: Project = {
      id,
      name: wizardData.name,
      menus: [{
        id: 'main-' + id,
        name: 'Main Menu',
        prompt: wizardData.prompt,
        rawConfig: '',
        referenceMenu: wizardData.reference,
        isExact: wizardData.isExact,
        anchorSlots: [],
        fillerItem: 'GRAY_STAINED_GLASS_PANE'
      }]
    };
    
    setProjects([...projects, newProject]);
    setActiveProjectId(id);
    setActiveMenuId(newProject.menus[0].id);
    setWizardData({ name: '', prompt: '', reference: '', isExact: false });
    setWizardStep('name');
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
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: promptParts.map(p => typeof p === 'string' ? { text: p } : p) }],
        config: { systemInstruction, temperature: 0.7 }
      });

      let fullText = '';
      updateActiveMenu({ rawConfig: '' });
      setWorkspaceTab('source');

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
                {authStep === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] ml-2">Neural Identifier (Email)</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
                        <input 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@neural.link"
                          className="w-full bg-black/40 border border-[#333333] rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-[#FF3B30]/20 focus:border-[#FF3B30] transition-all outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleSendCode}
                      disabled={authLoading || !email.includes('@')}
                      className="w-full bg-[#FF3B30] py-4 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {authLoading ? 'TRANSMITTING...' : <>SEND CODE <ChevronRight className="w-4 h-4" /></>}
                    </button>
                    <button onClick={() => setView('landing')} className="w-full text-[10px] font-bold text-[#86868B] uppercase tracking-widest hover:text-white transition-colors">Return to Dashboard</button>
                  </motion.div>
                )}

                {authStep === 'code' && (
                  <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="space-y-2 text-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B]">Verification Signature</label>
                      <p className="text-[9px] text-[#86868B] lowercase mt-1">Sent to: {email}</p>
                      <input 
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-full bg-black/40 border border-[#333333] rounded-2xl p-6 text-3xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-[#FF3B30]/20 focus:border-[#FF3B30] transition-all outline-none text-center"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setAuthStep('email')} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Back</button>
                      <button 
                        onClick={handleVerifyCode}
                        disabled={authLoading || verificationCode.length !== 6}
                        className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                      >
                        {authLoading ? 'VERIFYING...' : 'VERIFY CODE'}
                      </button>
                    </div>
                  </motion.div>
                )}
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
                        Apple <span className="text-[var(--accent)]">Studio</span>
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
                <span>© 2026 Apple Studio</span>
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
                   <button onClick={() => setSettingsOpen(true)} className="p-2 hover:bg-white/5 rounded-lg transition-all group" title="Studio Settings">
                      <Settings className="w-4 h-4 text-[#86868B] group-hover:text-white transition-colors" />
                   </button>
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
                      </div>
                    </header>

                    <main className="flex-1 overflow-hidden bg-black relative flex flex-col">
                      {/* Workspace Tabs */}
                      <div className="h-16 px-10 border-b border-white/5 flex items-center gap-8 bg-[#0D0D0F] z-20 shrink-0">
                         {['intent', 'builder', 'source'].map((tab) => (
                            <button 
                              key={tab}
                              onClick={() => {
                                setWorkspaceTab(tab as any);
                                if (tab === 'source') setActiveTab('code');
                                if (tab === 'builder') setActiveTab('preview');
                              }}
                              className={`relative h-full px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${workspaceTab === tab ? 'text-white' : 'text-[#86868B] hover:text-white'}`}
                            >
                               {tab}
                               {workspaceTab === tab && (
                                 <motion.div layoutId="wTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3B30] shadow-[0_0_10px_#FF3B30]" />
                               )}
                            </button>
                         ))}
                         <div className="flex-1" />
                         <div className="flex items-center gap-4">
                            <button 
                              onClick={handleGenerate}
                              disabled={isGenerating || !activeMenu.prompt.trim()}
                              className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                                isGenerating || !activeMenu.prompt.trim() ? 'bg-white/5 opacity-30 text-[#86868B]' : 'bg-[#FF3B30] text-white hover:scale-105 active:scale-95 shadow-[0_5px_20px_rgba(255,59,48,0.3)]'
                              }`}
                            >
                              {isGenerating ? 'Synthesizing...' : 'Apply Blueprint'}
                            </button>
                         </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 relative">
                        <div className="max-w-[1600px] mx-auto">
                          <AnimatePresence mode="wait">
                            {workspaceTab === 'intent' && (
                              <motion.div key="intent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                  <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-xl font-bold flex items-center gap-3">
                                        <MessageSquare className="w-6 h-6 text-[#FF3B30]" /> Neural Intent
                                      </h3>
                                      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 scale-90 origin-right">
                                        <button onClick={() => updateActiveMenu({ isExact: false })} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${!activeMenu.isExact ? 'bg-[#FF3B30] text-white' : 'text-[#86868B]'}`}>Synthesis</button>
                                        <button onClick={() => updateActiveMenu({ isExact: true })} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeMenu.isExact ? 'bg-[#FF3B30] text-white' : 'text-[#86868B]'}`}>Vision</button>
                                      </div>
                                    </div>
                                    <textarea
                                      value={activeMenu.prompt}
                                      onChange={(e) => updateActiveMenu({ prompt: e.target.value })}
                                      placeholder="Describe your menu's logic, commands, and layout..."
                                      className="w-full h-[400px] p-10 rounded-[3rem] bg-[#1C1C1E] border border-[#333333] focus:border-[#FF3B30]/40 transition-all text-lg leading-relaxed resize-none shadow-2xl selection:bg-[#FF3B30]/20"
                                    />
                                  </section>

                                  <section className="space-y-8 flex flex-col">
                                    <div className="flex items-center gap-3">
                                      <BookOpen className="w-6 h-6 text-[#86868B]" />
                                      <h3 className="text-xl font-bold">Foundation & Reference</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-6">
                                      <textarea
                                        value={activeMenu.referenceMenu}
                                        onChange={(e) => updateActiveMenu({ referenceMenu: e.target.value })}
                                        placeholder="Paste foundations or template YAML here..."
                                        className="flex-1 p-8 rounded-[3rem] bg-[#1C1C1E] border border-[#333333] focus:border-[#FF3B30]/40 transition-all font-mono text-xs leading-relaxed resize-none shadow-2xl opacity-60 hover:opacity-100"
                                      />
                                      {activeMenu.isExact && (
                                        <div className="h-48 rounded-[2rem] bg-orange-500/5 border border-dashed border-orange-500/20 flex flex-col items-center justify-center p-6 relative overflow-hidden group cursor-pointer shadow-lg hover:bg-orange-500/10 transition-all">
                                          {activeMenu.screenshot ? (
                                            <img src={activeMenu.screenshot} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                                          ) : (
                                            <Plus className="w-8 h-8 text-orange-500/40 group-hover:scale-110 transition-transform" />
                                          )}
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mt-2 z-10">{activeMenu.screenshot ? 'Vision Reference Active' : 'Add Vision Reference'}</p>
                                          <input type="file" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => updateActiveMenu({ screenshot: reader.result as string });
                                              reader.readAsDataURL(file);
                                            }
                                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                      )}
                                    </div>
                                  </section>
                                </div>

                                <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                   <div className="flex items-center gap-6">
                                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#FF3B30]/10 flex items-center justify-center">
                                         <Monitor className="w-8 h-8 text-[#FF3B30]" />
                                      </div>
                                      <div>
                                         <h4 className="text-lg font-bold">Neural Verification</h4>
                                         <p className="text-xs text-[#86868B]">Ensure your intentions align with the DeluxeMenus core API.</p>
                                      </div>
                                   </div>
                                   <div className="flex gap-4">
                                      <button onClick={() => updateActiveMenu({ prompt: '' })} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 transition-all">CLEAR INTENT</button>
                                      <button onClick={handleGenerate} className="px-10 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all">GENERATE BLUEPRINT</button>
                                   </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Output Area */}
                          <div className="relative flex flex-col h-full lg:min-h-[900px]">
                            <AnimatePresence mode="wait">
                               {workspaceTab === 'source' && (
                                 <motion.div key="source" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-8">
                                   <div className="flex-1 flex gap-8 min-h-[600px]">
                                     <div className="flex-1 bg-[#1C1C1E] border border-[#333333] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
                                        <div className="absolute top-8 right-8 z-10 flex gap-2">
                                          <button onClick={handleCopy} className="p-3 bg-black/40 hover:bg-black/60 rounded-xl border border-white/5 transition-all text-[#86868B] hover:text-white">
                                             {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                          </button>
                                        </div>
                                        <textarea 
                                          value={activeMenu.rawConfig.replace(/```yaml\n|```/g, '')}
                                          onChange={(e) => updateActiveMenu({ rawConfig: e.target.value })}
                                          className="flex-1 p-12 bg-transparent text-white font-mono text-sm leading-relaxed resize-none focus:ring-0 border-none outline-none custom-scrollbar"
                                        />
                                     </div>
                                     <div className="w-80 hidden xl:flex flex-col gap-6">
                                        <div className="flex-1 bg-[#1C1C1E] border border-[#333333] rounded-[2.5rem] p-8 flex flex-col gap-6">
                                           <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#FF3B30]">Events Console</h4>
                                           <div className="flex-1 bg-black/40 rounded-2xl p-6 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-3">
                                              {consoleLogs.map((log, i) => (
                                                <div key={i} className="flex gap-2 opacity-60">
                                                   <span className="text-[#444446]">{log.time}</span>
                                                   <span className="text-white/80">{log.text}</span>
                                                </div>
                                              ))}
                                           </div>
                                        </div>
                                     </div>
                                   </div>
                                 </motion.div>
                               )}

                               {workspaceTab === 'builder' && (
                                 <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-12 py-10">
                                    <div className="flex items-center gap-10">
                                       <div className="relative group">
                                          <div className="absolute -inset-10 bg-[#FF3B30]/5 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative z-10 transition-transform hover:scale-[1.02]">
                                             <div className="bg-[#2C2C2E] px-8 py-5 border-b border-white/5 flex items-center justify-between">
                                               <span className="text-[10px] uppercase tracking-widest font-bold text-[#86868B]">{parsedMenu?.menu_title || 'Chest'}</span>
                                               <div className="flex gap-1.5">
                                                  <div className="w-2 h-2 rounded-full bg-white/10" />
                                                  <div className="w-2 h-2 rounded-full bg-white/10" />
                                                  <div className="w-2 h-2 rounded-full bg-white/10" />
                                               </div>
                                             </div>
                                             <div className="p-4 grid grid-cols-9 gap-1 shadow-inner bg-[#2C2C2E]/50">
                                               {Array.from({ length: parsedMenu?.size || 54 }).map((_, i) => {
                                                 const itemKey = Object.keys(parsedMenu?.items || {}).find(key => parsedMenu.items[key].slot === i);
                                                 const item = itemKey ? parsedMenu.items[itemKey] : null;
                                                 return (
                                                   <div 
                                                     key={i} 
                                                     className={`aspect-square w-full rounded-sm border transition-all relative group cursor-pointer flex items-center justify-center ${item ? 'bg-[#3D3D3F] border-[#555557] hover:bg-[#4D4D4F] hover:border-[#FF3B30]' : 'bg-[#252527] border-[#333333] hover:border-white/10'}`}
                                                     onClick={() => item && handleSlotClick(item, false)}
                                                   >
                                                     {item ? (
                                                       <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                                                         <LayoutGrid className="w-4 h-4 text-[#86868B] group-hover:text-white" />
                                                         <span className="text-[6px] font-bold text-[#FF3B30] opacity-0 group-hover:opacity-100">{item.slot}</span>
                                                       </div>
                                                     ) : (
                                                       <span className="text-[8px] font-mono text-[#333333] group-hover:text-[#444446]">{i}</span>
                                                     )}
                                                   </div>
                                                 );
                                               })}
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-4 text-center max-w-sm">
                                      <div className="flex items-center gap-3 justify-center">
                                         <Zap className="w-4 h-4 text-[#FF3B30]" />
                                         <h4 className="font-bold uppercase tracking-[0.2em] text-xs text-white">Interactive Blueprint</h4>
                                      </div>
                                      <p className="text-xs text-[#86868B] leading-relaxed">This GUI is reactive. Left-click any slot to simulate logic, or use the Source tab for manual overrides.</p>
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
        {/* Settings Modal */}
        <AnimatePresence>
          {settingsOpen && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl w-full bg-[#1C1C1E] border border-[#333333] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                 <header className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                          <SlidersHorizontal className="w-5 h-5 text-[#FF3B30]" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold uppercase tracking-wider leading-none">Studio Settings</h2>
                          <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mt-1">Configure your workspace environment</span>
                       </div>
                    </div>
                    <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-[#86868B] hover:text-white">
                       <Plus className="w-5 h-5 rotate-45" />
                    </button>
                 </header>

                 <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    <section className="space-y-6">
                       <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF3B30]">Interface Configuration</h3>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="space-y-1">
                                <p className="text-sm font-bold">Accent Color</p>
                                <p className="text-[10px] text-[#86868B]">Global brand and highlight color</p>
                             </div>
                             <div className="flex gap-2">
                                {['#FF3B30', '#007AFF', '#34C759', '#FF9500'].map(c => (
                                  <button 
                                    key={c}
                                    onClick={() => setThemeColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${themeColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                             </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="space-y-1">
                                <p className="text-sm font-bold">Syntax Highlighting</p>
                                <p className="text-[10px] text-[#86868B]">Enable colorful YAML code themes</p>
                             </div>
                             <button 
                              onClick={() => setSyntaxHighlighting(!syntaxHighlighting)}
                              className={`w-12 h-6 rounded-full transition-all relative ${syntaxHighlighting ? 'bg-[#FF3B30]' : 'bg-white/10'}`}
                             >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${syntaxHighlighting ? 'left-7' : 'left-1'}`} />
                             </button>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF3B30]">Core Engine Settings</h3>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="space-y-1">
                                <p className="text-sm font-bold">Neural Auto-Cloud</p>
                                <p className="text-[10px] text-[#86868B]">Automatically sync changes to local storage</p>
                             </div>
                             <button 
                              onClick={() => setAutoSave(!autoSave)}
                              className={`w-12 h-6 rounded-full transition-all relative ${autoSave ? 'bg-[#FF3B30]' : 'bg-white/10'}`}
                             >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSave ? 'left-7' : 'left-1'}`} />
                             </button>
                          </div>

                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-bold">Model Selection</p>
                                <p className="text-[10px] text-[#86868B]">Preferred neural synthesis engine</p>
                              </div>
                              <select className="bg-black/40 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-0">
                                <option>Gemini 1.5 Flash (Default)</option>
                                <option>Gemini 1.5 Pro</option>
                              </select>
                          </div>
                       </div>
                    </section>
                 </div>

                 <footer className="p-8 border-t border-white/5 bg-black/20 flex justify-end">
                    <button 
                      onClick={() => setSettingsOpen(false)}
                      className="px-8 py-3 bg-[#FF3B30] rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:scale-105 transition-all shadow-xl"
                    >
                      Apply Changes
                    </button>
                 </footer>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
              className="bg-[#1C1C1E] border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 lg:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col gap-8 min-h-[500px]"
             >
                <header className="flex items-center justify-between border-b border-white/5 pb-8">
                   <div className="space-y-1">
                      <h2 className="text-3xl font-bold tracking-tight text-white uppercase tracking-wider">Project Wizard</h2>
                      <div className="flex items-center gap-2">
                         {['name', 'intent', 'refs'].map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full transition-all ${wizardStep === s ? 'bg-[#FF3B30] scale-125' : 'bg-[#333333]'}`} />
                               {i < 2 && <div className="w-4 h-px bg-white/10" />}
                            </div>
                         ))}
                         <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-2">Step {wizardStep === 'name' ? '1' : wizardStep === 'intent' ? '2' : '3'} of 3</span>
                      </div>
                   </div>
                   <button onClick={() => { setIsModalOpen(false); setWizardStep('name'); }} className="p-2 hover:bg-white/5 rounded-lg transition-all text-[#86868B] hover:text-white">
                      <Plus className="w-6 h-6 rotate-45" />
                   </button>
                </header>

                <main className="flex-1">
                   <AnimatePresence mode="wait">
                      {wizardStep === 'name' && (
                        <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                           <div className="space-y-4">
                              <h3 className="text-xl font-bold">What's the name of your project?</h3>
                              <p className="text-sm text-[#86868B]">This will be the container for all your menus (e.g. "Main Lobby", "Survival Hub").</p>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] ml-4">Project Identity</label>
                              <input 
                                autoFocus
                                value={wizardData.name}
                                onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter project name..."
                                className="w-full bg-[#2C2C2E] border-none rounded-2xl p-6 text-xl font-bold text-white placeholder:text-white/10 focus:ring-4 focus:ring-[#FF3B30]/20 transition-all outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && wizardData.name.trim() && setWizardStep('intent')}
                              />
                           </div>
                           <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group">
                              <div className="space-y-1">
                                 <h4 className="font-bold">Neural Engine Mode</h4>
                                 <p className="text-[10px] text-[#86868B]">Standard Synthesis or Exact Vision Engine</p>
                              </div>
                              <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                                 <button onClick={() => setWizardData(prev => ({ ...prev, isExact: false }))} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!wizardData.isExact ? 'bg-[#FF3B30] text-white shadow-lg' : 'text-[#86868B] hover:text-white'}`}>Standard</button>
                                 <button onClick={() => setWizardData(prev => ({ ...prev, isExact: true }))} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${wizardData.isExact ? 'bg-[#FF3B30] text-white shadow-lg' : 'text-[#86868B] hover:text-white'}`}>Vision</button>
                              </div>
                           </div>
                        </motion.div>
                      )}

                      {wizardStep === 'intent' && (
                        <motion.div key="intent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                           <div className="space-y-4">
                              <h3 className="text-xl font-bold">Describe your menu intent</h3>
                              <p className="text-sm text-[#86868B]">Tell the engine what you want to create or edit.</p>
                           </div>
                           <div className="space-y-3">
                              <textarea
                                autoFocus
                                value={wizardData.prompt}
                                onChange={(e) => setWizardData(prev => ({ ...prev, prompt: e.target.value }))}
                                placeholder="e.g. A ranks menu with 5 ranks, clicking them upgrades your rank if you have enough money..."
                                className="w-full h-48 bg-[#2C2C2E] border-none rounded-[2rem] p-6 text-base text-white placeholder:text-white/10 focus:ring-4 focus:ring-[#FF3B30]/20 transition-all outline-none resize-none"
                              />
                           </div>
                        </motion.div>
                      )}

                      {wizardStep === 'refs' && (
                        <motion.div key="refs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                           <div className="space-y-4">
                              <h3 className="text-xl font-bold">Structural Reference (Optional)</h3>
                              <p className="text-sm text-[#86868B]">Paste existing DeluxeMenus YAML to guide the neural engine.</p>
                           </div>
                           <div className="space-y-3">
                              <textarea
                                autoFocus
                                value={wizardData.reference}
                                onChange={(e) => setWizardData(prev => ({ ...prev, reference: e.target.value }))}
                                placeholder="Paste YAML here..."
                                className="w-full h-48 bg-[#2C2C2E] border-none rounded-[2rem] p-6 text-sm font-mono text-white placeholder:text-white/10 focus:ring-4 focus:ring-[#FF3B30]/20 transition-all outline-none resize-none"
                              />
                           </div>
                        </motion.div>
                      )}
                   </AnimatePresence>
                </main>

                <footer className="flex gap-4 pt-8 border-t border-white/5">
                   {wizardStep !== 'name' && (
                     <button 
                      onClick={() => setWizardStep(wizardStep === 'intent' ? 'name' : 'intent')}
                      className="px-8 py-4 rounded-2xl font-bold text-xs bg-white/5 hover:bg-white/10 transition-colors text-[#86868B] hover:text-white"
                     >
                      BACK
                     </button>
                   )}
                   <button 
                    onClick={() => {
                      if (wizardStep === 'name') setWizardStep('intent');
                      else if (wizardStep === 'intent') setWizardStep('refs');
                      else handleCreateProject();
                    }}
                    disabled={wizardStep === 'name' && !wizardData.name.trim()}
                    className="flex-1 py-4 rounded-2xl font-bold text-xs bg-[#FF3B30] hover:bg-[#FF453A] disabled:opacity-30 transition-all shadow-[0_10px_30px_rgba(255,59,48,0.3)] text-white"
                   >
                    {wizardStep === 'refs' ? 'INITIALIZE STUDIO' : 'NEXT STEP'}
                   </button>
                </footer>
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
