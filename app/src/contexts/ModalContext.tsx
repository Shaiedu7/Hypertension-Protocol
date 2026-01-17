import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEmergencySession } from './EmergencySessionContext';
import { Timer, EmergencySession } from '../types';
import { NotificationDispatcher } from '../services/notificationDispatcher';

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
  const { activeSession, activeTimer, patient } = useEmergencySession();
  const [modals, setModals] = useState<ModalState>({
    timerExpired: false,
    timerExpiredData: null,
    escalation: false,
    escalationData: null,
    emergencyConfirmed: false,
    emergencyConfirmedData: null,
  });
  const [notifiedTimers, setNotifiedTimers] = useState<Set<string>>(new Set());

  // Clear notified timers when patient/session changes (prevents stale timer state after room deletion/recreation)
  useEffect(() => {
    setNotifiedTimers(new Set());
  }, [activeSession?.id, patient?.id]);

  // Monitor for timer expiration (polling so we don't miss the moment it crosses zero)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTimer && patient) {
        const now = new Date();
        const expiresAt = new Date(activeTimer.expires_at);
        
        // Timer has expired if current time is past expires_at
        // Check is_active to prevent showing modal for deactivated timers
        if (now >= expiresAt && activeTimer.is_active && !notifiedTimers.has(activeTimer.id)) {
          NotificationDispatcher.notifyTimerExpired(
            patient.id,
            activeTimer.type as 'bp_recheck' | 'medication_wait',
            patient.room_number
          );

          showTimerExpiredModal(activeTimer);
          setNotifiedTimers(prev => new Set(prev).add(activeTimer.id));
        }
      }
    }, 2000); // check every 2 seconds for more responsive detection

    return () => clearInterval(interval);
  }, [activeTimer, patient, notifiedTimers]);

  // Escalation modal removed - visual badge on cards is sufficient

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
