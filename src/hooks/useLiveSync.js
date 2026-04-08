import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const useLiveSync = (onUpdateCallback) => {
  useEffect(() => {
    // 1. Establish connection to the backend
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'], 
    });

    socket.on('connect', () => {
      console.log('🟢 Connected to Live Data Sync WebSockets');
    });

    // 2. Listen for the exact event emitted by your backend's Change Streams
    socket.on('live_db_update', () => {
      console.log('🔄 Live Update Detected! Refreshing data silently...');
      if (onUpdateCallback) {
        onUpdateCallback();
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from Live Data Sync');
    });

    // Cleanup connection when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [onUpdateCallback]); // Re-run if the callback changes
};

export default useLiveSync;