
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, History as HistoryIcon, LayoutDashboard, BrainCircuit, Loader2, Sparkles, CheckCircle2, Settings2, ChevronDown, ChevronUp, Info, Copy, Check, Globe, Zap, Layers, FileText, Upload, X, Wand2, FileSearch, Cloud, ShieldAlert, ExternalLink } from 'lucide-react';
import { ProjectExample, EstimationResult, EstimationHistory, EstimationConfig, PlatformType } from './types';
import { generateEstimation, parseProjectDocument } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { ExampleCard } from './components/ExampleCard';
import { LoginScreen } from './components/LoginScreen';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SCOPE_OPTIONS = [
  "App, Admin Dashboard, Website",
  "App, Admin Dashboard",
  "App Only",
  "UI/UX Design (Web)",
  "UI/UX Design (App, Web, Admin Dashboard)",
  "Website / Admin Dashboard",
  "Only Frontend (App, Web, Admin Dashboard)"
];

const PHASE_OPTIONS = [
  "UI/UX",
  "Frontend",
  "Backend",
  "Deployment"
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [examples, setExamples] = useState<ProjectExample[]>([]);
  const [history, setHistory] = useState<EstimationHistory[]>([]);
  const [dbReady, setDbReady] = useState(false);

  const [activeTab, setActiveTab] = useState<'estimator' | 'examples' | 'history'>('estimator');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [newReq, setNewReq] = useState('');
  const [currentResult, setCurrentResult] = useState<EstimationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advConfig, setAdvConfig] = useState<EstimationConfig>({
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    avoidanceGuidelines: '',
    quotationFormat: '',
    platform: 'Upwork',
    projectScope: SCOPE_OPTIONS[0],
    phases: [PHASE_OPTIONS[0], PHASE_OPTIONS[1]]
  });

  const [showExampleForm, setShowExampleForm] = useState(false);
  const [exampleTitle, setExampleTitle] = useState('');
  const [exampleReq, setExampleReq] = useState('');
  const [exampleBudget, setExampleBudget] = useState('');
  const [exampleTimeline, setExampleTimeline] = useState('');
  const [exampleFile, setExampleFile] = useState<{ name: string, mimeType: string, data: string } | null>(null);

  const [currentEstimatorFile, setCurrentEstimatorFile] = useState<{ name: string, mimeType: string, data: string } | null>(null);

  const estimatorFileInputRef = useRef<HTMLInputElement>(null);
  const exampleFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const storedExamples = await firebaseService.getAllExamples();
        const storedHistory = await firebaseService.getAllHistory();
        setExamples(storedExamples.sort((a, b) => b.id.localeCompare(a.id)));
        setHistory(storedHistory.sort((a, b) => b.timestamp - a.timestamp));
        setDbReady(true);
      } catch (e) {
        console.error("Failed to load cloud data", e);
        setDbReady(true);
      }
    };
    initData();
  }, []);

  const processFile = async (file: File, target: 'estimator' | 'example') => {
    // Firestore limit is 1MB per document. Base64 increases size by ~33%.
    // 750KB is a safe maximum for the original file.
    const MAX_FILE_SIZE = 750 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert("File too large for Firestore (Max 750KB). Please use a smaller PDF or a screenshot.");
      return;
    }

    setParsing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const mimeType = file.type;

      try {
        const extracted = await parseProjectDocument(base64String, mimeType);

        if (target === 'estimator') {
          setNewReq(extracted.requirements);
          setCurrentEstimatorFile({ name: file.name, mimeType, data: base64String });

          if (extracted.projectScope && extracted.phases) {
            setAdvConfig(prev => ({
              ...prev,
              projectScope: extracted.projectScope || prev.projectScope,
              phases: extracted.phases || prev.phases
            }));
          }
        } else {
          setExampleTitle(extracted.title || '');
          setExampleReq(extracted.requirements);
          setExampleBudget(extracted.budget || '');
          setExampleTimeline(extracted.timeline || '');
          setExampleFile({ name: file.name, mimeType, data: base64String });
        }
      } catch (e) {
        console.error("Parsing failed", e);
        alert("Could not parse file. Try manual entry.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addExample = async () => {
    if (!exampleTitle || !exampleReq || !exampleBudget || !exampleTimeline) return;
    const newEx: ProjectExample = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      title: exampleTitle,
      requirements: exampleReq,
      budget: exampleBudget,
      timeline: exampleTimeline,
      attachment: exampleFile || undefined
    };

    try {
      await firebaseService.saveExample(newEx);
      setExamples(prev => [newEx, ...prev]);
      setExampleTitle('');
      setExampleReq('');
      setExampleBudget('');
      setExampleTimeline('');
      setExampleFile(null);
      setShowExampleForm(false);
    } catch (e) {
      alert("Cloud Sync Error: Document too large for Firestore. Try a smaller file.");
    }
  };

  const deleteExample = async (id: string) => {
    try {
      await firebaseService.deleteExample(id);
      setExamples(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert("Cloud Sync Error: Failed to delete.");
    }
  };

  const clearDatabase = async () => {
    if (window.confirm("Are you sure? This will delete all cloud entries and history forever.")) {
      try {
        await firebaseService.clearAll();
        setExamples([]);
        setHistory([]);
        alert("Cloud database cleared.");
      } catch (e) {
        alert("Clear failed.");
      }
    }
  };

  const handleEstimate = async () => {
    if (!newReq.trim()) return;
    setLoading(true);
    setCurrentResult(null);
    try {
      const result = await generateEstimation(newReq, examples, advConfig);
      setCurrentResult(result);
      const historyEntry: EstimationHistory = {
        ...result,
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        projectName: newReq.slice(0, 40) + '...',
        timestamp: Date.now(),
        config: advConfig,
        attachment: currentEstimatorFile || undefined
      };
      await firebaseService.saveHistory(historyEntry);
      setHistory(prev => [historyEntry, ...prev]);
    } catch (error) {
      console.error("Estimation failed", error);
      alert("Failed to generate estimation.");
    } finally {
      setLoading(false);
    }
  };

  const copyProposal = () => {
    if (currentResult?.proposal) {
      navigator.clipboard.writeText(currentResult.proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openAttachment = (file: { data: string, mimeType: string }) => {
    const byteCharacters = atob(file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
          <Cloud size={32} className="text-orange-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Connecting to Cloud...</h2>
        <p className="text-sm text-slate-500">Syncing with your Firebase project.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Sales Bot</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Cloud Edition</p>
          </div>
        </div>

        <button onClick={() => setActiveTab('estimator')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'estimator' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
          <LayoutDashboard size={20} /> New Estimate
        </button>
        <button onClick={() => setActiveTab('examples')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'examples' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Sparkles size={20} /> Knowledge Base
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'history' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
          <HistoryIcon size={20} /> History
        </button>

        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-all font-semibold">
            <ShieldAlert size={20} /> Logout
          </button>
          <div className="bg-orange-600 rounded-xl p-4 text-white">
            <p className="text-xs opacity-70 mb-2 font-medium">CLOUD RECORDS</p>
            <p className="text-2xl font-bold">{examples.length}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase opacity-60">
              <Cloud size={10} /> Firestore Active
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">

        {activeTab === 'estimator' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Project Estimation</h2>
                <p className="text-slate-500">Estimating with real-time cloud context.</p>
              </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
              {parsing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <FileSearch size={32} className="text-orange-600 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-slate-900">AI Scanning Document...</h3>
                </div>
              )}

              <div className="bg-slate-50/50 p-6 border-b border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={12} /> Target Platform
                    </label>
                    <div className="flex gap-2">
                      {(['Upwork', 'Fiverr', 'Other'] as PlatformType[]).map(p => (
                        <button key={p} onClick={() => setAdvConfig(prev => ({ ...prev, platform: p }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${advConfig.platform === p ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-100' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={12} /> Scope (AI Auto-Detected)
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-600 flex items-center justify-between">
                      {advConfig.projectScope || "Upload a doc to detect..."}
                      <Sparkles size={14} className="text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>


              <div className="px-6 pb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Detected Phases</label>
                <div className="flex flex-wrap gap-2 min-h-[28px]">
                  {advConfig.phases.length > 0 ? advConfig.phases.map(phase => (
                    <span key={phase} className="px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                      <CheckCircle2 size={10} /> {phase}
                    </span>
                  )) : (
                    <span className="text-[10px] text-slate-400 font-medium italic">Upload document to auto-detect phases...</span>
                  )}
                </div>
              </div>

              <div className="p-6 pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requirements</label>
                  <div className="flex gap-2 items-center">
                    {currentEstimatorFile && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px] italic">
                        {currentEstimatorFile.name}
                      </span>
                    )}
                    <button onClick={() => estimatorFileInputRef.current?.click()} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-orange-600 hover:bg-orange-50 px-2 py-1 rounded transition-colors">
                      <Wand2 size={12} /> {currentEstimatorFile ? "Change File" : "Import PDF/Img"}
                    </button>
                  </div>
                  <input type="file" ref={estimatorFileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'estimator')} />
                </div>
                <textarea placeholder="Paste description..." className="w-full h-44 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none text-slate-700 bg-slate-50/30" value={newReq} onChange={(e) => setNewReq(e.target.value)} />

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                  <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors">
                    <Settings2 size={16} /> Data Settings
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {showAdvanced && (
                  <div className="mt-4 p-5 bg-slate-50 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <button onClick={clearDatabase} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors bg-red-50 px-3 py-2 rounded-lg">
                      <ShieldAlert size={14} /> Wipe All Cloud Data
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-8">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    <Cloud size={14} className="text-orange-500" />
                    <span>Using {examples.length} cloud samples</span>
                  </div>
                  <button onClick={handleEstimate} disabled={loading || !newReq.trim()} className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-100 active:scale-95">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    {loading ? "Analyzing..." : "Run Estimation"}
                  </button>
                </div>
              </div>
            </div>

            {currentResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      Proposal Data
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                        <span className="text-orange-600 text-[10px] font-bold uppercase block mb-1">Price</span>
                        <span className="text-slate-900 font-black text-xl">{currentResult.budget}</span>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                        <span className="text-blue-600 text-[10px] font-bold uppercase block mb-1">Time</span>
                        <span className="text-slate-900 font-black text-xl">{currentResult.timeline}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 text-slate-900">Logic</h3>
                    <p className="text-sm text-slate-600 italic leading-relaxed">{currentResult.reasoning}</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-100 overflow-hidden">
                  <div className="bg-orange-50 px-8 py-5 flex justify-between items-center">
                    <h3 className="font-black text-orange-900 uppercase tracking-widest text-sm">Proposal Draft</h3>
                    <button onClick={copyProposal} className="flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm border border-orange-200 transition-all">
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-10 text-slate-800 whitespace-pre-line leading-relaxed text-lg font-medium">{currentResult.proposal}</div>
                </div>
              </div>
            )}
          </div>
        )
        }

        {
          activeTab === 'examples' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
                  <p className="text-slate-500">Cloud-synced training data for your AI Sales Bot.</p>
                </div>
                <button onClick={() => setShowExampleForm(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-100">
                  <Plus size={18} /> Add Success Sample
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {examples.map(ex => <ExampleCard key={ex.id} example={ex} onDelete={deleteExample} />)}
                {examples.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-200"><Cloud size={40} /></div>
                    <h3 className="text-xl font-bold text-slate-900">Cloud is Empty</h3>
                    <p className="text-slate-500 mt-2">Add projects to sync them to Firebase.</p>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {
          activeTab === 'history' && (
            <div className="max-w-4xl mx-auto">
              <header className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Cloud Archive</h2>
                <p className="text-slate-500">Past estimations retrieved from Firestore.</p>
              </header>
              <div className="space-y-4 pb-20">
                {history.map(item => (
                  <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-orange-200 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-black text-slate-900 group-hover:text-orange-600 transition-colors">{item.projectName}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2"><Globe size={10} /> {item.config?.platform}</p>
                          {item.attachment && (
                            <button
                              onClick={() => openAttachment(item.attachment!)}
                              className="text-[10px] text-orange-500 font-bold uppercase flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={10} /> View Source Document
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-orange-50 text-orange-700 text-xs px-4 py-1.5 rounded-full font-black border border-orange-100">{item.budget}</div>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 italic font-medium">"{item.proposal}"</p>
                  </div>
                ))}
              </div>
            </div>
          )
        }
      </main >

      {showExampleForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 my-8 relative">
            {parsing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-[60] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <Wand2 size={40} className="text-orange-600" />
                </div>
                <h3 className="font-black text-xl text-slate-900">Syncing...</h3>
              </div>
            )}
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-orange-50/30">
              <h3 className="text-2xl font-black text-slate-900 leading-none">New Entry</h3>
              <button onClick={() => setShowExampleForm(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex justify-center mb-2">
                <button onClick={() => exampleFileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-700 border-2 border-dashed border-orange-200 py-4 rounded-2xl hover:bg-orange-100 transition-all group">
                  <Upload size={20} />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">{exampleFile ? "File Selected" : "Cloud Import"}</p>
                    <p className="text-[10px] font-medium opacity-70">{exampleFile ? exampleFile.name : "Auto-fill from document"}</p>
                  </div>
                </button>
                <input type="file" ref={exampleFileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'example')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Project Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={exampleTitle} onChange={(e) => setExampleTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Price</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={exampleBudget} onChange={(e) => setExampleBudget(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Timeline</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={exampleTimeline} onChange={(e) => setExampleTimeline(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Context</label>
                <textarea className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none font-medium" value={exampleReq} onChange={(e) => setExampleReq(e.target.value)} />
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-4">
              <button onClick={() => setShowExampleForm(false)} className="flex-1 px-4 py-3 text-slate-400 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={addExample} className="flex-1 px-4 py-3 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100">Sync to Cloud</button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default App;
