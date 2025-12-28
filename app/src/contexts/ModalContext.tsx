import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEmergencySession } from './EmergencySessionContext';
import { Timer, EmergencySession } from '../types';

export interface ModalState {
  timerExpired: boolean;
  timerExpiredData: Timer | null;
  escalation: boolean;
  escalationData: EmergencySession | null;
  emergencyConfirmed: boolean;
  emergencyConfirmedData: EmergencySession | null;
}

interface ModalContextType {
  modals: ModalState;
  showTimerExpiredModal: (timer: Timer) => void;
  dismissTimerExpiredModal: () => void;
  showEscalationModal: (session: EmergencySession) => void;
  dismissEscalationModal: () => void;
  showEmergencyConfirmedModal: (session: EmergencySession) => void;
  dismissEmergencyConfirmedModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within ModalProvider');
  }
  return context;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { activeSession, activeTimer } = useEmergencySession();
  const [modals, setModals] = useState<ModalState>({
    timerExpired: false,
    timerExpiredData: null,
    escalation: false,
    escalationData: null,
    emergencyConfirmed: false,
    emergencyConfirmedData: null,
  });

  // Monitor for timer expiration
  useEffect(() => {
    if (activeTimer) {
      const now = new Date();
      const expiresAt = new Date(activeTimer.expires_at);
      
      // Check if timer has expired
      if (now >= expiresAt && activeTimer.is_active) {
        showTimerExpiredModal(activeTimer);
      }
    }
  }, [activeTimer]);

  // Monitor for escalation status changes
  useEffect(() => {
    if (activeSession?.status === 'escalated' && !modals.escalation) {
      showEscalationModal(activeSession);
    }
  }, [activeSession?.status]);

  // Monitor for emergency confirmation (2 high BPs)
  useEffect(() => {
    if (activeSession?.status === 'active' && activeSession.algorithm_selected === null) {
      // If we have an active session without algorithm selection,
      // it means emergency was just confirmed
      showEmergencyConfirmedModal(activeSession);
    }
  }, [activeSession?.id]);

  const showTimerExpiredModal = (timer: Timer) => {
    setModals(prev => ({
      ...prev,
      timerExpired: true,
      timerExpiredData: timer,
    }));
  };

  const dismissTimerExpiredModal = () => {
    setModals(prev => ({
      ...prev,
      timerExpired: false,
      timerExpiredData: null,
    }));
  };

  const showEscalationModal = (session: EmergencySession) => {
    setModals(prev => ({
      ...prev,
      escalation: true,
      escalationData: session,
    }));
  };

  const dismissEscalationModal = () => {
    setModals(prev => ({
      ...prev,
      escalation: false,
      escalationData: null,
    }));
  };

  const showEmergencyConfirmedModal = (session: EmergencySession) => {
    setModals(prev => ({
      ...prev,
      emergencyConfirmed: true,
      emergencyConfirmedData: session,
    }));
  };

  const dismissEmergencyConfirmedModal = () => {
    setModals(prev => ({
      ...prev,
      emergencyConfirmed: false,
      emergencyConfirmedData: null,
    }));
  };

  const value: ModalContextType = {
    modals,
    showTimerExpiredModal,
    dismissTimerExpiredModal,
    showEscalationModal,
    dismissEscalationModal,
    showEmergencyConfirmedModal,
    dismissEmergencyConfirmedModal,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}
