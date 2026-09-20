import React, { useState, useContext, useEffect } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { MasterTitleHeader } from './components/MasterTitleHeader';
import { MasterNavHeader } from './components/MasterNavHeader';
import { LoginView } from './views/LoginView';
import { DoctorView } from './views/DoctorView';
import { AdminView } from './views/AdminView';
import { CoordinatorView } from './views/CoordinatorView';
import { GovernanceView } from './views/GovernanceView';
import { TopologyView } from './views/TopologyView';

const AppContent = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('doctor');

  // Step state tracking for each role (1, 2, or 3)
  const [workflowState, setWorkflowState] = useState({
    doctor: { step: 1, completed: [] },
    admin: { step: 1, completed: [] },
    researcher: { step: 1, completed: [] }
  });

  // Sync activeTab with user role on login
  useEffect(() => {
    if (user && user.role) {
      setActiveTab(user.role);
    }
  }, [user]);

  const activeRole = user?.role || 'doctor';
  const roleState = workflowState[activeRole] || { step: 1, completed: [] };

  const setCurrentStep = (newStep) => {
    setWorkflowState(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        step: newStep
      }
    }));
  };

  const setCompletedSteps = (updater) => {
    setWorkflowState(prev => {
      const currentCompleted = prev[activeRole]?.completed || [];
      const updated = typeof updater === 'function' ? updater(currentCompleted) : updater;
      return {
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          completed: updated
        }
      };
    });
  };

  return (
    <div className="app-container">
      <div className="master-header-container">
        <MasterTitleHeader />
        <MasterNavHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentStep={roleState.step}
          setCurrentStep={setCurrentStep}
          completedSteps={roleState.completed}
        />
      </div>

      {/* Main Workspace Body */}
      <main className="main-content">
        {!user ? (
          <LoginView onLoginSuccess={() => {}} />
        ) : (
          <>
            {activeTab === 'doctor' && (
              <DoctorView
                currentStep={roleState.step}
                setCurrentStep={setCurrentStep}
                completedSteps={roleState.completed}
                setCompletedSteps={setCompletedSteps}
              />
            )}
            {activeTab === 'admin' && (
              <AdminView
                currentStep={roleState.step}
                setCurrentStep={setCurrentStep}
                completedSteps={roleState.completed}
                setCompletedSteps={setCompletedSteps}
              />
            )}
            {activeTab === 'researcher' && (
              <CoordinatorView
                currentStep={roleState.step}
                setCurrentStep={setCurrentStep}
                completedSteps={roleState.completed}
                setCompletedSteps={setCompletedSteps}
              />
            )}
            {activeTab === 'governance' && <GovernanceView />}
            {activeTab === 'topology' && <TopologyView />}
          </>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
