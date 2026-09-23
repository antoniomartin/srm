/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Empresa, Contacto, Interaccion, Documento, Relacion, EmpresaTipo } from '../types';
import { EmpresaDetailModal } from './modals/EmpresaDetailModal';
import { ContactoDetailModal } from './modals/ContactoDetailModal';
import { InteraccionDetailModal } from './modals/InteraccionDetailModal';
import { ConfirmDialog, ConfirmDialogState } from './modals/ConfirmDialog';

export interface FichasModalesProps {
  // Detail Overlay States
  selectedEmpresa: Empresa | null;
  selectedContacto: Contacto | null;
  selectedInteraccion: Interaccion | null;

  // Close Callbacks
  onCloseEmpresa: () => void;
  onCloseContacto: () => void;
  onCloseInteraccion: () => void;

  // Selection Callbacks
  onOpenContacto?: (id: string) => void;
  onOpenInteraccion?: (id: string) => void;
  onOpenEmpresa?: (id: string) => void;

  // Collections
  empresas: Empresa[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  documentos: Documento[];
  relaciones: Relacion[];

  // CRUD actions
  onUpdateEmpresa: (emp: Empresa) => Promise<void>;
  onDeleteEmpresa: (id: string) => Promise<void>;
  onUpdateContacto: (cont: Contacto) => Promise<void>;
  onDeleteContacto: (id: string) => Promise<void>;
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  onDeleteInteraccion: (id: string) => Promise<void>;
  onAddRelacion: (fabId: string, distId: string, pref: 'si' | 'no') => Promise<void>;
  onAddEmpresaRapida: (nombre: string, tipo: EmpresaTipo) => Promise<string | undefined>;
  onUpdateRelacion: (rel: Relacion) => Promise<void>;
  onDeleteRelacion: (id: string) => Promise<void>;
  onAddDocumento: (empId: string, nombre: string, url: string, caducidad: string | null) => Promise<void>;
  onDeleteDocumento: (id: string) => Promise<void>;

  // Custom functions
  onGeocodeManual: (empId: string) => void;
  onGeneratePDF: (emp: Empresa) => void;
  scores: { [id: string]: { nivel: string; label: string; dias: number | null } };
}

export const FichasModales: React.FC<FichasModalesProps> = ({
  selectedEmpresa,
  selectedContacto,
  selectedInteraccion,
  onCloseEmpresa,
  onCloseContacto,
  onCloseInteraccion,
  onOpenContacto,
  onOpenInteraccion,
  onOpenEmpresa,
  empresas,
  contactos,
  interacciones,
  documentos,
  relaciones,
  onUpdateEmpresa,
  onDeleteEmpresa,
  onUpdateContacto,
  onDeleteContacto,
  onUpdateInteraccion,
  onDeleteInteraccion,
  onAddRelacion,
  onAddEmpresaRapida,
  onUpdateRelacion,
  onDeleteRelacion,
  onAddDocumento,
  onDeleteDocumento,
  onGeocodeManual,
  onGeneratePDF,
  scores,
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDestructive = false,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar'
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      isDestructive,
      onConfirm,
    });
  };

  const closeConfirmation = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <EmpresaDetailModal
        selectedEmpresa={selectedEmpresa}
        onClose={onCloseEmpresa}
        empresas={empresas}
        contactos={contactos}
        interacciones={interacciones}
        documentos={documentos}
        relaciones={relaciones}
        scores={scores}
        onUpdateEmpresa={onUpdateEmpresa}
        onDeleteEmpresa={onDeleteEmpresa}
        onOpenContacto={onOpenContacto}
        onOpenInteraccion={onOpenInteraccion}
        onOpenEmpresa={onOpenEmpresa}
        onAddRelacion={onAddRelacion}
        onAddEmpresaRapida={onAddEmpresaRapida}
        onUpdateRelacion={onUpdateRelacion}
        onDeleteRelacion={onDeleteRelacion}
        onAddDocumento={onAddDocumento}
        onDeleteDocumento={onDeleteDocumento}
        onGeocodeManual={onGeocodeManual}
        onGeneratePDF={onGeneratePDF}
        onUpdateContacto={onUpdateContacto}
        onUpdateInteraccion={onUpdateInteraccion}
        askConfirmation={askConfirmation}
      />

      <ContactoDetailModal
        selectedContacto={selectedContacto}
        onClose={onCloseContacto}
        empresas={empresas}
        contactos={contactos}
        interacciones={interacciones}
        onUpdateContacto={onUpdateContacto}
        onDeleteContacto={onDeleteContacto}
        onUpdateInteraccion={onUpdateInteraccion}
        onOpenEmpresa={onOpenEmpresa}
        onOpenInteraccion={onOpenInteraccion}
        askConfirmation={askConfirmation}
      />

      <InteraccionDetailModal
        selectedInteraccion={selectedInteraccion}
        onClose={onCloseInteraccion}
        empresas={empresas}
        contactos={contactos}
        onUpdateInteraccion={onUpdateInteraccion}
        onDeleteInteraccion={onDeleteInteraccion}
        onOpenContacto={onOpenContacto}
        onOpenEmpresa={onOpenEmpresa}
        askConfirmation={askConfirmation}
      />

      <ConfirmDialog state={confirmState} onClose={closeConfirmation} />
    </>
  );
};
