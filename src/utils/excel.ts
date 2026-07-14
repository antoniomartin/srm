/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Empresa, Contacto, Interaccion, Relacion } from '../types';

export const exportToExcel = (
  empresas: Empresa[],
  contactos: Contacto[],
  interacciones: Interaccion[],
  relaciones: Relacion[]
) => {
  const wb = XLSX.utils.book_new();

  // 1. Empresas Sheet
  const empresasData = empresas.map(e => ({
    Nombre: e.nombre,
    Tipo: e.tipo,
    Estado: e.estado,
    NIT: e.nit || '',
    Direccion: e.direccion || '',
    CP: e.cp || '',
    Ciudad: e.ciudad || '',
    Provincia: e.provincia || '',
    Pais: e.pais || '',
    Telefono: e.telefono || '',
    Email: e.email || '',
    Web: e.web || '',
    Grupo: e.grupo || '',
    Tags: (e.tags || []).join(', '),
    RolesAdicionales: (e.esTambien || []).join(', '),
    FechaCreacion: e.fecha_creacion,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empresasData), 'Empresas');

  // 2. Contactos Sheet
  const contactosData = contactos.map(c => {
    const emp = empresas.find(e => e.id === c.empresaId);
    const sup = contactos.find(s => s.id === c.reportaA);
    return {
      Nombre: c.nombre,
      EmpresaPrincipal: emp?.nombre || '',
      Cargo: c.cargo || '',
      ReportaA: sup?.nombre || '',
      Telefono: c.telefono || '',
      Email: c.email || '',
      LinkedIn: c.linkedin || '',
      Estado: c.estado || 'activo',
      Intereses: (c.intereses || []).join(', '),
      EmpresasAnteriores: (c.empresasAnteriores || []).join(', '),
      DondeSeConocio: (c.empresaConocido || []).join(', '),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactosData), 'Contactos');

  // 3. Interacciones Sheet
  const interaccionesData = interacciones.map(i => {
    const allContIds = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
    const conts = allContIds.map(cid => contactos.find(c => c.id === cid)).filter(Boolean);
    const emps = [...new Set(conts.map(c => empresas.find(e => e.id === c.empresaId)?.nombre).filter(Boolean))];
    
    return {
      Asunto: i.asunto,
      Tipo: i.tipo,
      Fecha: i.fecha,
      FechaLimite: i.fechaLimite || '',
      Estado: i.estado,
      Contactos: conts.map(c => c.nombre).join(', '),
      Empresas: emps.join(', '),
      Descripcion: i.descripcion || '',
      Resolucion: i.resolucion || '',
      Pasos: (i.pasos || []).map(p => `[${p.fecha}] ${p.texto}${p.completado ? ' (Hecho)' : ''}`).join('; '),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(interaccionesData), 'Interacciones');

  // 4. Relaciones Sheet
  const relacionesData = relaciones.map(r => {
    const f = empresas.find(e => e.id === r.fabricanteId);
    const d = empresas.find(e => e.id === r.distribuidorId);
    return {
      Fabricante: f?.nombre || '',
      Distribuidor: d?.nombre || '',
      Preferente: r.preferente,
      Notas: r.notas || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(relacionesData), 'Relaciones');

  XLSX.writeFile(wb, `srm_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelFile = (
  file: File
): Promise<{
  empresas: any[];
  contactos: any[];
  interacciones: any[];
  relaciones: any[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        const result = {
          empresas: wb.SheetNames.includes('Empresas') ? XLSX.utils.sheet_to_json(wb.Sheets['Empresas']) : [],
          contactos: wb.SheetNames.includes('Contactos') ? XLSX.utils.sheet_to_json(wb.Sheets['Contactos']) : [],
          interacciones: wb.SheetNames.includes('Interacciones') ? XLSX.utils.sheet_to_json(wb.Sheets['Interacciones']) : [],
          relaciones: wb.SheetNames.includes('Relaciones') ? XLSX.utils.sheet_to_json(wb.Sheets['Relaciones']) : [],
        };
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
