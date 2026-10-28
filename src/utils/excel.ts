/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Empresa, Contacto, Interaccion, Relacion, EmpresaTipo, EmpresaEstado, UNSPSC_OPTIONS } from '../types';

export interface ParsedEmpresaRow {
  nombre: string;
  tipo: EmpresaTipo;
  estado: EmpresaEstado;
  nit: string;
  direccion: string;
  cp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
  grupo: string;
  tags: string[];
  esTambien: EmpresaTipo[];
  notas: string;
  unspscCodes?: { code: string; name: string }[];
  evaluacion?: {
    plazos: number;
    calidad: number;
    flexibilidad: number;
    comentarios?: string;
  };
  fecha_creacion?: string;
}

export interface ParsedContactoRow {
  nombre: string;
  empresaNombre?: string;
  cargo: string;
  reportaA?: string;
  telefono: string;
  email: string;
  linkedin: string;
  estado: 'activo' | 'inactivo';
  motivoInactivo?: string;
  intereses: string[];
  empresasAnteriores: string[];
  dondeSeConocio: string[];
  notas: string;
}

export interface ParsedInteraccionRow {
  asunto: string;
  tipo: 'reunion' | 'llamada' | 'email' | 'feria';
  fecha: string;
  fechaLimite?: string;
  estado: 'pendiente' | 'completada';
  contactosNombres: string[];
  empresasNombres: string[];
  descripcion: string;
  resolucion: string;
  pasosRaw?: string;
}

export interface ParsedRelacionRow {
  fabricanteNombre: string;
  distribuidorNombre: string;
  preferente: 'si' | 'no';
  notas: string;
}

export interface ParsedExcelData {
  empresas: ParsedEmpresaRow[];
  contactos: ParsedContactoRow[];
  interacciones: ParsedInteraccionRow[];
  relaciones: ParsedRelacionRow[];
  sheetNamesFound: string[];
}

/**
 * Safely converts string, array, or object to a comma-separated string
 */
export const safeArrayToString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') {
          if (item.name && item.code) return `${item.code} - ${item.name}`;
          return JSON.stringify(item);
        }
        return String(item).trim();
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'string') return val.trim();
  return String(val).trim();
};

export const safeString = (val: any, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s.length > 0 ? s : fallback;
};

/**
 * Programmatic file download helper using Blob (safe across modern browsers)
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
};

/**
 * Normalizes text to lowercase without accents or special characters
 */
const normalizeKey = (key: string): string => {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const getRowField = (normRow: Record<string, any>, possibleKeys: string[]): any => {
  for (const k of possibleKeys) {
    if (normRow[k] !== undefined && normRow[k] !== null && String(normRow[k]).trim() !== '') {
      return normRow[k];
    }
  }
  return undefined;
};

/**
 * Normalizes Date inputs (Excel serial numbers, date strings, Date objects)
 */
const parseExcelDate = (val: any): string => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  return str.slice(0, 10);
};

/**
 * Extract 8-digit UNSPSC codes from string
 */
const extractUnspscCodes = (raw: string): { code: string; name: string }[] => {
  if (!raw) return [];
  const codeMatches = raw.match(/\b\d{8}\b/g);
  if (codeMatches) {
    const unique = [...new Set(codeMatches)];
    return unique.map(code => {
      const found = UNSPSC_OPTIONS.find(o => o.code === code);
      return found ? { code: found.code, name: found.name } : { code, name: `Código UNSPSC ${code}` };
    });
  }
  return [];
};

/**
 * Normalizes Empresa Tipo
 */
const normalizeTipo = (raw: any): EmpresaTipo => {
  const norm = normalizeKey(String(raw || ''));
  if (norm.includes('distrib')) return 'distribuidor';
  if (norm.includes('servici')) return 'servicios';
  if (norm.includes('otro')) return 'otros';
  return 'fabricante';
};

/**
 * Normalizes Empresa Estado
 */
const normalizeEstado = (raw: any): EmpresaEstado => {
  const norm = normalizeKey(String(raw || ''));
  if (norm.includes('homolog') || norm.includes('aprobad')) return 'homologado';
  if (norm.includes('cuarent') || norm.includes('bloquead')) return 'en_cuarentena';
  if (norm.includes('noapto') || norm.includes('rechazad')) return 'no_apto';
  if (norm.includes('inactiv') || norm.includes('baja')) return 'inactivo';
  if (norm.includes('validad')) return 'validado';
  if (norm.includes('proceso') || norm.includes('tramite') || norm.includes('evaluac')) return 'en_proceso';
  return 'prospecto';
};

/**
 * Exports all SRM data (Empresas, Contactos, Interacciones, Relaciones) into a formatted Excel file
 */
export const exportToExcel = (
  empresas: Empresa[],
  contactos: Contacto[],
  interacciones: Interaccion[],
  relaciones: Relacion[]
): { success: boolean; filename: string; counts: { empresas: number; contactos: number; interacciones: number; relaciones: number } } => {
  try {
    const wb = XLSX.utils.book_new();

    // 1. Empresas Sheet
    const empresasHeaders = [
      'Nombre', 'Tipo', 'Estado', 'NIT_CIF', 'Direccion', 'CP', 'Ciudad', 'Provincia', 'Pais',
      'Telefono', 'Email', 'Web', 'Grupo', 'Tags', 'RolesAdicionales', 'Notas', 'UNSPSC',
      'Evaluacion_Plazos', 'Evaluacion_Calidad', 'Evaluacion_Flexibilidad', 'Evaluacion_Comentarios', 'FechaCreacion'
    ];

    const empresasData = empresas.map(e => ({
      Nombre: safeString(e.nombre),
      Tipo: safeString(e.tipo, 'fabricante'),
      Estado: safeString(e.estado, 'prospecto'),
      NIT_CIF: safeString(e.nit),
      Direccion: safeString(e.direccion),
      CP: safeString(e.cp),
      Ciudad: safeString(e.ciudad),
      Provincia: safeString(e.provincia),
      Pais: safeString(e.pais, 'España'),
      Telefono: safeString(e.telefono),
      Email: safeString(e.email),
      Web: safeString(e.web),
      Grupo: safeString(e.grupo),
      Tags: safeArrayToString(e.tags),
      RolesAdicionales: safeArrayToString(e.esTambien),
      Notas: safeString(e.notas),
      UNSPSC: (e.unspscCodes || []).map(u => `${u.code} - ${u.name}`).join('; '),
      Evaluacion_Plazos: e.evaluacion?.plazos ?? '',
      Evaluacion_Calidad: e.evaluacion?.calidad ?? '',
      Evaluacion_Flexibilidad: e.evaluacion?.flexibilidad ?? '',
      Evaluacion_Comentarios: safeString(e.evaluacion?.comentarios),
      FechaCreacion: safeString(e.fecha_creacion, new Date().toISOString().slice(0, 10)),
    }));

    const wsEmpresas = empresasData.length > 0
      ? XLSX.utils.json_to_sheet(empresasData)
      : XLSX.utils.aoa_to_sheet([empresasHeaders]);
    
    wsEmpresas['!cols'] = [
      { wch: 28 }, // Nombre
      { wch: 15 }, // Tipo
      { wch: 15 }, // Estado
      { wch: 15 }, // NIT_CIF
      { wch: 30 }, // Direccion
      { wch: 10 }, // CP
      { wch: 18 }, // Ciudad
      { wch: 18 }, // Provincia
      { wch: 15 }, // Pais
      { wch: 16 }, // Telefono
      { wch: 25 }, // Email
      { wch: 22 }, // Web
      { wch: 18 }, // Grupo
      { wch: 20 }, // Tags
      { wch: 20 }, // RolesAdicionales
      { wch: 30 }, // Notas
      { wch: 35 }, // UNSPSC
      { wch: 12 }, // Plazos
      { wch: 12 }, // Calidad
      { wch: 12 }, // Flexibilidad
      { wch: 25 }, // Comentarios
      { wch: 16 }, // FechaCreacion
    ];
    XLSX.utils.book_append_sheet(wb, wsEmpresas, 'Empresas');

    // 2. Contactos Sheet
    const contactosHeaders = [
      'Nombre', 'EmpresaPrincipal', 'Cargo', 'ReportaA', 'Telefono', 'Email',
      'LinkedIn', 'Estado', 'MotivoInactivo', 'Intereses', 'EmpresasAnteriores', 'DondeSeConocio', 'Notas', 'FechaCreacion'
    ];

    const contactosData = contactos.map(c => {
      const emp = empresas.find(e => e.id === c.empresaId);
      const sup = contactos.find(s => s.id === c.reportaA);
      return {
        Nombre: safeString(c.nombre),
        EmpresaPrincipal: emp?.nombre || '',
        Cargo: safeString(c.cargo),
        ReportaA: sup?.nombre || '',
        Telefono: safeString(c.telefono),
        Email: safeString(c.email),
        LinkedIn: safeString(c.linkedin),
        Estado: safeString(c.estado, 'activo'),
        MotivoInactivo: safeString(c.motivoInactivo),
        Intereses: safeArrayToString(c.intereses),
        EmpresasAnteriores: safeArrayToString(c.empresasAnteriores),
        DondeSeConocio: safeArrayToString(c.empresaConocido),
        Notas: safeString(c.notas),
        FechaCreacion: safeString(c.fecha_creacion, new Date().toISOString().slice(0, 10)),
      };
    });

    const wsContactos = contactosData.length > 0
      ? XLSX.utils.json_to_sheet(contactosData)
      : XLSX.utils.aoa_to_sheet([contactosHeaders]);

    wsContactos['!cols'] = [
      { wch: 24 }, // Nombre
      { wch: 25 }, // EmpresaPrincipal
      { wch: 22 }, // Cargo
      { wch: 20 }, // ReportaA
      { wch: 16 }, // Telefono
      { wch: 25 }, // Email
      { wch: 25 }, // LinkedIn
      { wch: 12 }, // Estado
      { wch: 20 }, // MotivoInactivo
      { wch: 22 }, // Intereses
      { wch: 25 }, // EmpresasAnteriores
      { wch: 22 }, // DondeSeConocio
      { wch: 28 }, // Notas
      { wch: 15 }, // FechaCreacion
    ];
    XLSX.utils.book_append_sheet(wb, wsContactos, 'Contactos');

    // 3. Interacciones Sheet
    const interaccionesHeaders = [
      'Asunto', 'Tipo', 'Fecha', 'FechaLimite', 'Estado', 'Contactos', 'Empresas', 'Descripcion', 'Resolucion', 'Pasos'
    ];

    const interaccionesData = interacciones.map(i => {
      const allContIds = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
      const conts = allContIds.map(cid => contactos.find(c => c.id === cid)).filter(Boolean) as Contacto[];
      
      const empNamesFromConts = conts.map(c => empresas.find(e => e.id === c.empresaId)?.nombre).filter(Boolean) as string[];
      const empNamesFromInters = (i.empresaIds || []).map(eid => empresas.find(e => e.id === eid)?.nombre).filter(Boolean) as string[];
      const allEmpNames = [...new Set([...empNamesFromConts, ...empNamesFromInters])];

      const pasosFormatted = (Array.isArray(i.pasos) ? i.pasos : [])
        .map(p => `[${p.fecha || ''}] ${p.texto || ''}${p.completado ? ' (Hecho)' : ''}`)
        .filter(Boolean)
        .join('; ');

      return {
        Asunto: safeString(i.asunto),
        Tipo: safeString(i.tipo, 'reunion'),
        Fecha: safeString(i.fecha),
        FechaLimite: safeString(i.fechaLimite),
        Estado: safeString(i.estado, 'pendiente'),
        Contactos: conts.map(c => c.nombre).join(', '),
        Empresas: allEmpNames.join(', '),
        Descripcion: safeString(i.descripcion),
        Resolucion: safeString(i.resolucion),
        Pasos: pasosFormatted,
      };
    });

    const wsInteracciones = interaccionesData.length > 0
      ? XLSX.utils.json_to_sheet(interaccionesData)
      : XLSX.utils.aoa_to_sheet([interaccionesHeaders]);

    wsInteracciones['!cols'] = [
      { wch: 30 }, // Asunto
      { wch: 12 }, // Tipo
      { wch: 12 }, // Fecha
      { wch: 12 }, // FechaLimite
      { wch: 14 }, // Estado
      { wch: 25 }, // Contactos
      { wch: 25 }, // Empresas
      { wch: 35 }, // Descripcion
      { wch: 30 }, // Resolucion
      { wch: 35 }, // Pasos
    ];
    XLSX.utils.book_append_sheet(wb, wsInteracciones, 'Interacciones');

    // 4. Relaciones Sheet
    const relacionesHeaders = ['Fabricante', 'Distribuidor', 'Preferente', 'Notas'];
    const relacionesData = relaciones.map(r => {
      const f = empresas.find(e => e.id === r.fabricanteId);
      const d = empresas.find(e => e.id === r.distribuidorId);
      return {
        Fabricante: f?.nombre || '',
        Distribuidor: d?.nombre || '',
        Preferente: r.preferente === 'si' ? 'si' : 'no',
        Notas: safeString(r.notas),
      };
    });

    const wsRelaciones = relacionesData.length > 0
      ? XLSX.utils.json_to_sheet(relacionesData)
      : XLSX.utils.aoa_to_sheet([relacionesHeaders]);

    wsRelaciones['!cols'] = [
      { wch: 25 }, // Fabricante
      { wch: 25 }, // Distribuidor
      { wch: 12 }, // Preferente
      { wch: 30 }, // Notas
    ];
    XLSX.utils.book_append_sheet(wb, wsRelaciones, 'Relaciones');

    // Generate buffer & trigger download via Blob
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });
    const filename = `srm_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      counts: {
        empresas: empresas.length,
        contactos: contactos.length,
        interacciones: interacciones.length,
        relaciones: relaciones.length,
      }
    };
  } catch (err: any) {
    console.error('Error al exportar a Excel:', err);
    throw new Error(err.message || 'Error al generar el archivo Excel');
  }
};

/**
 * Generates and downloads a clean, ready-to-fill Excel template for importing suppliers and contacts
 */
export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // 1. Template Empresas
  const templateEmpresas = [
    {
      Nombre: 'Acme Componentes S.L.',
      Tipo: 'fabricante',
      Estado: 'homologado',
      NIT_CIF: 'B12345678',
      Direccion: 'Polígono Industrial Las Mercedes, Calle A 14',
      CP: '28022',
      Ciudad: 'Madrid',
      Provincia: 'Madrid',
      Pais: 'España',
      Telefono: '+34 912 345 678',
      Email: 'contacto@acmecomponentes.es',
      Web: 'https://www.acmecomponentes.es',
      Grupo: 'Grupo Acme',
      Tags: 'tornillería, sujeción, industrial',
      RolesAdicionales: 'distribuidor',
      Notas: 'Proveedor estratégico de fijaciones mecánicas.',
      UNSPSC: '31161500 - Tornillos, pernos y tuercas',
    },
    {
      Nombre: 'Distribuciones Logísticas Ibérica S.A.',
      Tipo: 'distribuidor',
      Estado: 'en_proceso',
      NIT_CIF: 'A87654321',
      Direccion: 'Avenida del Transporte 5',
      CP: '08040',
      Ciudad: 'Barcelona',
      Provincia: 'Barcelona',
      Pais: 'España',
      Telefono: '+34 934 567 890',
      Email: 'info@distribucionesiberica.com',
      Web: 'https://distribucionesiberica.com',
      Grupo: '',
      Tags: 'logística, embalaje, transporte',
      RolesAdicionales: 'servicios',
      Notas: 'En proceso de validación de solvencia técnica.',
      UNSPSC: '78101800 - Servicios de transporte de carga por carretera',
    }
  ];
  const wsEmpresas = XLSX.utils.json_to_sheet(templateEmpresas);
  wsEmpresas['!cols'] = [
    { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 35 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
    { wch: 28 }, { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 18 },
    { wch: 35 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsEmpresas, 'Proveedores');

  // 2. Template Contactos
  const templateContactos = [
    {
      Nombre: 'Carlos Martínez González',
      EmpresaPrincipal: 'Acme Componentes S.L.',
      Cargo: 'Director Comercial',
      ReportaA: '',
      Telefono: '+34 611 223 344',
      Email: 'carlos.martinez@acmecomponentes.es',
      LinkedIn: 'https://linkedin.com/in/carlosmartinez',
      Estado: 'activo',
      Intereses: 'fidelización, contratos marco',
      EmpresasAnteriores: 'Fijaciones del Norte',
      DondeSeConocio: 'Feria MetalMadrid 2024',
      Notas: 'Persona de contacto clave para cotizaciones.'
    },
    {
      Nombre: 'Laura Gómez Sánchez',
      EmpresaPrincipal: 'Distribuciones Logísticas Ibérica S.A.',
      Cargo: 'Jefa de Cuentas Clave',
      ReportaA: '',
      Telefono: '+34 622 334 455',
      Email: 'laura.gomez@distribucionesiberica.com',
      LinkedIn: '',
      Estado: 'activo',
      Intereses: 'rutas internacionales',
      EmpresasAnteriores: '',
      DondeSeConocio: 'Presentación comercial directa',
      Notas: 'Horario preferente de atención por las mañanas.'
    }
  ];
  const wsContactos = XLSX.utils.json_to_sheet(templateContactos);
  wsContactos['!cols'] = [
    { wch: 26 }, { wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 22 },
    { wch: 25 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsContactos, 'Contactos');

  // 3. Sheet de Guía / Instrucciones
  const instrucciones = [
    { Campo: 'Nombre', Obligatorio: 'SÍ', Descripcion: 'Nombre o Razón Social del proveedor/contacto.' },
    { Campo: 'Tipo', Obligatorio: 'NO', Descripcion: 'Valores válidos: fabricante, distribuidor, servicios, otros. (Por defecto: fabricante).' },
    { Campo: 'Estado', Obligatorio: 'NO', Descripcion: 'Valores válidos: prospecto, en_proceso, homologado, validado, en_cuarentena, no_apto, inactivo. (Por defecto: prospecto).' },
    { Campo: 'NIT_CIF', Obligatorio: 'NO', Descripcion: 'CIF / NIF / VAT de la empresa para evitar registros duplicados.' },
    { Campo: 'Tags', Obligatorio: 'NO', Descripcion: 'Etiquetas o palabras clave separadas por comas (ej: mecánica, plástico).' },
    { Campo: 'UNSPSC', Obligatorio: 'NO', Descripcion: 'Código numérico de 8 dígitos de clasificación de suministros o servicios.' },
    { Campo: 'EmpresaPrincipal', Obligatorio: 'SÍ (para contacto)', Descripcion: 'Nombre exacto de la empresa a la que pertenece el contacto.' },
  ];
  const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones);
  wsInstrucciones['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });
  downloadBlob(blob, 'srm_plantilla_importacion.xlsx');
};

/**
 * Parses any uploaded Excel file (.xlsx, .xls, .csv), auto-detecting sheets and normalizing headers
 */
export const parseExcelFile = (file: File): Promise<ParsedExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('El archivo Excel no contiene ninguna hoja de cálculo.');
        }

        const sheetNames = wb.SheetNames;
        const normalizedSheetMap = new Map<string, string>();
        sheetNames.forEach(sn => normalizedSheetMap.set(normalizeKey(sn), sn));

        // Locate sheets
        let empresasSheetName = '';
        let contactosSheetName = '';
        let interaccionesSheetName = '';
        let relacionesSheetName = '';

        // 1. Identify Empresas sheet
        for (const [norm, orig] of normalizedSheetMap.entries()) {
          if (norm.includes('empresa') || norm.includes('proveedor') || norm.includes('supplier') || norm.includes('fabricant') || norm.includes('distribuidor')) {
            empresasSheetName = orig;
            break;
          }
        }
        // If not found by keyword, fallback to 'sheet1', 'hoja1', or 1st sheet if only 1 sheet
        if (!empresasSheetName) {
          if (sheetNames.length === 1) {
            empresasSheetName = sheetNames[0];
          } else {
            for (const [norm, orig] of normalizedSheetMap.entries()) {
              if (norm.includes('sheet') || norm.includes('hoja') || norm.includes('datos') || norm.includes('principal')) {
                empresasSheetName = orig;
                break;
              }
            }
            if (!empresasSheetName) empresasSheetName = sheetNames[0];
          }
        }

        // 2. Identify Contactos sheet
        for (const [norm, orig] of normalizedSheetMap.entries()) {
          if (orig !== empresasSheetName && (norm.includes('contacto') || norm.includes('persona') || norm.includes('people') || norm.includes('contact'))) {
            contactosSheetName = orig;
            break;
          }
        }

        // 3. Identify Interacciones sheet
        for (const [norm, orig] of normalizedSheetMap.entries()) {
          if (orig !== empresasSheetName && orig !== contactosSheetName && (norm.includes('interacc') || norm.includes('reunion') || norm.includes('seguimiento') || norm.includes('activity'))) {
            interaccionesSheetName = orig;
            break;
          }
        }

        // 4. Identify Relaciones sheet
        for (const [norm, orig] of normalizedSheetMap.entries()) {
          if (orig !== empresasSheetName && orig !== contactosSheetName && orig !== interaccionesSheetName && (norm.includes('relacion') || norm.includes('partner') || norm.includes('distrib'))) {
            relacionesSheetName = orig;
            break;
          }
        }

        // Parse Empresas
        const rawEmpresas: any[] = empresasSheetName
          ? XLSX.utils.sheet_to_json(wb.Sheets[empresasSheetName], { defval: '' })
          : [];

        const parsedEmpresas: ParsedEmpresaRow[] = [];
        for (const row of rawEmpresas) {
          if (typeof row !== 'object' || !row) continue;
          const normRow: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            normRow[normalizeKey(k)] = v;
          }

          const rawNombre = getRowField(normRow, ['nombre', 'empresa', 'proveedor', 'razonsocial', 'company', 'name', 'titular', 'nombreempresa', 'denominacion']);
          if (!rawNombre || String(rawNombre).trim() === '') continue; // Skip empty row

          const nombre = String(rawNombre).trim();
          const tipo = normalizeTipo(getRowField(normRow, ['tipo', 'tipoproveedor', 'categoria', 'category', 'type', 'tipodeempresa']));
          const estado = normalizeEstado(getRowField(normRow, ['estado', 'status', 'homologacion', 'situacion', 'estadoproveedor']));
          const nit = safeString(getRowField(normRow, ['nit', 'cif', 'nif', 'vat', 'taxid', 'cifnif', 'nifcif', 'identificacion', 'dni', 'ciff']));
          const direccion = safeString(getRowField(normRow, ['direccion', 'domicilio', 'address', 'calle', 'ubicacion', 'dir']));
          const cp = safeString(getRowField(normRow, ['cp', 'codigopostal', 'postalcode', 'zip', 'zipcode']));
          const ciudad = safeString(getRowField(normRow, ['ciudad', 'poblacion', 'municipio', 'city', 'localidad']));
          const provincia = safeString(getRowField(normRow, ['provincia', 'state', 'region', 'comunidad', 'departamento']));
          const pais = safeString(getRowField(normRow, ['pais', 'country', 'nacion']), 'España');
          const telefono = safeString(getRowField(normRow, ['telefono', 'tel', 'phone', 'movil', 'celular', 'tlf', 'telefono1']));
          const email = safeString(getRowField(normRow, ['email', 'correo', 'correoelectronico', 'mail', 'email1']));
          const web = safeString(getRowField(normRow, ['web', 'paginaweb', 'sitio', 'website', 'url', 'sitioweb']));
          const grupo = safeString(getRowField(normRow, ['grupo', 'group', 'corporacion', 'holding', 'grupoempresarial']));
          const notas = safeString(getRowField(normRow, ['notas', 'observaciones', 'comentarios', 'notes', 'descripcion', 'nota']));

          // Tags
          const rawTags = getRowField(normRow, ['tags', 'etiquetas', 'sectores', 'palabrasclave', 'tagsetiquetas', 'tag']);
          const tags: string[] = rawTags
            ? String(rawTags).split(/[,;]/).map(t => t.trim()).filter(Boolean)
            : [];

          // Roles adicionales (esTambien)
          const rawRoles = getRowField(normRow, ['rolesadicionales', 'estambien', 'otrosroles', 'esotrotipo', 'roles']);
          const esTambien: EmpresaTipo[] = rawRoles
            ? String(rawRoles).split(/[,;]/).map(r => normalizeTipo(r.trim())).filter(r => r !== tipo)
            : [];

          // UNSPSC
          const rawUnspsc = safeString(getRowField(normRow, ['unspsc', 'codigosunspsc', 'rubros', 'actividades', 'catalogo', 'codigounspsc']));
          const unspscCodes = extractUnspscCodes(rawUnspsc);

          // Evaluation scores if present
          const plazos = Number(getRowField(normRow, ['evaluacionplazos', 'plazos', 'otif'])) || 0;
          const calidad = Number(getRowField(normRow, ['evaluacioncalidad', 'calidad', 'defectos'])) || 0;
          const flexibilidad = Number(getRowField(normRow, ['evaluacionflexibilidad', 'flexibilidad'])) || 0;
          const comentariosEval = safeString(getRowField(normRow, ['evaluacioncomentarios', 'comentariosevaluacion', 'evaluacioncomentario']));

          const evaluacion = (plazos > 0 || calidad > 0 || flexibilidad > 0 || comentariosEval)
            ? {
                plazos: plazos > 0 ? Math.min(5, Math.max(1, plazos)) : 3,
                calidad: calidad > 0 ? Math.min(5, Math.max(1, calidad)) : 3,
                flexibilidad: flexibilidad > 0 ? Math.min(5, Math.max(1, flexibilidad)) : 3,
                comentarios: comentariosEval,
              }
            : undefined;

          const rawFecha = getRowField(normRow, ['fechacreacion', 'fechaalta', 'fecha', 'creadoel']);
          const fecha_creacion = rawFecha ? parseExcelDate(rawFecha) : new Date().toISOString().slice(0, 10);

          parsedEmpresas.push({
            nombre,
            tipo,
            estado,
            nit,
            direccion,
            cp,
            ciudad,
            provincia,
            pais,
            telefono,
            email,
            web,
            grupo,
            tags,
            esTambien,
            notas,
            unspscCodes: unspscCodes.length > 0 ? unspscCodes : undefined,
            evaluacion,
            fecha_creacion,
          });
        }

        // Parse Contactos
        const rawContactos: any[] = contactosSheetName
          ? XLSX.utils.sheet_to_json(wb.Sheets[contactosSheetName], { defval: '' })
          : [];

        const parsedContactos: ParsedContactoRow[] = [];
        for (const row of rawContactos) {
          if (typeof row !== 'object' || !row) continue;
          const normRow: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            normRow[normalizeKey(k)] = v;
          }

          const rawNombre = getRowField(normRow, ['nombre', 'contacto', 'nombrecontacto', 'name', 'persona', 'responsable', 'atencion', 'personadecontacto']);
          if (!rawNombre || String(rawNombre).trim() === '') continue;

          const nombre = String(rawNombre).trim();
          const empresaNombre = safeString(getRowField(normRow, ['empresa', 'empresaprincipal', 'company', 'proveedor', 'empresas', 'nombreempresa']));
          const cargo = safeString(getRowField(normRow, ['cargo', 'puesto', 'posicion', 'role', 'title', 'funcion', 'ocupacion']));
          const reportaA = safeString(getRowField(normRow, ['reportaa', 'jefe', 'superior', 'manager', 'responsable', 'supervisadopor']));
          const telefono = safeString(getRowField(normRow, ['telefono', 'tel', 'phone', 'movil', 'celular', 'tlf', 'telefono1']));
          const email = safeString(getRowField(normRow, ['email', 'correo', 'correoelectronico', 'mail', 'email1']));
          const linkedin = safeString(getRowField(normRow, ['linkedin', 'redsocial', 'perfillinkedin']));
          
          const rawEstado = normalizeKey(String(getRowField(normRow, ['estado', 'status']) || ''));
          const estado: 'activo' | 'inactivo' = rawEstado.includes('inactiv') || rawEstado.includes('baja') ? 'inactivo' : 'activo';
          const motivoInactivo = safeString(getRowField(normRow, ['motivoinactivo', 'motivodebaja', 'razonbaja']));

          const rawIntereses = getRowField(normRow, ['intereses', 'hobbies', 'gustos', 'temasdeinteres']);
          const intereses = rawIntereses ? String(rawIntereses).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

          const rawEmpAnteriores = getRowField(normRow, ['empresasanteriores', 'experiencia', 'anteriores', 'trayectoria']);
          const empresasAnteriores = rawEmpAnteriores ? String(rawEmpAnteriores).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

          const rawDondeSeConocio = getRowField(normRow, ['dondeseconocio', 'conocioen', 'origen', 'evento', 'feria']);
          const dondeSeConocio = rawDondeSeConocio ? String(rawDondeSeConocio).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

          const notas = safeString(getRowField(normRow, ['notas', 'observaciones', 'comentarios', 'notes']));

          parsedContactos.push({
            nombre,
            empresaNombre,
            cargo,
            reportaA,
            telefono,
            email,
            linkedin,
            estado,
            motivoInactivo,
            intereses,
            empresasAnteriores,
            dondeSeConocio,
            notas,
          });
        }

        // Parse Interacciones
        const rawInteracciones: any[] = interaccionesSheetName
          ? XLSX.utils.sheet_to_json(wb.Sheets[interaccionesSheetName], { defval: '' })
          : [];

        const parsedInteracciones: ParsedInteraccionRow[] = [];
        for (const row of rawInteracciones) {
          if (typeof row !== 'object' || !row) continue;
          const normRow: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            normRow[normalizeKey(k)] = v;
          }

          const rawAsunto = getRowField(normRow, ['asunto', 'titulo', 'subject', 'tema', 'motivo']);
          if (!rawAsunto || String(rawAsunto).trim() === '') continue;

          const asunto = String(rawAsunto).trim();
          const rawTipo = normalizeKey(String(getRowField(normRow, ['tipo', 'type', 'canal', 'mediodecontacto']) || ''));
          let tipo: 'reunion' | 'llamada' | 'email' | 'feria' = 'reunion';
          if (rawTipo.includes('llamad') || rawTipo.includes('phone') || rawTipo.includes('tel')) tipo = 'llamada';
          else if (rawTipo.includes('email') || rawTipo.includes('correo')) tipo = 'email';
          else if (rawTipo.includes('feria') || rawTipo.includes('evento')) tipo = 'feria';

          const fecha = parseExcelDate(getRowField(normRow, ['fecha', 'date', 'fechainteraccion']));
          const rawFechaLim = getRowField(normRow, ['fechalimite', 'limite', 'fechavencimiento', 'deadline', 'vencimiento']);
          const fechaLimite = rawFechaLim ? parseExcelDate(rawFechaLim) : undefined;

          const rawEstado = normalizeKey(String(getRowField(normRow, ['estado', 'status']) || ''));
          const estado: 'pendiente' | 'completada' = rawEstado.includes('complet') || rawEstado.includes('hecho') || rawEstado.includes('cerrad') ? 'completada' : 'pendiente';

          const rawConts = getRowField(normRow, ['contactos', 'contacto', 'participantes', 'asistentes', 'personas']);
          const contactosNombres = rawConts ? String(rawConts).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

          const rawEmps = getRowField(normRow, ['empresas', 'empresa', 'proveedores']);
          const empresasNombres = rawEmps ? String(rawEmps).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

          const descripcion = safeString(getRowField(normRow, ['descripcion', 'detalle', 'resumen', 'notas', 'contenido']));
          const resolucion = safeString(getRowField(normRow, ['resolucion', 'resultado', 'conclusion', 'acuerdo']));
          const pasosRaw = safeString(getRowField(normRow, ['pasos', 'acciones', 'tareas', 'siguientespasos']));

          parsedInteracciones.push({
            asunto,
            tipo,
            fecha,
            fechaLimite,
            estado,
            contactosNombres,
            empresasNombres,
            descripcion,
            resolucion,
            pasosRaw,
          });
        }

        // Parse Relaciones
        const rawRelaciones: any[] = relacionesSheetName
          ? XLSX.utils.sheet_to_json(wb.Sheets[relacionesSheetName], { defval: '' })
          : [];

        const parsedRelaciones: ParsedRelacionRow[] = [];
        for (const row of rawRelaciones) {
          if (typeof row !== 'object' || !row) continue;
          const normRow: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) {
            normRow[normalizeKey(k)] = v;
          }

          const fabricanteNombre = safeString(getRowField(normRow, ['fabricante', 'manufacturer', 'empresa1', 'fabricanteprincipal']));
          const distribuidorNombre = safeString(getRowField(normRow, ['distribuidor', 'distributor', 'empresa2', 'distribuidorautorizado']));
          if (!fabricanteNombre || !distribuidorNombre) continue;

          const rawPref = normalizeKey(String(getRowField(normRow, ['preferente', 'preferred', 'prioritario', 'espreferente']) || ''));
          const preferente = rawPref.includes('si') || rawPref.includes('yes') || rawPref.includes('true') || rawPref === '1' ? 'si' : 'no';
          const notas = safeString(getRowField(normRow, ['notas', 'observaciones', 'notes']));

          parsedRelaciones.push({
            fabricanteNombre,
            distribuidorNombre,
            preferente,
            notas,
          });
        }

        resolve({
          empresas: parsedEmpresas,
          contactos: parsedContactos,
          interacciones: parsedInteracciones,
          relaciones: parsedRelaciones,
          sheetNamesFound: sheetNames,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
