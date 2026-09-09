import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchIdState] = useState(() => {
    try {
      return localStorage.getItem('titan_selected_branch_id') || 'all';
    } catch {
      return 'all';
    }
  });

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/branches');
      const data = Array.isArray(res.data) ? res.data : [];
      setBranches(data);
    } catch (err) {
      console.error('[BranchContext] Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const setSelectedBranchId = (branchId) => {
    setSelectedBranchIdState(branchId);
    try {
      localStorage.setItem('titan_selected_branch_id', branchId);
    } catch (e) {
      console.warn('Could not save selected branch to localStorage:', e);
    }
  };

  const selectedBranch = branches.find(b => b.branch_id === selectedBranchId) || null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        selectedBranch,
        setSelectedBranchId,
        refreshBranches: fetchBranches,
        loading
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
