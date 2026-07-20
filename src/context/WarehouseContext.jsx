import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from '../services/firebaseMock';
import { useRoles } from './RolesContext';

const WarehouseContext = createContext();

export const useWarehouse = () => {
  return useContext(WarehouseContext);
};

export const WarehouseProvider = ({ children }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) {
      setLoadingWarehouses(false);
      return;
    }

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/warehouses`), orderBy('createdAt', 'asc')), (snap) => {
      const wList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWarehouses(wList);
      
      if (wList.length > 0) {
        // Automatically select the first one if none selected or if current selection is invalid
        if (!selectedWarehouseId || !wList.find(w => w.id === selectedWarehouseId)) {
          setSelectedWarehouseId(wList[0].id);
        }
      }
      setLoadingWarehouses(false);
    });

    return () => unsub();
  }, [storeId, selectedWarehouseId]);

  const value = {
    warehouses,
    selectedWarehouseId,
    setSelectedWarehouseId,
    loadingWarehouses,
    activeWarehouse: warehouses.find(w => w.id === selectedWarehouseId) || null
  };

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
};
