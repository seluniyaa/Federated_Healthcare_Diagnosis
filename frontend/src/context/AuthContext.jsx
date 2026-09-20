import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Initialize without auto-login so user lands on the secure login screen
  useEffect(() => {
    // Session state can be loaded from localStorage if needed
  }, []);

  const loginUser = async (email, password, hospital_node = 'metro_general') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, hospital_node })
      });
      if (!res.ok) {
        throw new Error('Authentication failed');
      }
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const switchRole = (newRole, node = 'metro_general') => {
    const hospitalNames = {
      'metro_general': 'Metro General Hospital',
      'st_jude': 'St. Jude Medical Center',
      'city_health': 'City Health Institute',
      'university_research': 'University Research Hospital',
      'all': 'Global Consortium'
    };

    const physicianNames = {
      'metro_general': 'Dr. Sarah Jenkins',
      'st_jude': 'Dr. Michael Vance',
      'city_health': 'Dr. David Ross',
      'university_research': 'Dr. Marcus Brody'
    };

    if (newRole === 'doctor') {
      setUser({
        email: `doctor@${node}.org`,
        full_name: physicianNames[node] || 'Attending Physician',
        role: 'doctor',
        hospital_node: node,
        hospital_name: hospitalNames[node] || 'Local Hospital'
      });
      setToken(`demo-token-doctor-${node}`);
    } else if (newRole === 'admin') {
      setUser({
        email: `admin@${node}.org`,
        full_name: `Admin (${hospitalNames[node] || node})`,
        role: 'admin',
        hospital_node: node,
        hospital_name: hospitalNames[node] || 'Local Hospital'
      });
      setToken(`demo-token-admin-${node}`);
    } else if (newRole === 'researcher') {
      setUser({
        email: 'coordinator@research.org',
        full_name: 'Dr. Elena Rostova',
        role: 'researcher',
        hospital_node: 'all',
        hospital_name: 'Consortium Governance Hub'
      });
      setToken('demo-token-coordinator');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loginUser, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
