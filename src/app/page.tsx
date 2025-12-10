"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Pill, 
  FileBarChart, 
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Bell,
  User,
  ChevronRight,
  LogOut,
  X,
  Loader2,
  Eye,
  UserSearch
} from "lucide-react";
import { supabase, type Document } from "@/lib/supabase";
import { generateLaudo, generateReceita, generateRelatorio } from "@/lib/openai";

type TabType = "dashboard" | "laudos" | "receitas" | "relatorios";
type ModalType = "laudo" | "receita" | "relatorio" | null;

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down";
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [modalSubtype, setModalSubtype] = useState("");
  const [generating, setGenerating] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  // Estados para gestão de paciente
  const [patientSearchName, setPatientSearchName] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientDocuments, setPatientDocuments] = useState<Document[]>([]);
  const [patientSearched, setPatientSearched] = useState(false);

  // Estados dos formulários
  const [laudoForm, setLaudoForm] = useState({
    paciente: "",
    idade: "",
    sexo: "M",
    queixaPrincipal: "",
    historico: "",
    exame: "",
    observacoes: ""
  });

  const [receitaForm, setReceitaForm] = useState({
    paciente: "",
    idade: "",
    sexo: "M",
    diagnostico: "",
    medicamentos: "",
    posologia: "",
    duracao: "",
    observacoes: ""
  });

  const [relatorioForm, setRelatorioForm] = useState({
    paciente: "",
    idade: "",
    sexo: "M",
    motivoInternacao: "",
    evolucao: "",
    procedimentos: "",
    condicaoAlta: "",
    recomendacoes: "",
    observacoes: ""
  });

  // Carregar usuário e documentos
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      if (mounted) {
        await checkUser();
        await loadDocuments();
      }
    };

    initializeApp();

    // Listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadDocuments();
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatient = async () => {
    if (!user || !patientSearchName.trim()) {
      alert('Digite o nome do paciente para buscar');
      return;
    }

    try {
      setSearchingPatient(true);
      setPatientSearched(true);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .ilike('patient_name', `%${patientSearchName.trim()}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatientDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      alert('Erro ao buscar dados do paciente');
    } finally {
      setSearchingPatient(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setDocuments([]);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleAuthClick = () => {
    router.push('/auth');
  };

  const openModal = (type: ModalType, subtype: string) => {
    if (!user) {
      alert('Faça login para criar documentos');
      return;
    }
    setModalOpen(type);
    setModalSubtype(subtype);
    // Resetar formulários
    setLaudoForm({
      paciente: "",
      idade: "",
      sexo: "M",
      queixaPrincipal: "",
      historico: "",
      exame: "",
      observacoes: ""
    });
    setReceitaForm({
      paciente: "",
      idade: "",
      sexo: "M",
      diagnostico: "",
      medicamentos: "",
      posologia: "",
      duracao: "",
      observacoes: ""
    });
    setRelatorioForm({
      paciente: "",
      idade: "",
      sexo: "M",
      motivoInternacao: "",
      evolucao: "",
      procedimentos: "",
      condicaoAlta: "",
      recomendacoes: "",
      observacoes: ""
    });
  };

  const closeModal = () => {
    setModalOpen(null);
    setModalSubtype("");
    setGenerating(false);
  };

  const handleViewDocument = (doc: Document) => {
    setViewingDocument(doc);
  };

  const closeViewModal = () => {
    setViewingDocument(null);
  };

  const handleGenerateLaudo = async () => {
    if (!user || !laudoForm.paciente || !laudoForm.idade || !laudoForm.queixaPrincipal) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setGenerating(true);
      
      // Gerar conteúdo com IA
      const content = await generateLaudo({
        tipo: modalSubtype,
        ...laudoForm
      });

      // Salvar no Supabase
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          type: 'laudo',
          subtype: modalSubtype,
          patient_name: laudoForm.paciente,
          patient_info: {
            idade: laudoForm.idade,
            sexo: laudoForm.sexo,
            queixaPrincipal: laudoForm.queixaPrincipal,
            historico: laudoForm.historico,
            exame: laudoForm.exame,
            observacoes: laudoForm.observacoes
          },
          content,
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      // Recarregar documentos
      await loadDocuments();
      closeModal();
      alert('Laudo gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar laudo:', error);
      if (error.message?.includes('API key')) {
        alert('Configure sua API Key da OpenAI nas variáveis de ambiente (NEXT_PUBLIC_OPENAI_API_KEY)');
      } else {
        alert('Erro ao gerar laudo. Tente novamente.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateReceita = async () => {
    if (!user || !receitaForm.paciente || !receitaForm.idade || !receitaForm.diagnostico || !receitaForm.medicamentos) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setGenerating(true);
      
      // Gerar conteúdo com IA
      const content = await generateReceita({
        tipo: modalSubtype,
        ...receitaForm
      });

      // Salvar no Supabase
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          type: 'receita',
          subtype: modalSubtype,
          patient_name: receitaForm.paciente,
          patient_info: {
            idade: receitaForm.idade,
            sexo: receitaForm.sexo,
            diagnostico: receitaForm.diagnostico,
            medicamentos: receitaForm.medicamentos,
            posologia: receitaForm.posologia,
            duracao: receitaForm.duracao,
            observacoes: receitaForm.observacoes
          },
          content,
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      // Recarregar documentos
      await loadDocuments();
      closeModal();
      alert('Receita gerada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar receita:', error);
      if (error.message?.includes('API key')) {
        alert('Configure sua API Key da OpenAI nas variáveis de ambiente (NEXT_PUBLIC_OPENAI_API_KEY)');
      } else {
        alert('Erro ao gerar receita. Tente novamente.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateRelatorio = async () => {
    if (!user || !relatorioForm.paciente || !relatorioForm.idade || !relatorioForm.evolucao || !relatorioForm.procedimentos) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setGenerating(true);
      
      // Gerar conteúdo com IA
      const content = await generateRelatorio({
        tipo: modalSubtype,
        ...relatorioForm
      });

      // Salvar no Supabase
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          type: 'relatorio',
          subtype: modalSubtype,
          patient_name: relatorioForm.paciente,
          patient_info: {
            idade: relatorioForm.idade,
            sexo: relatorioForm.sexo,
            motivoInternacao: relatorioForm.motivoInternacao,
            evolucao: relatorioForm.evolucao,
            procedimentos: relatorioForm.procedimentos,
            condicaoAlta: relatorioForm.condicaoAlta,
            recomendacoes: relatorioForm.recomendacoes,
            observacoes: relatorioForm.observacoes
          },
          content,
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      // Recarregar documentos
      await loadDocuments();
      closeModal();
      alert('Relatório gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      if (error.message?.includes('API key')) {
        alert('Configure sua API Key da OpenAI nas variáveis de ambiente (NEXT_PUBLIC_OPENAI_API_KEY)');
      } else {
        alert('Erro ao gerar relatório. Tente novamente.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Calcular estatísticas baseadas nos documentos reais
  const stats: StatCard[] = [
    {
      title: "Documentos Gerados",
      value: documents.length.toString(),
      change: "+12.5%",
      icon: <FileText className="w-5 h-5" />,
      trend: "up"
    },
    {
      title: "Laudos Este Mês",
      value: documents.filter(d => d.type === 'laudo').length.toString(),
      change: "+8.2%",
      icon: <FileBarChart className="w-5 h-5" />,
      trend: "up"
    },
    {
      title: "Receitas Emitidas",
      value: documents.filter(d => d.type === 'receita').length.toString(),
      change: "+15.3%",
      icon: <Pill className="w-5 h-5" />,
      trend: "up"
    },
    {
      title: "Relatórios",
      value: documents.filter(d => d.type === 'relatorio').length.toString(),
      change: "-18.4%",
      icon: <Clock className="w-5 h-5" />,
      trend: "down"
    }
  ];

  // Documentos recentes (últimos 4)
  const recentItems = documents.slice(0, 4).map(doc => ({
    id: doc.id,
    type: doc.type === 'laudo' ? 'Laudo' : doc.type === 'receita' ? 'Receita' : 'Relatório',
    patient: doc.patient_name,
    date: formatDate(doc.created_at),
    status: doc.status as "completed" | "pending",
    document: doc
  }));

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  }

  const quickActions = [
    { 
      icon: <FileText className="w-6 h-6" />, 
      label: "Novo Laudo", 
      color: "from-[#FF6F00] to-[#FFD600]",
      onClick: () => openModal('laudo', 'Laudo Geral')
    },
    { 
      icon: <Pill className="w-6 h-6" />, 
      label: "Nova Receita", 
      color: "from-[#FFD600] to-[#FF6F00]",
      onClick: () => openModal('receita', 'Receita Simples')
    },
    { 
      icon: <FileBarChart className="w-6 h-6" />, 
      label: "Novo Relatório", 
      color: "from-[#FF6F00] to-[#FFD600]",
      onClick: () => openModal('relatorio', 'Evolução Clínica')
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-[#0D0D0D]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6F00] to-[#FFD600] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#0D0D0D]" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF6F00] to-[#FFD600] bg-clip-text text-transparent">
                Medfy
              </h1>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar paciente, documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <Bell className="w-5 h-5 text-white/70" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6F00] rounded-full"></span>
              </button>
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
                    <User className="w-4 h-4 text-white/70" />
                    <span className="text-sm text-white/70">{user.email}</span>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5 text-white/70" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleAuthClick}
                  className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#FF6F00] to-[#FFD600] hover:opacity-90 transition-all text-sm font-semibold text-[#0D0D0D]"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/5 bg-[#0D0D0D]/50 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: "laudos", label: "Laudos", icon: <FileText className="w-4 h-4" /> },
              { id: "receitas", label: "Receitas", icon: <Pill className="w-4 h-4" /> },
              { id: "relatorios", label: "Relatórios", icon: <FileBarChart className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-[#FF6F00] border-b-2 border-[#FF6F00]"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user && (
          <div className="mb-8 bg-gradient-to-r from-[#FF6F00]/10 to-[#FFD600]/10 border border-[#FF6F00]/20 rounded-2xl p-6 text-center">
            <p className="text-white/80 mb-4">
              Faça login para acessar seus documentos e criar novos laudos, receitas e relatórios
            </p>
            <button 
              onClick={handleAuthClick}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6F00] to-[#FFD600] font-semibold text-[#0D0D0D] hover:opacity-90 transition-all"
            >
              Criar Conta ou Entrar
            </button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-[#FF6F00]/50 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF6F00]/20 to-[#FFD600]/20 text-[#FF6F00]">
                      {stat.icon}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trend === "up" ? "text-green-400" : "text-[#FFD600]"
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-white/60 text-sm mb-1">{stat.title}</h3>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF6F00]" />
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    disabled={!user}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF6F00]/50 rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] text-left overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                    <div className="relative flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-[#0D0D0D]`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{action.label}</p>
                        <p className="text-xs text-white/50 mt-1">Com IA em segundos</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#FF6F00] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid com Recent Activity e Gestão de Paciente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#FF6F00]" />
                    Atividade Recente
                  </h2>
                  <button className="text-sm text-[#FF6F00] hover:text-[#FFD600] transition-colors">
                    Ver todos
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-8 text-white/50">Carregando...</div>
                ) : recentItems.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    Nenhum documento criado ainda. Use as ações rápidas acima!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleViewDocument(item.document)}
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            item.status === "completed" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-[#FFD600]/20 text-[#FFD600]"
                          }`}>
                            {item.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{item.type}</p>
                            <p className="text-sm text-white/50">{item.patient}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/40">{item.date}</span>
                          <Eye className="w-4 h-4 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gestão de Paciente */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserSearch className="w-5 h-5 text-[#FF6F00]" />
                    Gestão de Paciente
                  </h2>
                </div>

                {/* Campo de busca */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Nome do Paciente
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={patientSearchName}
                        onChange={(e) => setPatientSearchName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                        placeholder="Digite o nome do paciente..."
                        disabled={!user}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] transition-all disabled:opacity-50"
                      />
                      <button
                        onClick={handleSearchPatient}
                        disabled={!user || searchingPatient || !patientSearchName.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {searchingPatient ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Resultados da busca */}
                  {!user ? (
                    <div className="text-center py-8 text-white/50">
                      Faça login para buscar pacientes
                    </div>
                  ) : patientSearched && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {searchingPatient ? (
                        <div className="text-center py-8 text-white/50">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Buscando...
                        </div>
                      ) : patientDocuments.length === 0 ? (
                        <div className="text-center py-8 text-white/50">
                          Nenhum documento encontrado para "{patientSearchName}"
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 pb-3 border-b border-white/10">
                            <p className="text-sm text-white/70">
                              <span className="font-semibold text-[#FF6F00]">{patientDocuments.length}</span> documento(s) encontrado(s) para <span className="font-semibold text-white">"{patientSearchName}"</span>
                            </p>
                          </div>
                          {patientDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              onClick={() => handleViewDocument(doc)}
                              className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    doc.type === 'laudo' ? 'bg-[#FF6F00]/20 text-[#FF6F00]' :
                                    doc.type === 'receita' ? 'bg-[#FFD600]/20 text-[#FFD600]' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {doc.type === 'laudo' ? <FileText className="w-3 h-3" /> :
                                     doc.type === 'receita' ? <Pill className="w-3 h-3" /> :
                                     <FileBarChart className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs font-medium text-white/70 uppercase">
                                    {doc.type}
                                  </span>
                                </div>
                                <Eye className="w-4 h-4 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                              </div>
                              <p className="font-semibold text-white mb-1">{doc.subtype}</p>
                              <p className="text-xs text-white/50">{formatDate(doc.created_at)}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "laudos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Laudos Médicos</h2>
                <p className="text-white/60">Gere laudos completos com IA em segundos</p>
              </div>
              <button 
                onClick={() => openModal('laudo', 'Laudo Geral')}
                disabled={!user}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Novo Laudo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Raio-X Tórax", "Ultrassom Abdominal", "Ressonância Magnética", "Tomografia", "Ecocardiograma", "Mamografia"].map((type, index) => (
                <button
                  key={index}
                  onClick={() => openModal('laudo', type)}
                  disabled={!user}
                  className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-[#FF6F00]/50 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#FF6F00]/20 to-[#FFD600]/20">
                      <FileText className="w-6 h-6 text-[#FF6F00]" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{type}</h3>
                  <p className="text-sm text-white/50">Preencha o quiz e gere automaticamente</p>
                </button>
              ))}
            </div>

            {/* Lista de laudos existentes */}
            {documents.filter(d => d.type === 'laudo').length > 0 && (
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Seus Laudos</h3>
                <div className="space-y-3">
                  {documents.filter(d => d.type === 'laudo').map((doc) => (
                    <div 
                      key={doc.id} 
                      onClick={() => handleViewDocument(doc)}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{doc.subtype}</p>
                          <p className="text-sm text-white/50">{doc.patient_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40">{formatDate(doc.created_at)}</span>
                          <Eye className="w-4 h-4 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "receitas" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Receitas Médicas</h2>
                <p className="text-white/60">Prescrições digitais com validação automática</p>
              </div>
              <button 
                onClick={() => openModal('receita', 'Receita Simples')}
                disabled={!user}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Nova Receita
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Receita Simples", "Receita Controlada", "Receita Especial", "Receita Antimicrobiana"].map((type, index) => (
                <button
                  key={index}
                  onClick={() => openModal('receita', type)}
                  disabled={!user}
                  className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-[#FF6F00]/50 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#FFD600]/20 to-[#FF6F00]/20">
                      <Pill className="w-6 h-6 text-[#FFD600]" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{type}</h3>
                  <p className="text-sm text-white/50">Conforme legislação vigente</p>
                </button>
              ))}
            </div>

            {/* Lista de receitas existentes */}
            {documents.filter(d => d.type === 'receita').length > 0 && (
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Suas Receitas</h3>
                <div className="space-y-3">
                  {documents.filter(d => d.type === 'receita').map((doc) => (
                    <div 
                      key={doc.id} 
                      onClick={() => handleViewDocument(doc)}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{doc.subtype}</p>
                          <p className="text-sm text-white/50">{doc.patient_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40">{formatDate(doc.created_at)}</span>
                          <Eye className="w-4 h-4 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "relatorios" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Relatórios Médicos</h2>
                <p className="text-white/60">Documentação completa e detalhada</p>
              </div>
              <button 
                onClick={() => openModal('relatorio', 'Evolução Clínica')}
                disabled={!user}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Novo Relatório
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Evolução Clínica", "Alta Hospitalar", "Atestado Médico", "Relatório Cirúrgico", "Parecer Técnico", "Sumário de Internação"].map((type, index) => (
                <button
                  key={index}
                  onClick={() => openModal('relatorio', type)}
                  disabled={!user}
                  className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-[#FF6F00]/50 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#FF6F00]/20 to-[#FFD600]/20">
                      <FileBarChart className="w-6 h-6 text-[#FF6F00]" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{type}</h3>
                  <p className="text-sm text-white/50">Geração inteligente com IA</p>
                </button>
              ))}
            </div>

            {/* Lista de relatórios existentes */}
            {documents.filter(d => d.type === 'relatorio').length > 0 && (
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Seus Relatórios</h3>
                <div className="space-y-3">
                  {documents.filter(d => d.type === 'relatorio').map((doc) => (
                    <div 
                      key={doc.id} 
                      onClick={() => handleViewDocument(doc)}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{doc.subtype}</p>
                          <p className="text-sm text-white/50">{doc.patient_name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40">{formatDate(doc.created_at)}</span>
                          <Eye className="w-4 h-4 text-white/20 group-hover:text-[#FF6F00] transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Visualização de Documento */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{viewingDocument.subtype}</h3>
                <p className="text-white/60 text-sm mt-1">Paciente: {viewingDocument.patient_name}</p>
              </div>
              <button onClick={closeViewModal} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
                    {viewingDocument.content}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-white/10 p-6 flex gap-3">
              <button
                onClick={closeViewModal}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-white transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingDocument.content);
                  alert('Conteúdo copiado para a área de transferência!');
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all"
              >
                Copiar Conteúdo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Laudo */}
      {modalOpen === 'laudo' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{modalSubtype}</h3>
                <p className="text-white/60 text-sm mt-1">Preencha as informações do paciente</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nome do Paciente *</label>
                  <input
                    type="text"
                    value={laudoForm.paciente}
                    onChange={(e) => setLaudoForm({...laudoForm, paciente: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Idade *</label>
                    <input
                      type="number"
                      value={laudoForm.idade}
                      onChange={(e) => setLaudoForm({...laudoForm, idade: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                      placeholder="35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Sexo *</label>
                    <select
                      value={laudoForm.sexo}
                      onChange={(e) => setLaudoForm({...laudoForm, sexo: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Queixa Principal *</label>
                <input
                  type="text"
                  value={laudoForm.queixaPrincipal}
                  onChange={(e) => setLaudoForm({...laudoForm, queixaPrincipal: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: Dor torácica há 3 dias"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Histórico Clínico</label>
                <textarea
                  value={laudoForm.historico}
                  onChange={(e) => setLaudoForm({...laudoForm, historico: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[80px]"
                  placeholder="Histórico médico relevante..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Exame Realizado</label>
                <input
                  type="text"
                  value={laudoForm.exame}
                  onChange={(e) => setLaudoForm({...laudoForm, exame: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: Raio-X de tórax em PA e perfil"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Observações Adicionais</label>
                <textarea
                  value={laudoForm.observacoes}
                  onChange={(e) => setLaudoForm({...laudoForm, observacoes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[60px]"
                  placeholder="Informações complementares..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-white/10 p-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateLaudo}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Laudo com IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Receita */}
      {modalOpen === 'receita' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{modalSubtype}</h3>
                <p className="text-white/60 text-sm mt-1">Preencha as informações da prescrição</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nome do Paciente *</label>
                  <input
                    type="text"
                    value={receitaForm.paciente}
                    onChange={(e) => setReceitaForm({...receitaForm, paciente: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Idade *</label>
                    <input
                      type="number"
                      value={receitaForm.idade}
                      onChange={(e) => setReceitaForm({...receitaForm, idade: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                      placeholder="35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Sexo *</label>
                    <select
                      value={receitaForm.sexo}
                      onChange={(e) => setReceitaForm({...receitaForm, sexo: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Diagnóstico *</label>
                <input
                  type="text"
                  value={receitaForm.diagnostico}
                  onChange={(e) => setReceitaForm({...receitaForm, diagnostico: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: Hipertensão arterial sistêmica"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Medicamentos *</label>
                <textarea
                  value={receitaForm.medicamentos}
                  onChange={(e) => setReceitaForm({...receitaForm, medicamentos: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[80px]"
                  placeholder="Ex: Losartana 50mg, Hidroclorotiazida 25mg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Posologia</label>
                <textarea
                  value={receitaForm.posologia}
                  onChange={(e) => setReceitaForm({...receitaForm, posologia: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[60px]"
                  placeholder="Ex: 1 comprimido pela manhã"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Duração do Tratamento</label>
                <input
                  type="text"
                  value={receitaForm.duracao}
                  onChange={(e) => setReceitaForm({...receitaForm, duracao: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: 30 dias"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Observações Adicionais</label>
                <textarea
                  value={receitaForm.observacoes}
                  onChange={(e) => setReceitaForm({...receitaForm, observacoes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[60px]"
                  placeholder="Orientações complementares..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-white/10 p-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateReceita}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Receita com IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Relatório */}
      {modalOpen === 'relatorio' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0D0D0D] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{modalSubtype}</h3>
                <p className="text-white/60 text-sm mt-1">Preencha as informações do relatório</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nome do Paciente *</label>
                  <input
                    type="text"
                    value={relatorioForm.paciente}
                    onChange={(e) => setRelatorioForm({...relatorioForm, paciente: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Idade *</label>
                    <input
                      type="number"
                      value={relatorioForm.idade}
                      onChange={(e) => setRelatorioForm({...relatorioForm, idade: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                      placeholder="35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Sexo *</label>
                    <select
                      value={relatorioForm.sexo}
                      onChange={(e) => setRelatorioForm({...relatorioForm, sexo: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Motivo da Internação</label>
                <input
                  type="text"
                  value={relatorioForm.motivoInternacao}
                  onChange={(e) => setRelatorioForm({...relatorioForm, motivoInternacao: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: Pneumonia bacteriana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Evolução Clínica *</label>
                <textarea
                  value={relatorioForm.evolucao}
                  onChange={(e) => setRelatorioForm({...relatorioForm, evolucao: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[80px]"
                  placeholder="Descreva a evolução do quadro clínico..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Procedimentos Realizados *</label>
                <textarea
                  value={relatorioForm.procedimentos}
                  onChange={(e) => setRelatorioForm({...relatorioForm, procedimentos: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[80px]"
                  placeholder="Liste os procedimentos e tratamentos realizados..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Condição na Alta</label>
                <input
                  type="text"
                  value={relatorioForm.condicaoAlta}
                  onChange={(e) => setRelatorioForm({...relatorioForm, condicaoAlta: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00]"
                  placeholder="Ex: Estável, assintomático"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Recomendações</label>
                <textarea
                  value={relatorioForm.recomendacoes}
                  onChange={(e) => setRelatorioForm({...relatorioForm, recomendacoes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[60px]"
                  placeholder="Orientações e recomendações pós-alta..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Observações Adicionais</label>
                <textarea
                  value={relatorioForm.observacoes}
                  onChange={(e) => setRelatorioForm({...relatorioForm, observacoes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] min-h-[60px]"
                  placeholder="Informações complementares..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0D0D0D] border-t border-white/10 p-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateRelatorio}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF6F00] to-[#FFD600] rounded-xl font-semibold text-[#0D0D0D] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Relatório com IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
