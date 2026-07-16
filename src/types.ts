/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmpresaTipo = 'fabricante' | 'distribuidor' | 'servicios' | 'otros';
export type EmpresaEstado = 'prospecto' | 'en_proceso' | 'homologado' | 'en_cuarentena' | 'no_apto' | 'inactivo' | 'validado';

export interface EvaluacionDesempeno {
  plazos: number; // 1-5 OTIF (Cumplimiento de plazos)
  calidad: number; // 1-5 (Calidad del producto/servicio / Tasa de defectos)
  flexibilidad: number; // 1-5 (Flexibilidad y facturación)
  comentarios?: string;
  ultimaActualizacion?: string; // ISO String
}

export interface Empresa {
  id?: string;
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
  notas: string;
  tags: string[];
  esTambien?: EmpresaTipo[];
  fecha_creacion: string;
  _lat?: number;
  _lon?: number;
  _geoAddr?: string;
  _manual?: boolean;
  grupo?: string;
  evaluacion?: EvaluacionDesempeno;
  unspscCodes?: UnspscCode[];
}

export interface UnspscCode {
  code: string;
  name: string;
  segment?: string;
}

export const UNSPSC_OPTIONS: UnspscCode[] = [
  // 31000000: Componentes y suministros de manufactura
  { code: "31161500", name: "Tornillos, pernos y tuercas (Sujeciones y Tornillería)", segment: "Manufactura" },
  { code: "31201500", name: "Adhesivos y selladores industriales", segment: "Manufactura" },
  // 39120000: Equipos y suministros eléctricos
  { code: "39121000", name: "Disyuntores, fusibles y componentes de distribución", segment: "Suministros Eléctricos" },
  { code: "39121400", name: "Conectores y terminales de cables", segment: "Suministros Eléctricos" },
  // 43200000: Componentes y accesorios informáticos
  { code: "43201400", name: "Dispositivos de almacenamiento de datos", segment: "Tecnología y TI" },
  { code: "43211500", name: "Computadoras portátiles y de escritorio", segment: "Tecnología y TI" },
  { code: "43221500", name: "Equipos de redes y telecomunicaciones", segment: "Tecnología y TI" },
  { code: "43231500", name: "Software de gestión corporativa (ERP, CRM, etc.)", segment: "Tecnología y TI" },
  // 24120000: Embalajes y recipientes
  { code: "24121500", name: "Cajas de cartón y embalajes de papel", segment: "Logística y Embalaje" },
  { code: "24112100", name: "Palés y contenedores plásticos/metálicos", segment: "Logística y Embalaje" },
  // 78100000: Servicios de transporte de carga
  { code: "78101800", name: "Servicios de transporte de carga por carretera", segment: "Logística y Embalaje" },
  { code: "78121605", name: "Servicios de almacenamiento de mercancías y bodegaje", segment: "Logística y Embalaje" },
  // 72100000: Servicios de mantenimiento y reparación de instalaciones
  { code: "72101503", name: "Servicios de HVAC (Calefacción, ventilación y aire acondicionado)", segment: "Mantenimiento y Facilidades" },
  { code: "72101511", name: "Servicios de fontanería, gas e instalaciones de agua", segment: "Mantenimiento y Facilidades" },
  { code: "72151500", name: "Servicios de instalación eléctrica en edificios", segment: "Mantenimiento y Facilidades" },
  { code: "76111500", name: "Servicios de limpieza general de oficinas e industrias", segment: "Mantenimiento y Facilidades" },
  // 12000000: Materiales químicos incluyendo gases
  { code: "12141500", name: "Compuestos orgánicos y materias primas plásticas", segment: "Materiales y Suministros" },
  { code: "12352200", name: "Reactivos químicos de laboratorio", segment: "Materiales y Suministros" },
  // 15100000: Combustibles y lubricantes
  { code: "15101500", name: "Combustibles derivados del petróleo (Gasóleo, Gasolina)", segment: "Materiales y Suministros" },
  { code: "15121500", name: "Lubricantes y aceites industriales", segment: "Materiales y Suministros" },
  // 44000000: Equipos de oficina y suministros
  { code: "44111500", name: "Mobiliario y escritorios de oficina", segment: "Equipos de Oficina" },
  { code: "44121500", name: "Suministros de papelería y consumibles", segment: "Equipos de Oficina" },
  // 80100000: Servicios de consultoría de gestión de negocios
  { code: "80101500", name: "Servicios de consultoría de gestión empresarial y estratégica", segment: "Servicios Profesionales" },
  { code: "84111500", name: "Servicios de auditoría financiera y contabilidad", segment: "Servicios Profesionales" },
  { code: "80121500", name: "Servicios de asesoría legal y representación jurídica", segment: "Servicios Profesionales" },
  { code: "86131500", name: "Servicios de formación y capacitación técnica", segment: "Servicios Profesionales" },
  // 46180000: Seguridad y protección personal
  { code: "46181500", name: "Equipos de protección individual (EPIs, calzado, cascos)", segment: "Seguridad y Calidad" },
  { code: "80161500", name: "Servicios de consultoría de control de calidad y auditorías", segment: "Seguridad y Calidad" }
];

export interface Contacto {
  id?: string;
  nombre: string;
  empresaId: string;
  empresaIds?: string[]; // Multiple companies associated
  cargo: string;
  reportaA: string | null;
  telefono: string;
  email: string;
  linkedin: string;
  foto?: string;
  empresasAnteriores?: string[];
  empresaConocido?: string[];
  intereses?: string[];
  notas: string;
  fecha_creacion: string;
  estado: 'activo' | 'inactivo';
}

export type InteraccionTipo = 'reunion' | 'llamada' | 'email' | 'feria';
export type InteraccionEstado = 'pendiente' | 'completada';

export interface PasoInteraccion {
  texto: string;
  fecha: string;
  completado?: boolean;
}

export interface Interaccion {
  id?: string;
  contactoId: string; // Primary contact ID (for legacy compatibility)
  contactoIds?: string[]; // Multiple participants
  empresaIds?: string[]; // Multiple companies involved
  tipo: InteraccionTipo;
  fecha: string; // YYYY-MM-DD
  fechaLimite?: string | null; // YYYY-MM-DD
  asunto: string;
  descripcion: string;
  estado: InteraccionEstado;
  resolucion: string;
  archivo?: string | null;
  pasos?: PasoInteraccion[];
}

export interface Relacion {
  id?: string;
  fabricanteId: string;
  distribuidorId: string;
  preferente: 'si' | 'no';
  notas: string;
}

export interface GrupoRelacion {
  id?: string;
  empresa1Id: string;
  empresa2Id: string;
}

export interface Documento {
  id?: string;
  empresaId: string;
  nombre: string;
  url: string; // base64 or file reference
  fecha: string;
  fechaCaducidad?: string | null; // YYYY-MM-DD
}
