/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmpresaTipo = 'fabricante' | 'distribuidor' | 'servicios' | 'otros';
export type EmpresaEstado = 'prospecto' | 'en_proceso' | 'homologado' | 'en_cuarentena' | 'no_apto' | 'inactivo' | 'validado';

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
}

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
