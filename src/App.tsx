/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Users, MessageSquare, Settings, Search, Calendar, AlertTriangle, AlertCircle,
  LogOut, Plus, Upload, Download, RefreshCw, CheckCircle2, ChevronRight, X, Sparkles, Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Firebase core
import { 
  auth, db, getUserCollectionPath, testConnection, handleFirestoreError, OperationType 
} from './firebase';
import { 
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { 
  collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, serverTimestamp 
} from 'firebase/firestore';

// Types & Custom Components
import { Empresa, Contacto, Interaccion, Documento, Relacion, GrupoRelacion, UNSPSC_OPTIONS, UnspscCode } from './types';
import { CompanyCard } from './components/CompanyCard';
import { ContactCard } from './components/ContactCard';
import { InteractionCard } from './components/InteractionCard';
import { DashboardStats } from './components/DashboardStats';
import { AlertsBanner } from './components/AlertsBanner';
import { CustomCalendar } from './components/CustomCalendar';
import { LeafletMap } from './components/LeafletMap';
import { FichasModales } from './components/FichasModales';
import { SearchSelect } from './components/SearchSelect';
import { PinLocationMapModal } from './components/PinLocationMapModal';
import { TagManager } from './components/TagManager';

// Utilities
import { exportToExcel, parseExcelFile } from './utils/excel';
import { generateCompanyReportPDF } from './utils/pdf';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Core Collections
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [syncing, setSyncing] = useState(false);

  // App Navigation & Filters
  const [currentTab, setCurrentTab] = useState<'empresas' | 'contactos' | 'interacciones' | 'configuracion'>('empresas');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sortBy, setSortBy] = useState('nombre_asc');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedUnspsc, setSelectedUnspsc] = useState<string | null>(null);

  // Rapid Filter
  const [quickFilter, setQuickFilter] = useState('');

  // Selected Detail States (Fichas)
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [selectedContId, setSelectedContactoId] = useState<string | null>(null);
  const [selectedInterId, setSelectedInterId] = useState<string | null>(null);

  const handleOpenEmpresa = (id: string | null) => {
    setSelectedEmpId(id);
    if (id) {
      setSelectedContactoId(null);
      setSelectedInterId(null);
    }
  };

  const handleOpenContacto = (id: string | null) => {
    setSelectedContactoId(id);
    if (id) {
      setSelectedEmpId(null);
      setSelectedInterId(null);
    }
  };

  const handleOpenInteraccion = (id: string | null) => {
    setSelectedInterId(id);
    if (id) {
      setSelectedEmpId(null);
      setSelectedContactoId(null);
    }
  };

  // Creation Modals
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showAddRelacionModal, setShowAddRelacionModal] = useState(false);

  // Creation Forms State
  const [newCompany, setNewCompany] = useState<Partial<Empresa>>({
    nombre: '', tipo: 'fabricante', estado: 'prospecto', nit: '', direccion: '', cp: '', ciudad: '', provincia: '', pais: 'España', telefono: '', email: '', web: '', unspscCodes: []
  });

  const [newCompanyUnspscSearch, setNewCompanyUnspscSearch] = useState('');
  const [newCompanyUnspscResults, setNewCompanyUnspscResults] = useState<UnspscCode[]>([]);
  const [isSearchingNewCompanyUnspsc, setIsSearchingNewCompanyUnspsc] = useState(false);

  useEffect(() => {
    if (!newCompanyUnspscSearch.trim()) {
      setNewCompanyUnspscResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingNewCompanyUnspsc(true);
      try {
        const response = await fetch("/api/unspsc/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: newCompanyUnspscSearch })
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.codes)) {
            setNewCompanyUnspscResults(data.codes);
          }
        }
      } catch (err) {
        console.error("Error searching UNSPSC for new company:", err);
      } finally {
        setIsSearchingNewCompanyUnspsc(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [newCompanyUnspscSearch]);

  const [mainUnspscSearch, setMainUnspscSearch] = useState('');
  const [mainUnspscResults, setMainUnspscResults] = useState<UnspscCode[]>([]);
  const [isSearchingMainUnspsc, setIsSearchingMainUnspsc] = useState(false);
  const [showMainUnspscDropdown, setShowMainUnspscDropdown] = useState(false);

  const mainUnspscDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainUnspscDropdownRef.current && !mainUnspscDropdownRef.current.contains(event.target as Node)) {
        setShowMainUnspscDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!mainUnspscSearch.trim()) {
      setMainUnspscResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingMainUnspsc(true);
      try {
        const response = await fetch("/api/unspsc/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mainUnspscSearch })
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.codes)) {
            setMainUnspscResults(data.codes);
          }
        }
      } catch (err) {
        console.error("Error searching UNSPSC for main filters:", err);
      } finally {
        setIsSearchingMainUnspsc(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [mainUnspscSearch]);
  const [newContacto, setNewContacto] = useState<Partial<Contacto>>({
    nombre: '', empresaId: '', cargo: '', reportaA: null, telefono: '', email: '', linkedin: '', notas: '', estado: 'activo'
  });
  const [newInteraccion, setNewInteraccion] = useState<Partial<Interaccion>>({
    asunto: '', tipo: 'reunion', fecha: new Date().toISOString().slice(0, 10), fechaLimite: null, descripcion: '', estado: 'pendiente', resolucion: ''
  });

  // Selected contacts/companies for new interaction
  const [selectedInterContacts, setSelectedInterContacts] = useState<string[]>([]);
  const [selectedInterCompanies, setSelectedInterCompanies] = useState<string[]>([]);

  // Open / Close alerts modal
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [pinningEmpresa, setPinningEmpresa] = useState<Empresa | null>(null);

  // 1. Auth Listener & test connection
  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Escape key listener for search, alerts and calendar modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowAlertsModal(false);
        setShowCalendarModal(false);
        setPinningEmpresa(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Real-time Collections Synchronization
  useEffect(() => {
    if (!user) return;

    setSyncing(true);
    const unsubscribers: (() => void)[] = [];

    const syncCollection = (colName: string, setter: (data: any[]) => void) => {
      const path = getUserCollectionPath(colName);
      const unsub = onSnapshot(collection(db, path), (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setter(data);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
      unsubscribers.push(unsub);
    };

    syncCollection('empresas', setEmpresas);
    syncCollection('contactos', setContactos);
    syncCollection('interacciones', setInteracciones);
    syncCollection('relaciones', setRelaciones);
    syncCollection('documentos', setDocumentos);

    setSyncing(false);

    return () => {
      unsubscribers.forEach(u => u());
    };
  }, [user]);

  // Auth Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: any) {
      setAuthError(err.message || 'Error al registrarse');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // CRUD Operations Helpers (wrapped to adhere to standard error handlers)
  const saveDocument = async (col: string, data: any, id?: string): Promise<string | undefined> => {
    setSyncing(true);
    const path = getUserCollectionPath(col);
    try {
      if (id) {
        await setDoc(doc(db, path, id), data, { merge: true });
        return id;
      } else {
        const docRef = await addDoc(collection(db, path), { ...data, fecha_creacion: new Date().toISOString() });
        return docRef.id;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return undefined;
    } finally {
      setSyncing(false);
    }
  };

  const deleteDocument = async (col: string, id: string) => {
    setSyncing(true);
    const path = getUserCollectionPath(col);
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setSyncing(false);
    }
  };

  // Scores and Alert Calculations
  const scores = useMemo(() => {
    const res: { [id: string]: { nivel: 'verde' | 'amarillo' | 'rojo' | 'gris'; label: string; dias: number | null } } = {};
    empresas.forEach(emp => {
      // Prioritize Performance Evaluation score if present
      if (emp.evaluacion && emp.evaluacion.plazos > 0 && emp.evaluacion.calidad > 0 && emp.evaluacion.flexibilidad > 0) {
        const avg = (emp.evaluacion.plazos + emp.evaluacion.calidad + emp.evaluacion.flexibilidad) / 3;
        let nivel: 'verde' | 'amarillo' | 'rojo' = 'verde';
        let label = `⭐ Eval: ${avg.toFixed(1)}/5`;
        if (avg < 2.5) {
          nivel = 'rojo';
        } else if (avg < 4.0) {
          nivel = 'amarillo';
        }
        res[emp.id!] = { nivel, label, dias: null };
        return;
      }

      const conts = contactos.filter(c => c.empresaId === emp.id || c.empresaIds?.includes(emp.id!));
      if (!conts.length) {
        res[emp.id!] = { nivel: 'gris', label: '⬜ Sin contactos', dias: null };
        return;
      }
      const inters = interacciones.filter(i => {
        const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
        return ids.some(cid => conts.some(c => c.id === cid));
      });
      if (!inters.length) {
        res[emp.id!] = { nivel: 'gris', label: '⬜ Sin interacciones', dias: null };
        return;
      }
      const dates = inters.map(i => new Date(i.fecha).getTime());
      const maxDate = Math.max(...dates);
      const diffDays = Math.floor((Date.now() - maxDate) / 86400000);
      let nivel: 'verde' | 'amarillo' | 'rojo' = 'verde';
      let label = `🟢 Activo (hace ${diffDays}d)`;
      if (diffDays > 90) {
        nivel = 'rojo';
        label = `🔴 Inactivo (hace ${diffDays}d)`;
      } else if (diffDays > 30) {
        nivel = 'amarillo';
        label = `🟡 Tibio (hace ${diffDays}d)`;
      }
      res[emp.id!] = { nivel, label, dias: diffDays };
    });
    return res;
  }, [empresas, contactos, interacciones]);

  const overdueInteractions = useMemo(() => {
    return interacciones.filter(i => i.fechaLimite && i.estado === 'pendiente' && new Date(i.fechaLimite) < new Date());
  }, [interacciones]);

  const expiringDocs = useMemo(() => {
    const list: { doc: Documento; companyName: string; dias: number }[] = [];
    documentos.forEach(d => {
      if (!d.fechaCaducidad) return;
      const fCad = new Date(d.fechaCaducidad + 'T12:00:00');
      const diffDays = Math.ceil((fCad.getTime() - new Date().getTime()) / 86400000);
      if (diffDays <= 30) {
        const empName = empresas.find(e => e.id === d.empresaId)?.nombre || 'Empresa';
        list.push({ doc: d, companyName: empName, dias: diffDays });
      }
    });
    return list;
  }, [documentos, empresas]);

  const inactiveCompanies = useMemo(() => {
    return empresas
      .filter(e => (e.estado === 'homologado' || e.estado === 'validado') && scores[e.id!]?.nivel === 'rojo')
      .map(e => ({ emp: e, dias: scores[e.id!]?.dias }));
  }, [empresas, scores]);

  // Main Lists Filter & Sort
  const filteredEmpresas = useMemo(() => {
    let list = [...empresas];
    const queryStr = quickFilter.toLowerCase().trim();
    if (queryStr) {
      list = list.filter(e => 
        e.nombre.toLowerCase().includes(queryStr) || 
        (e.nit && e.nit.toLowerCase().includes(queryStr)) ||
        (e.unspscCodes || []).some(u => 
          u.code.toLowerCase().includes(queryStr) || 
          u.name.toLowerCase().includes(queryStr) ||
          (u.segment && u.segment.toLowerCase().includes(queryStr))
        )
      );
    }
    if (selectedTag) {
      list = list.filter(e => e.tags?.includes(selectedTag));
    }
    if (selectedUnspsc) {
      list = list.filter(e => e.unspscCodes?.some(u => u.code === selectedUnspsc));
    }
    
    // Sort
    if (sortBy === 'nombre_asc') list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sortBy === 'nombre_desc') list.sort((a, b) => b.nombre.localeCompare(a.nombre));
    if (sortBy === 'fecha_asc') list.sort((a, b) => a.fecha_creacion.localeCompare(b.fecha_creacion));
    if (sortBy === 'fecha_desc') list.sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion));
    
    return list;
  }, [empresas, quickFilter, selectedTag, selectedUnspsc, sortBy]);

  const filteredContactos = useMemo(() => {
    let list = [...contactos];
    const queryStr = quickFilter.toLowerCase().trim();
    if (queryStr) {
      list = list.filter(c => c.nombre.toLowerCase().includes(queryStr) || c.cargo.toLowerCase().includes(queryStr));
    }
    
    if (sortBy === 'nombre_asc') list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sortBy === 'nombre_desc') list.sort((a, b) => b.nombre.localeCompare(a.nombre));
    if (sortBy === 'fecha_asc') list.sort((a, b) => a.fecha_creacion.localeCompare(b.fecha_creacion));
    if (sortBy === 'fecha_desc') list.sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion));
    
    return list;
  }, [contactos, quickFilter, sortBy]);

  const filteredInteracciones = useMemo(() => {
    let list = [...interacciones];
    const queryStr = quickFilter.toLowerCase().trim();
    if (queryStr) {
      list = list.filter(i => i.asunto.toLowerCase().includes(queryStr) || i.descripcion.toLowerCase().includes(queryStr));
    }
    
    if (sortBy === 'nombre_asc') list.sort((a, b) => a.asunto.localeCompare(b.asunto));
    if (sortBy === 'nombre_desc') list.sort((a, b) => b.asunto.localeCompare(a.asunto));
    if (sortBy === 'fecha_asc') list.sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (sortBy === 'fecha_desc') list.sort((a, b) => b.fecha.localeCompare(a.fecha));
    
    return list;
  }, [interacciones, quickFilter, sortBy]);

  // Global search multi-faceted
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const term = globalSearch.toLowerCase().trim();

    const matchedEmpresas = empresas.filter(e => 
      e.nombre.toLowerCase().includes(term) || 
      (e.nit && e.nit.toLowerCase().includes(term)) ||
      e.tags?.some(t => t.toLowerCase().includes(term)) ||
      (e.unspscCodes || []).some(u => 
        u.code.toLowerCase().includes(term) || 
        u.name.toLowerCase().includes(term) ||
        (u.segment && u.segment.toLowerCase().includes(term))
      )
    );
    const matchedEmpresaIds = new Set(matchedEmpresas.map(e => e.id));

    const matchedContactos = contactos.filter(c => {
      const directMatch = c.nombre.toLowerCase().includes(term) || 
                          (c.cargo && c.cargo.toLowerCase().includes(term)) ||
                          (c.email && c.email.toLowerCase().includes(term)) ||
                          (c.telefono && c.telefono.toLowerCase().includes(term));
      if (directMatch) return true;

      // Indirect match: contact belongs to a matched company
      const belongsToMatchedCompany = (c.empresaId && matchedEmpresaIds.has(c.empresaId)) ||
                                     c.empresaIds?.some(id => matchedEmpresaIds.has(id));
      return !!belongsToMatchedCompany;
    });
    const matchedContactIds = new Set(matchedContactos.map(c => c.id));

    const matchedInteracciones = interacciones.filter(i => {
      const directMatch = i.asunto.toLowerCase().includes(term) || 
                          (i.descripcion && i.descripcion.toLowerCase().includes(term));
      if (directMatch) return true;

      // Indirect match: interaction associated with matched company
      const associatedWithMatchedCompany = i.empresaIds?.some(id => matchedEmpresaIds.has(id));
      if (associatedWithMatchedCompany) return true;

      // Indirect match: interaction associated with matched contact
      const associatedWithMatchedContact = (i.contactoId && matchedContactIds.has(i.contactoId)) ||
                                           i.contactoIds?.some(id => matchedContactIds.has(id));
      return !!associatedWithMatchedContact;
    });

    return {
      empresas: matchedEmpresas,
      contactos: matchedContactos,
      interacciones: matchedInteracciones
    };
  }, [globalSearch, empresas, contactos, interacciones]);

  // Add Company Submit
  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.nombre) return;
    await saveDocument('empresas', { 
      ...newCompany, 
      tags: [], 
      esTambien: [],
      unspscCodes: newCompany.unspscCodes || [] 
    });
    setShowAddCompanyModal(false);
    setNewCompany({
      nombre: '', tipo: 'fabricante', estado: 'prospecto', nit: '', direccion: '', cp: '', ciudad: '', provincia: '', pais: 'España', telefono: '', email: '', web: '', unspscCodes: []
    });
  };

  // Add Contact Submit
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContacto.nombre || !newContacto.empresaId) return;
    await saveDocument('contactos', newContacto);
    setShowAddContactModal(false);
    setNewContacto({
      nombre: '', empresaId: '', cargo: '', reportaA: null, telefono: '', email: '', linkedin: '', notas: '', estado: 'activo'
    });
  };

  // Add Interaction Submit
  const handleAddInteractionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteraccion.asunto || selectedInterContacts.length === 0) return;
    
    const finalInteraction = {
      ...newInteraccion,
      contactoId: selectedInterContacts[0],
      contactoIds: selectedInterContacts,
      empresaIds: selectedInterCompanies,
      pasos: []
    };

    await saveDocument('interacciones', finalInteraction);
    setShowAddInteractionModal(false);
    setSelectedInterContacts([]);
    setSelectedInterCompanies([]);
    setNewInteraccion({
      asunto: '', tipo: 'reunion', fecha: new Date().toISOString().slice(0, 10), fechaLimite: null, descripcion: '', estado: 'pendiente', resolucion: ''
    });
  };

  // Excel Upload
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      // Optimistic uploads
      for (const emp of data.empresas) {
        await saveDocument('empresas', {
          nombre: emp.Nombre,
          tipo: emp.Tipo || 'fabricante',
          estado: emp.Estado || 'prospecto',
          nit: emp.NIT || '',
          direccion: emp.Direccion || '',
          cp: emp.CP || '',
          ciudad: emp.Ciudad || '',
          provincia: emp.Provincia || '',
          pais: emp.Pais || 'España',
          telefono: emp.Telefono || '',
          email: emp.Email || '',
          web: emp.Web || '',
          grupo: emp.Grupo || '',
          tags: emp.Tags ? String(emp.Tags).split(',').map((t: string) => t.trim()) : [],
          esTambien: emp.RolesAdicionales ? String(emp.RolesAdicionales).split(',').map((t: string) => t.trim()) : []
        });
      }
      alert("✅ Importación de empresas completada exitosamente!");
    } catch (err) {
      alert("❌ Error al importar Excel.");
    }
  };

  // PDF Report helper
  const handleGenerateReportPDF = (emp: Empresa) => {
    const conts = contactos.filter(c => c.empresaId === emp.id || c.empresaIds?.includes(emp.id!));
    const inters = interacciones.filter(i => {
      const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
      return ids.some(cid => conts.some(c => c.id === cid));
    });
    const docs = documentos.filter(d => d.empresaId === emp.id);
    generateCompanyReportPDF(emp, conts, inters, docs);
  };

  const getStats = () => ({
    empresas: empresas.length,
    contactos: contactos.length,
    interacciones: interacciones.length,
    relaciones: relaciones.length,
    pendientes: interacciones.filter(i => i.estado === 'pendiente').length
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
        <h2 className="mt-4 font-bold text-lg">Cargando SRM Profesional...</h2>
      </div>
    );
  }

  // Auth Screen if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 flex flex-col justify-between">
          <div className="text-center mb-6">
            <div className="w-16 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-lg shadow-indigo-200">
              🏢
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-4 tracking-tight">SRM Profesional</h1>
            <p className="text-slate-500 text-sm mt-1">Gestión de Relaciones con Proveedores</p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                placeholder="email@proveedor.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {authError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-150 transition-all text-sm cursor-pointer"
            >
              {isRegistering ? 'Crear cuenta profesional' : 'Acceder al panel SRM'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-5">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col">
      {/* 1. Header Banner */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-lg shadow-md">
              🏢
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                SRM Profesional
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">Aura v1.0</span>
              </h1>
              <p className="text-xs text-slate-400">Supplier Relationship Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Realtime Search input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscador global..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={() => setShowSearchModal(true)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-850 transition-all font-medium"
              />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-300">{user.email}</p>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sincronizado
                </p>
              </div>
              <button 
                onClick={() => setShowCalendarModal(true)}
                className="flex items-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer text-xs font-bold shadow-md shadow-indigo-900/20"
                title="Abrir Calendario"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dashboard Stats */}
        <DashboardStats stats={getStats()} />

        {/* Alerts Banner */}
        <AlertsBanner 
          overdueInteractions={overdueInteractions}
          expiringDocs={expiringDocs}
          inactiveCompanies={inactiveCompanies}
          onOpenAlerts={() => setShowAlertsModal(true)}
        />

        {/* Main Tab Controller & List Sections */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 p-1">
            <button 
              onClick={() => { setCurrentTab('empresas'); setQuickFilter(''); }}
              className={`flex-1 py-2.5 px-2 sm:px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'empresas' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Empresas"
            >
              <Building2 className="w-4 h-4" /> <span className="hidden sm:inline">Empresas</span>
            </button>
            <button 
              onClick={() => { setCurrentTab('contactos'); setQuickFilter(''); }}
              className={`flex-1 py-2.5 px-2 sm:px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'contactos' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Contactos"
            >
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Contactos</span>
            </button>
            <button 
              onClick={() => { setCurrentTab('interacciones'); setQuickFilter(''); }}
              className={`flex-1 py-2.5 px-2 sm:px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'interacciones' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Interacciones"
            >
              <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Interacciones</span>
            </button>
            <button 
              onClick={() => { setCurrentTab('configuracion'); setQuickFilter(''); }}
              className={`flex-1 py-2.5 px-2 sm:px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'configuracion' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Configuración"
            >
              <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Configuración</span>
            </button>
          </div>

          {/* Action Sub-Toolbar */}
          {currentTab !== 'configuracion' && (
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    if (currentTab === 'empresas') setShowAddCompanyModal(true);
                    if (currentTab === 'contactos') setShowAddContactModal(true);
                    if (currentTab === 'interacciones') setShowAddInteractionModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nuevo {currentTab === 'empresas' ? 'Proveedor' : currentTab === 'contactos' ? 'Contacto' : 'Registro'}
                </button>
                <div className="relative flex-1 sm:w-60">
                  <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={`Filtrar ${currentTab}...`}
                    value={quickFilter}
                    onChange={(e) => setQuickFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8.5 pr-4 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {currentTab === 'empresas' && (
                  <div className="relative min-w-[200px] max-w-[260px]" ref={mainUnspscDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="📋 Buscar/Filtrar por UNSPSC..."
                        value={selectedUnspsc ? `Filtro: ${selectedUnspsc}` : mainUnspscSearch}
                        onFocus={() => {
                          setShowMainUnspscDropdown(true);
                          if (selectedUnspsc) {
                            setSelectedUnspsc(null);
                            setMainUnspscSearch('');
                          }
                        }}
                        onChange={(e) => {
                          setMainUnspscSearch(e.target.value);
                          setShowMainUnspscDropdown(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                      />
                      {selectedUnspsc ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnspsc(null);
                            setMainUnspscSearch('');
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                        >
                          ✕
                        </button>
                      ) : (
                        <ChevronRight className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                      )}
                    </div>

                    {showMainUnspscDropdown && (
                      <div className="absolute right-0 z-50 mt-1 w-72 max-h-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                          <span>Resultados Catálogo UNSPSC</span>
                          <button
                            type="button"
                            onClick={() => setShowMainUnspscDropdown(false)}
                            className="text-slate-400 hover:text-slate-600 font-bold"
                          >
                            Cerrar ✕
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnspsc(null);
                            setMainUnspscSearch('');
                            setShowMainUnspscDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50/50 text-xs font-semibold text-indigo-600 transition-colors"
                        >
                          📋 Mostrar Todos los Códigos
                        </button>

                        {isSearchingMainUnspsc && (
                          <div className="p-3 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                            <span>Buscando en catálogo global...</span>
                          </div>
                        )}

                        {!isSearchingMainUnspsc && !mainUnspscSearch.trim() && (
                          <div className="p-1">
                            <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400">Códigos populares:</p>
                            {UNSPSC_OPTIONS.slice(0, 10).map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setSelectedUnspsc(item.code);
                                  setShowMainUnspscDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center text-xs text-slate-700"
                              >
                                <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-1 rounded mr-2 border border-slate-200 shrink-0">{item.code}</span>
                                <span className="truncate">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {!isSearchingMainUnspsc && mainUnspscSearch.trim() && mainUnspscResults.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No se encontraron códigos. Intente otro término.
                          </div>
                        ) : (
                          !isSearchingMainUnspsc && mainUnspscSearch.trim() && mainUnspscResults.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                setSelectedUnspsc(item.code);
                                setShowMainUnspscDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center text-xs text-slate-700"
                            >
                              <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-1 rounded mr-2 border border-slate-200 shrink-0">{item.code}</span>
                              <span className="truncate">{item.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-600 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="nombre_asc">📝 Nombre (A-Z)</option>
                  <option value="nombre_desc">📝 Nombre (Z-A)</option>
                  <option value="fecha_asc">📅 Antiguos primero</option>
                  <option value="fecha_desc">📅 Recientes primero</option>
                </select>
              </div>
            </div>
          )}
 
          {/* List/Grid Container */}
          <div className="p-6">
            {currentTab === 'empresas' && (selectedTag || selectedUnspsc) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-600 font-semibold shadow-sm">
                <span>Filtros Activos:</span>
                {selectedUnspsc && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                    📋 UNSPSC: {selectedUnspsc}
                    <button onClick={() => setSelectedUnspsc(null)} className="hover:text-rose-600 font-bold ml-1">✕</button>
                  </span>
                )}
                {selectedTag && (
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                    🏷️ Tag: {selectedTag}
                    <button onClick={() => setSelectedTag(null)} className="hover:text-rose-600 font-bold ml-1">✕</button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedUnspsc(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 underline font-bold ml-auto text-[11px]"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {currentTab === 'empresas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredEmpresas.map(emp => (
                  <CompanyCard 
                    key={emp.id}
                    empresa={emp}
                    contactCount={contactos.filter(c => c.empresaId === emp.id || c.empresaIds?.includes(emp.id!)).length}
                    score={scores[emp.id!] || { nivel: 'gris', label: 'Sin datos', dias: null }}
                    selectedTag={selectedTag}
                    onTagClick={setSelectedTag}
                    onClick={() => handleOpenEmpresa(emp.id!)}
                  />
                ))}
              </div>
            )}

            {currentTab === 'contactos' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredContactos.map(cont => {
                  const empName = empresas.find(e => e.id === cont.empresaId)?.nombre || 'Sin empresa';
                  const pend = interacciones.filter(i => {
                    const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
                    return ids.includes(cont.id!) && i.estado === 'pendiente';
                  }).length;
                  const superiorName = cont.reportaA 
                    ? contactos.find(c => c.id === cont.reportaA)?.nombre || null 
                    : null;
                  return (
                    <ContactCard 
                      key={cont.id}
                      contacto={cont}
                      empresaNombre={empName}
                      pendingCount={pend}
                      superiorNombre={superiorName}
                      onClick={() => handleOpenContacto(cont.id!)}
                    />
                  );
                })}
              </div>
            )}

            {currentTab === 'interacciones' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredInteracciones.map(inter => {
                  const ids = inter.contactoIds?.length ? inter.contactoIds : (inter.contactoId ? [inter.contactoId] : []);
                  const conts = ids.map(cid => contactos.find(c => c.id === cid)).filter(Boolean);
                  const empName = conts.length > 0 ? empresas.find(e => e.id === conts[0].empresaId)?.nombre || '' : '';
                  const relativeHtml = `${inter.fecha}`;
                  const isOverdue = inter.fechaLimite ? inter.estado === 'pendiente' && new Date(inter.fechaLimite) < new Date() : false;
                  return (
                    <InteractionCard 
                      key={inter.id}
                      interaccion={inter}
                      contactoNombres={conts.map(c => c.nombre).join(', ')}
                      empresaNombre={empName}
                      fechaRelativaHtml={relativeHtml}
                      isOverdue={isOverdue}
                      onClick={() => handleOpenInteraccion(inter.id!)}
                    />
                  );
                })}
              </div>
            )}

            {currentTab === 'configuracion' && (
              <div className="space-y-6">
                <LeafletMap 
                  empresas={empresas}
                  onOpenFicha={(id) => handleOpenEmpresa(id)}
                  selectedTipo="todos"
                  selectedEstado="todos"
                  scores={scores}
                />

                <TagManager 
                  empresas={empresas}
                  onUpdateEmpresa={async (emp) => { await saveDocument('empresas', emp, emp.id); }}
                  onOpenEmpresa={(id) => handleOpenEmpresa(id)}
                />

                {/* Import/Export Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-sm">Respaldo y Archivos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-lg flex flex-col justify-between">
                      <div>
                        <h5 className="font-semibold text-slate-700 text-xs">EXPORTAR DATOS</h5>
                        <p className="text-slate-500 text-[11px] mt-1">Descarga el SRM de forma completa en una plantilla estructurada de Excel.</p>
                      </div>
                      <button 
                        onClick={() => exportToExcel(empresas, contactos, interacciones, relaciones)}
                        className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer w-fit"
                      >
                        <Download className="w-4 h-4" /> Descargar Excel
                      </button>
                    </div>

                    <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-lg flex flex-col justify-between">
                      <div>
                        <h5 className="font-semibold text-slate-700 text-xs">IMPORTAR DATOS</h5>
                        <p className="text-slate-500 text-[11px] mt-1">Carga masivamente registros de proveedores desde una hoja de Excel.</p>
                      </div>
                      <label className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer w-fit">
                        <Upload className="w-4 h-4 text-indigo-500" /> Seleccionar Archivo
                        <input type="file" accept=".xlsx" onChange={handleImportExcel} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail Overlay Modules */}
      <FichasModales 
        selectedEmpresa={empresas.find(e => e.id === selectedEmpId) || null}
        selectedContacto={contactos.find(c => c.id === selectedContId) || null}
        selectedInteraccion={interacciones.find(i => i.id === selectedInterId) || null}
        onCloseEmpresa={() => setSelectedEmpId(null)}
        onCloseContacto={() => setSelectedContactoId(null)}
        onCloseInteraccion={() => setSelectedInterId(null)}
        onOpenContacto={(id) => handleOpenContacto(id)}
        onOpenInteraccion={(id) => handleOpenInteraccion(id)}
        onOpenEmpresa={(id) => handleOpenEmpresa(id)}
        empresas={empresas}
        contactos={contactos}
        interacciones={interacciones}
        documentos={documentos}
        relaciones={relaciones}
        onUpdateEmpresa={async (emp) => saveDocument('empresas', emp, emp.id)}
        onDeleteEmpresa={async (id) => deleteDocument('empresas', id)}
        onUpdateContacto={async (cont) => saveDocument('contactos', cont, cont.id)}
        onDeleteContacto={async (id) => deleteDocument('contactos', id)}
        onUpdateInteraccion={async (inter) => {
          await saveDocument('interacciones', inter, inter.id);
          if (inter.estado === 'completada') {
            confetti({ particleCount: 60, spread: 40, origin: { y: 0.8 } });
          }
        }}
        onDeleteInteraccion={async (id) => deleteDocument('interacciones', id)}
        onAddRelacion={async (fId, dId, pref) => saveDocument('relaciones', { fabricanteId: fId, distribuidorId: dId, preferente: pref })}
        onAddEmpresaRapida={async (nombre, tipo) => {
          const newId = await saveDocument('empresas', {
            nombre,
            tipo,
            estado: 'prospecto',
            nit: '',
            direccion: '',
            cp: '',
            ciudad: '',
            provincia: '',
            pais: 'España',
            telefono: '',
            email: '',
            web: '',
            notas: '',
            tags: [],
            esTambien: [],
          });
          return newId;
        }}
        onUpdateRelacion={async (rel) => saveDocument('relaciones', rel, rel.id)}
        onDeleteRelacion={async (id) => deleteDocument('relaciones', id)}
        onAddDocumento={async (eId, nom, url, cad) => saveDocument('documentos', { empresaId: eId, nombre: nom, url, fecha: new Date().toISOString(), fechaCaducidad: cad })}
        onDeleteDocumento={async (id) => deleteDocument('documentos', id)}
        onGeocodeManual={(id) => {
          const emp = empresas.find(e => e.id === id);
          if (emp) {
            setPinningEmpresa(emp);
          }
        }}
        onGeneratePDF={handleGenerateReportPDF}
        scores={scores}
      />

      {/* Calendar Modal Overlay */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-base text-white">Calendario de Interacciones</h3>
                  <p className="text-xs text-indigo-100 font-medium">Visualiza de forma mensual las reuniones, llamadas y tareas programadas con tus proveedores</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCalendarModal(false)} 
                className="text-indigo-100 hover:text-white p-1 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer border-0 outline-none"
                title="Cerrar calendario"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <CustomCalendar 
                interacciones={interacciones}
                contactos={contactos}
                empresas={empresas}
                onEventClick={(id) => {
                  handleOpenInteraccion(id);
                  setShowCalendarModal(false);
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right text-[10px] text-slate-400">
              Presiona <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono shadow-sm">ESC</span> o haz clic en la X para cerrar.
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal Overlay */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] px-4 overflow-y-auto pb-10">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="p-5 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-base text-white">Alertas de Atención Pendiente</h3>
                  <p className="text-xs text-amber-100 font-medium">Revisa las tareas vencidas, documentos próximos a caducar y proveedores inactivos</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAlertsModal(false)} 
                className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-amber-600 transition-colors cursor-pointer border-0 outline-none"
                title="Cerrar alertas"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {overdueInteractions.length === 0 && expiringDocs.length === 0 && inactiveCompanies.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                    ✓
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">¡Todo al día!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">No hay interacciones vencidas, documentos por caducar ni proveedores inactivos detectados.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overdue Interactions */}
                  {overdueInteractions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-100 pb-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                        Reuniones y Tareas Vencidas ({overdueInteractions.length})
                      </h4>
                      <div className="space-y-2">
                        {overdueInteractions.map(inter => {
                          const ids = inter.contactoIds?.length ? inter.contactoIds : (inter.contactoId ? [inter.contactoId] : []);
                          const conts = ids.map(cid => contactos.find(c => c.id === cid)).filter(Boolean);
                          const empName = conts.length > 0 ? empresas.find(e => e.id === conts[0].empresaId)?.nombre || 'Empresa' : 'Empresa';
                          const contactNames = conts.map(c => c.nombre).join(', ') || 'Sin contactos';
                          
                          return (
                            <div 
                              key={inter.id}
                              className="bg-rose-50/40 border border-rose-100 hover:border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-rose-950">{inter.asunto}</span>
                                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                                    Vencido
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Proveedor: <strong className="text-slate-700">{empName}</strong> • Contacto: <span className="text-slate-600">{contactNames}</span>
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                  <span>Fecha prevista: <strong className="text-slate-500">{inter.fecha}</strong></span>
                                  {inter.fechaLimite && (
                                    <span className="text-rose-600 font-semibold">Límite: {inter.fechaLimite}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  handleOpenInteraccion(inter.id!);
                                  setShowAlertsModal(false);
                                }}
                                className="self-start sm:self-center bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                              >
                                Resolver <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expiring Docs */}
                  {expiringDocs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Documentos por Caducar / Caducados ({expiringDocs.length})
                      </h4>
                      <div className="space-y-2">
                        {expiringDocs.map(({ doc: d, companyName, dias }) => {
                          const isExpired = dias <= 0;
                          return (
                            <div 
                              key={d.id}
                              className="bg-amber-50/40 border border-amber-100 hover:border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-amber-950">{d.nombre}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                                    isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {isExpired ? `Caducado hace ${Math.abs(dias)}d` : `Caduca en ${dias} días`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Proveedor: <strong className="text-slate-700">{companyName}</strong>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Fecha de caducidad: <strong className="text-slate-500">{d.fechaCaducidad}</strong>
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  handleOpenEmpresa(d.empresaId);
                                  setShowAlertsModal(false);
                                }}
                                className="self-start sm:self-center bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                              >
                                Ver Ficha <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Inactive Companies */}
                  {inactiveCompanies.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        Proveedores Sin Interacción Reciente (&gt;90 días) ({inactiveCompanies.length})
                      </h4>
                      <div className="space-y-2">
                        {inactiveCompanies.map(({ emp, dias }) => (
                          <div 
                            key={emp.id}
                            className="bg-slate-50 border border-slate-200/85 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{emp.nombre}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                                  {emp.tipo}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Último contacto: {dias ? <strong className="text-slate-600">Hace {dias} días</strong> : <strong className="text-rose-600">Nunca</strong>}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Estado: <span className="capitalize text-slate-500">{emp.estado}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                handleOpenEmpresa(emp.id!);
                                setShowAlertsModal(false);
                              }}
                              className="self-start sm:self-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            >
                              Ver Ficha <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right text-[10px] text-slate-400">
              Presiona <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono shadow-sm">ESC</span> o haz clic en la X para cerrar.
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal overlay */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
            {/* Search Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              <input 
                type="text" 
                autoFocus
                placeholder="Escribe para buscar proveedores, contactos o interacciones..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-transparent text-slate-800 outline-none placeholder-slate-400 text-sm font-medium"
              />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="text-xs text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 px-2 py-1 rounded cursor-pointer"
                >
                  Limpiar
                </button>
              )}
              <button 
                onClick={() => {
                  setShowSearchModal(false);
                  setGlobalSearch('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/40 transition-colors cursor-pointer"
                title="Cerrar buscador"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Area */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
              {!globalSearch.trim() ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <div className="text-4xl">🔍</div>
                  <p className="text-xs font-medium">Introduce un término de búsqueda para comenzar.</p>
                  <p className="text-[10px] text-slate-300">Busca por nombre de empresa, cargo de contacto, asunto de reunión, etiquetas, etc.</p>
                </div>
              ) : (
                (() => {
                  const results = searchResults;
                  const hasEmpresas = results && results.empresas.length > 0;
                  const hasContactos = results && results.contactos.length > 0;
                  const hasInteracciones = results && results.interacciones.length > 0;
                  const totalResults = (results?.empresas.length || 0) + (results?.contactos.length || 0) + (results?.interacciones.length || 0);

                  if (totalResults === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 space-y-2">
                        <div className="text-3xl">😞</div>
                        <p className="text-xs font-bold text-slate-500">No se encontraron resultados para "{globalSearch}"</p>
                        <p className="text-[10px] text-slate-400">Intenta buscar con palabras más generales o revisa la ortografía.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      {/* Empresas / Proveedores Category */}
                      {hasEmpresas && (
                        <div>
                          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                            <Building2 className="w-3.5 h-3.5" /> Proveedores ({results.empresas.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {results.empresas.map(emp => (
                              <div 
                                key={emp.id}
                                onClick={() => {
                                  handleOpenEmpresa(emp.id!);
                                  setShowSearchModal(false);
                                  setGlobalSearch('');
                                }}
                                className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs uppercase">
                                  {emp.nombre.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{emp.nombre}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded capitalize">
                                      {emp.tipo}
                                    </span>
                                    {emp.tags?.slice(0, 2).map((t, i) => (
                                      <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contactos Category */}
                      {hasContactos && (
                        <div>
                          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                            <Users className="w-3.5 h-3.5" /> Contactos ({results.contactos.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {results.contactos.map(cont => {
                              const empName = empresas.find(e => e.id === cont.empresaId)?.nombre || 'Sin empresa';
                              return (
                                <div 
                                  key={cont.id}
                                  onClick={() => {
                                    handleOpenContacto(cont.id!);
                                    setShowSearchModal(false);
                                    setGlobalSearch('');
                                  }}
                                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all"
                                >
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs uppercase">
                                    {cont.nombre.slice(0, 2)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{cont.nombre}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {cont.cargo || 'Sin cargo'} en <strong className="text-slate-600 font-medium">{empName}</strong>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Interacciones Category */}
                      {hasInteracciones && (
                        <div>
                          <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Interacciones ({results.interacciones.length})
                          </h4>
                          <div className="space-y-1.5">
                            {results.interacciones.map(inter => (
                              <div 
                                key={inter.id}
                                onClick={() => {
                                  handleOpenInteraccion(inter.id!);
                                  setShowSearchModal(false);
                                  setGlobalSearch('');
                                }}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-xs">
                                    {inter.tipo === 'reunion' ? '🤝' : inter.tipo === 'llamada' ? '📞' : inter.tipo === 'email' ? '✉️' : '🏢'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{inter.asunto}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{inter.descripcion || 'Sin descripción'}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono shrink-0 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                  {inter.fecha}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right text-[10px] text-slate-400">
              Presiona <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono shadow-sm">ESC</span> o haz clic en la X para salir.
            </div>
          </div>
        </div>
      )}

      {/* Modales de Creación */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-100">Crear Nuevo Proveedor</h3>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCompanySubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Nombre del Proveedor *</label>
                <input 
                  type="text" required
                  value={newCompany.nombre}
                  onChange={(e) => setNewCompany({...newCompany, nombre: e.target.value})}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select 
                    value={newCompany.tipo}
                    onChange={(e) => setNewCompany({...newCompany, tipo: e.target.value as any})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="fabricante">🏭 Fabricante</option>
                    <option value="distribuidor">🚚 Distribuidor</option>
                    <option value="servicios">🛠️ Servicios</option>
                    <option value="otros">📦 Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Estado de Homologación</label>
                  <select 
                    value={newCompany.estado}
                    onChange={(e) => setNewCompany({...newCompany, estado: e.target.value as any})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                  >
                    <option value="prospecto">🔵 Prospecto</option>
                    <option value="en_proceso">⏳ En proceso</option>
                    <option value="homologado">✅ Homologado</option>
                    <option value="en_cuarentena">⚠️ En cuarentena</option>
                    <option value="no_apto">🚫 No apto</option>
                    <option value="inactivo">⚫ Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">NIT / CIF</label>
                  <input 
                    type="text" 
                    value={newCompany.nit}
                    onChange={(e) => setNewCompany({...newCompany, nit: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <input 
                    type="text" 
                    value={newCompany.telefono}
                    onChange={(e) => setNewCompany({...newCompany, telefono: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Dirección Completa</label>
                <input 
                  type="text" 
                  value={newCompany.direccion}
                  onChange={(e) => setNewCompany({...newCompany, direccion: e.target.value})}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Ciudad</label>
                  <input 
                    type="text" 
                    value={newCompany.ciudad}
                    onChange={(e) => setNewCompany({...newCompany, ciudad: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Provincia</label>
                  <input 
                    type="text" 
                    value={newCompany.provincia}
                    onChange={(e) => setNewCompany({...newCompany, provincia: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">País</label>
                  <input 
                    type="text" 
                    value={newCompany.pais}
                    onChange={(e) => setNewCompany({...newCompany, pais: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clasificación UNSPSC</label>
                
                {/* Selected UNSPSC Codes inside newCompany */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(newCompany.unspscCodes || []).length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No se han asignado códigos UNSPSC.</span>
                  ) : (
                    (newCompany.unspscCodes || []).map((item) => (
                      <span
                        key={item.code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-150 text-indigo-700 text-[11px] font-bold"
                      >
                        <span className="font-mono text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded">{item.code}</span>
                        <span className="max-w-[120px] truncate">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (newCompany.unspscCodes || []).filter(u => u.code !== item.code);
                            setNewCompany({ ...newCompany, unspscCodes: updated });
                          }}
                          className="hover:bg-indigo-150 rounded text-indigo-500 hover:text-rose-600 transition-colors ml-1 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Autocomplete Input Search */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por código o descripción en catálogo completo..."
                      value={newCompanyUnspscSearch}
                      onChange={(e) => setNewCompanyUnspscSearch(e.target.value)}
                      className="pl-8 w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    {newCompanyUnspscSearch && (
                      <button
                        type="button"
                        onClick={() => setNewCompanyUnspscSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown containing results */}
                  {newCompanyUnspscSearch && (
                    <div className="absolute z-50 mt-1 w-full max-h-48 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto divide-y divide-slate-100">
                      {isSearchingNewCompanyUnspsc && (
                        <div className="p-2 text-xs text-slate-500 text-center flex items-center justify-center gap-1.5 bg-slate-50/50">
                          <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          <span>Buscando...</span>
                        </div>
                      )}
                      {!isSearchingNewCompanyUnspsc && newCompanyUnspscResults.length === 0 ? (
                        <div className="p-2 text-[11px] text-slate-400 text-center">
                          No se encontraron coincidencias.
                        </div>
                      ) : (
                        (!isSearchingNewCompanyUnspsc ? newCompanyUnspscResults : []).slice(0, 15).map((item) => {
                          const isSelected = (newCompany.unspscCodes || []).some(u => u.code === item.code);
                          return (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                const current = newCompany.unspscCodes || [];
                                const updated = isSelected
                                  ? current.filter(u => u.code !== item.code)
                                  : [...current, item];
                                setNewCompany({ ...newCompany, unspscCodes: updated });
                                setNewCompanyUnspscSearch('');
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                            >
                              <span className="truncate pr-2 flex items-center">
                                <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded mr-1.5 border border-slate-200 shrink-0">{item.code}</span>
                                <span className="text-slate-700 truncate font-medium">{item.name}</span>
                              </span>
                              {isSelected ? (
                                <span className="text-emerald-600 font-bold text-[10px] shrink-0">✓ Seleccionado</span>
                              ) : (
                                <span className="text-indigo-600 text-[10px] font-bold shrink-0">+ Añadir</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddCompanyModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Crear Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-100">Añadir Nuevo Contacto</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Nombre Completo *</label>
                <input 
                  type="text" required
                  value={newContacto.nombre}
                  onChange={(e) => setNewContacto({...newContacto, nombre: e.target.value})}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa Vinculada *</label>
                <SearchSelect 
                  required
                  placeholder="Escribe para buscar empresa..."
                  value={newContacto.empresaId || ''}
                  onChange={(val) => setNewContacto({...newContacto, empresaId: val})}
                  options={empresas.map(e => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Cargo / Rol</label>
                <input 
                  type="text" 
                  value={newContacto.cargo}
                  onChange={(e) => setNewContacto({...newContacto, cargo: e.target.value})}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Superior Jerárquico (Reporta A)</label>
                <SearchSelect 
                  disabled={!newContacto.empresaId}
                  placeholder={newContacto.empresaId ? "Escribe para buscar superior jerárquico..." : "Selecciona primero una empresa"}
                  value={newContacto.reportaA || ''}
                  onChange={(val) => setNewContacto({...newContacto, reportaA: val || null})}
                  options={contactos
                    .filter(c => c.empresaId === newContacto.empresaId || c.empresaIds?.includes(newContacto.empresaId!))
                    .map(c => ({ value: c.id!, label: c.nombre, sublabel: c.cargo || 'Sin cargo' }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono móvil</label>
                  <input 
                    type="text" 
                    value={newContacto.telefono}
                    onChange={(e) => setNewContacto({...newContacto, telefono: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input 
                    type="email" 
                    value={newContacto.email}
                    onChange={(e) => setNewContacto({...newContacto, email: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddContactModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Interaction Modal */}
      {showAddInteractionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-100">Nuevo Registro de Interacción</h3>
              <button onClick={() => setShowAddInteractionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddInteractionSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Asunto *</label>
                <input 
                  type="text" required
                  value={newInteraccion.asunto}
                  onChange={(e) => setNewInteraccion({...newInteraccion, asunto: e.target.value})}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Multi-Contact select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto Participante *</label>
                <SearchSelect 
                  required
                  placeholder="Escribe para buscar un contacto..."
                  value={selectedInterContacts[0] || ''}
                  onChange={(val) => {
                    if (val) {
                      setSelectedInterContacts([val]);
                      const cont = contactos.find(c => c.id === val);
                      if (cont?.empresaId) setSelectedInterCompanies([cont.empresaId]);
                    } else {
                      setSelectedInterContacts([]);
                      setSelectedInterCompanies([]);
                    }
                  }}
                  options={contactos.map(c => {
                    const empName = empresas.find(e => e.id === c.empresaId)?.nombre || 'Sin empresa';
                    return { value: c.id!, label: c.nombre, sublabel: empName };
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select 
                    value={newInteraccion.tipo}
                    onChange={(e) => setNewInteraccion({...newInteraccion, tipo: e.target.value as any})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="reunion">🤝 Reunión</option>
                    <option value="llamada">📞 Llamada</option>
                    <option value="email">✉️ Correo</option>
                    <option value="feria">🏢 Feria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Fecha</label>
                  <input 
                    type="date" required
                    value={newInteraccion.fecha}
                    onChange={(e) => setNewInteraccion({...newInteraccion, fecha: e.target.value})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">⏰ Límite de Resolución (Opcional)</label>
                  <input 
                    type="date"
                    value={newInteraccion.fechaLimite || ''}
                    onChange={(e) => setNewInteraccion({...newInteraccion, fechaLimite: e.target.value || null})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Estado inicial</label>
                  <select 
                    value={newInteraccion.estado}
                    onChange={(e) => setNewInteraccion({...newInteraccion, estado: e.target.value as any})}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="completada">✅ Completada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Descripción o Acta rápida</label>
                <textarea 
                  value={newInteraccion.descripcion}
                  onChange={(e) => setNewInteraccion({...newInteraccion, descripcion: e.target.value})}
                  rows={3}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddInteractionModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Pin Location Map Modal */}
      {pinningEmpresa && (
        <PinLocationMapModal
          empresa={pinningEmpresa}
          onCancel={() => setPinningEmpresa(null)}
          onConfirm={async (lat, lon) => {
            const updatedEmp = { ...pinningEmpresa, _lat: lat, _lon: lon, _manual: true };
            await saveDocument('empresas', updatedEmp, pinningEmpresa.id);
            setPinningEmpresa(null);
          }}
        />
      )}
    </div>
  );
}
