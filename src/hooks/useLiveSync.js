import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const useLiveSync = (onUpdateCallback, onAccountDeletedCallback, userId) => {
  useEffect(() => {
    if (!userId) return; // Wait until we have a userId

    // 1. Establish connection to the backend
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'], 
    });

    socket.on('connect', () => {
      console.log('🟢 Connected to Live Data Sync WebSockets');
      socket.emit('join_room', userId); // 🚀 Securely join personal data room
    });

    // 2. Listen for the exact event emitted by your backend's Change Streams
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

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from Live Data Sync');
    });

    // Cleanup connection when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [onUpdateCallback, onAccountDeletedCallback, userId]); // Re-run if the callback or userId changes
};

export default useLiveSync;