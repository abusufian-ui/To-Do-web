import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const useLiveSync = (onUpdateCallback, onAccountDeletedCallback, userId) => {
  useEffect(() => {
    if (!userId) return; 

    
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'], 
    });

    socket.on('connect', () => {
      console.log('🟢 Connected to Live Data Sync WebSockets');
      socket.emit('join_room', userId); 
    });

    
    socket.on('live_db_update', () => {
      console.log('🔄 Live Update Detected! Refreshing data silently...');
      if (onUpdateCallback) {
        onUpdateCallback();
      }
    });

    socket.on('account_deleted', () => {
      console.log('🔴 Account deleted by admin. Logging out...');
      if (onAccountDeletedCallback) {
        onAccountDeletedCallback();
      }
    });

    socket.on('account_blocked', () => {
      console.log('🔴 Account blocked by admin. Logging out...');
      if (onAccountDeletedCallback) {
        onAccountDeletedCallback();
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from Live Data Sync');
    });

    
    return () => {
      socket.disconnect();
    };
  }, [onUpdateCallback, onAccountDeletedCallback, userId]); 
};

export default useLiveSync;