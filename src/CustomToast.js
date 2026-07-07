import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';

let toastRef;

export const ToastConfig = {
  setRef: (ref) => {
    toastRef = ref;
  },
  show: (options) => {
    if (toastRef) toastRef.show(options);
  },
};

const ToastComponent = forwardRef((props, ref) => {
  const [toast, setToast] = useState(null);

  useImperativeHandle(ref, () => ({
    show: (options) => {
      setToast(options);
      setTimeout(() => {
        setToast((prev) => {
          
          
          return null;
        });
      }, 3500);
    },
  }));

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.title + toast.message}
          initial={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -20, scale: 0.9, x: '-50%' }}
          className="custom-toast"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            padding: '16px 24px',
            borderRadius: '16px',
            minWidth: '300px',
            maxWidth: '90vw',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {toast.type === 'success' && <FiCheckCircle color="#10B981" size={24} style={{ marginRight: 16 }} />}
          {toast.type === 'error' && <FiXCircle color="#EF4444" size={24} style={{ marginRight: 16 }} />}
          {(!toast.type || toast.type === 'info') && <FiInfo color="#3B82F6" size={24} style={{ marginRight: 16 }} />}
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{toast.title}</span>
            {toast.message && <span className="custom-toast-message" style={{ fontSize: 13, marginTop: 4 }}>{toast.message}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const CustomToast = () => {
  return <ToastComponent ref={(ref) => ToastConfig.setRef(ref)} />;
};
