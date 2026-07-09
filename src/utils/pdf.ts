/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Empresa, Contacto, Interaccion, Documento } from '../types';

export const generateCompanyReportPDF = (
  emp: Empresa,
  contactosEmp: Contacto[],
  interaccionesEmp: Interaccion[],
  docsEmp: Documento[]
) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = 210;
  const margen = 14;
  let y = 36;

  // Helpers
  const addField = (label: string, value: string) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', margen, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(String(value), W - margen - 60);
    doc.text(lines, margen + 32, y);
    y += Math.max(lines.length * 4.5, 5);
  };

  const checkPage = (needed = 12) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  const addSectionHeader = (text: string) => {
    checkPage(15);
    y += 4;
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(margen, y - 4, W - margen * 2, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(text, margen + 3, y + 1);
    y += 8;
    doc.setTextColor(30, 30, 30);
  };

  // Header Banner
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(emp.nombre, margen, 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const tipoLabel = emp.tipo.toUpperCase();
  const estadoLabel = emp.estado.toUpperCase();
  doc.text(
    `${tipoLabel}  ·  ESTADO: ${estadoLabel}  ·  Informe generado: ${new Date().toLocaleDateString('es-ES')}`, 
    margen, 
    21
  );

  // 1. General Info
  addSectionHeader('INFORMACIÓN GENERAL');
  addField('NIT / CIF', emp.nit);
  addField('Dirección', [emp.direccion, emp.cp, emp.ciudad, emp.provincia, emp.pais].filter(Boolean).join(', '));
  addField('Teléfono', emp.telefono);
  addField('Email', emp.email);
  addField('Sitio Web', emp.web);
  addField('Grupo', emp.grupo || '');
  if (emp.tags && emp.tags.length > 0) {
    addField('Materiales / Tags', emp.tags.join(', '));
  }
  if (emp.notas) {
    addField('Notas internas', emp.notas);
  }

  // 2. Contactos
  if (contactosEmp.length > 0) {
    addSectionHeader(`ORGANIGRAMA Y CONTACTOS DE LA EMPRESA (${contactosEmp.length})`);
    contactosEmp.forEach(c => {
      checkPage(14);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39); // gray-900
      doc.text(`${c.nombre}  —  ${c.cargo || 'Sin cargo'}`, margen + 2, y);
      y += 4.5;

      const contactDetails = [c.telefono, c.email, c.linkedin].filter(Boolean).join('  |  ');
      if (contactDetails) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(contactDetails, margen + 4, y);
        y += 4;
      }
      y += 1.5;
    });
  }

  // 3. Historial de Interacciones
  if (interaccionesEmp.length > 0) {
    addSectionHeader(`HISTORIAL DE INTERACCIONES RECIENTES (${interaccionesEmp.length})`);
    interaccionesEmp.slice(0, 15).forEach(i => {
      checkPage(20);
      const formattedDate = new Date(i.fecha + 'T12:00:00').toLocaleDateString('es-ES');
      const tipoEmoji = i.tipo === 'reunion' ? 'Reunión' : i.tipo === 'llamada' ? 'Llamada' : i.tipo === 'email' ? 'Correo' : 'Feria';
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`${formattedDate}  [${tipoEmoji}]  ${i.asunto}`, margen + 2, y);
      y += 4.5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Estado: ${i.estado.toUpperCase()}`, margen + 4, y);
      y += 4;

      if (i.descripcion) {
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85); // slate-700
        const descLines = doc.splitTextToSize(i.descripcion, W - margen * 2 - 8);
        descLines.slice(0, 3).forEach((line: string) => {
          checkPage(4);
          doc.text(line, margen + 4, y);
          y += 4;
        });
      }

      if (i.resolucion) {
        checkPage(4);
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.setFont('helvetica', 'bold');
        doc.text('Resolución:', margen + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59); // slate-800
        const resLines = doc.splitTextToSize(i.resolucion, W - margen * 2 - 28);
        doc.text(resLines, margen + 24, y);
        y += Math.max(resLines.length * 4, 4.5);
      }

      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(margen, y, W - margen, y);
      y += 3;
    });
  }

  // 4. Documentos
  if (docsEmp.length > 0) {
    addSectionHeader(`ARCHIVOS Y CERTIFICACIONES VINCULADAS (${docsEmp.length})`);
    docsEmp.forEach(d => {
      checkPage(10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`📄 ${d.nombre}`, margen + 2, y);
      y += 4;

      if (d.fechaCaducidad) {
        const fCad = new Date(d.fechaCaducidad + 'T12:00:00');
        const diasRestantes = Math.ceil((fCad.getTime() - new Date().getTime()) / 86400000);
        const fCadStr = fCad.toLocaleDateString('es-ES');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        if (diasRestantes < 0) {
          doc.setTextColor(220, 38, 38); // rose-600
          doc.text(`⚠️ Caducado el ${fCadStr}`, margen + 4, y);
        } else if (diasRestantes <= 30) {
          doc.setTextColor(217, 119, 6); // amber-600
          doc.text(`⏰ Caduca pronto el ${fCadStr} (en ${diasRestantes} días)`, margen + 4, y);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text(`Fecha de caducidad: ${fCadStr}`, margen + 4, y);
        }
        y += 4;
      }
      y += 1.5;
    });
  }

  // Pagination Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.text(`SRM Profesional  ·  ${emp.nombre}  ·  Pág. ${p}/${totalPages}`, margen, 290);
  }

  doc.save(`informe_srm_${emp.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
