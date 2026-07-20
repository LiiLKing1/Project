import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, X, Box, BarChart2, Briefcase, Truck, HeartHandshake, FileText, Activity } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query } from '../services/firebaseMock';
import { useNavigate, NavLink } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useWarehouse } from '../context/WarehouseContext';
import { formatCurrency } from '../utils/formatters';
import { AnimatePresence, motion } from 'framer-motion';
import './layout.css';

const Topbar = () => {
  const { userProfile } = useRoles();
  const [storeName, setStoreName] = useState(userProfile?.storeName || "Asosiy Filial");
  const [isTopDrawerOpen, setIsTopDrawerOpen] = useState(false);
  const navigate = useNavigate();
  
  const additionalLinks = [
    { path: '/products/inventory', label: 'Omborxona', icon: <Box size={20} /> },
    { path: '/reports', label: 'Hisobotlar', icon: <BarChart2 size={20} /> },
    { path: '/finance', label: 'Moliya', icon: <Activity size={20} /> },
    { path: '/management', label: 'Xodimlar', icon: <Briefcase size={20} /> },
    { path: '/orders', label: 'Buyurtmalar', icon: <Truck size={20} /> },
    { path: '/partners', label: 'Hamkorlar', icon: <HeartHandshake size={20} /> },
    { path: '/marketing', label: 'Marketing', icon: <FileText size={20} /> },
  ];

  return (
    <>
      <header className="mobile-topbar flex justify-between items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            S
          </div>
          <div className="font-semibold text-gray-800">{storeName}</div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-gray-600">
            <Bell size={24} />
          </button>
          <button 
            className="text-gray-600"
            onClick={() => setIsTopDrawerOpen(!isTopDrawerOpen)}
          >
            {isTopDrawerOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Top Drawer */}
      <AnimatePresence>
        {isTopDrawerOpen && (
          <motion.div 
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 top-[60px] bg-white shadow-xl z-30 flex flex-col max-h-[80vh] overflow-y-auto border-b border-gray-200"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Qo'shimcha bo'limlar</div>
              {additionalLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsTopDrawerOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`
                  }
                >
                  {link.icon}
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay for Drawer */}
      <AnimatePresence>
        {isTopDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTopDrawerOpen(false)}
            className="fixed inset-0 bg-black/30 z-20"
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Topbar;
