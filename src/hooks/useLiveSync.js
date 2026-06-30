import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Dispatches a typed CustomEvent on window so any component can listen
 * without prop-drilling or re-render cascades from App.js.
 *
 * @param {string} type  - e.g. 'live_db_update', 'grade_update', etc.
 * @param {*}      data  - optional payload from the socket event
 */
const dispatchLiveEvent = (type, data) => {
  window.dispatchEvent(new CustomEvent('myportal_live_update', { detail: { type, data } }));
};

const useLiveSync = (onUpdateCallback, onAccountDeletedCallback, userId) => {
  useEffect(() => {
    if (!userId) return; 

    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'], 
    });

    socket.on('connect', () => {
      console.log('🟢 Connected to Live Data Sync WebSockets');
      socket.emit('join_room', userId); 
      
      const token = localStorage.getItem('token');
      if (token) {
        const signature = token.split('.')[2];
        if (signature) {
          socket.emit('join_session', signature);
        }
      }
    });

    socket.on('session_revoked', (data) => {
      console.warn("🛡️ Session revoked remotely:", data?.message);
      window.dispatchEvent(new CustomEvent('security_logout', { detail: data?.message || 'Session revoked remotely.' }));
    });

    socket.on('live_db_update', () => {
      console.log('🔄 Live Update Detected! Refreshing data silently...');
      // Notify App.js for full dashboard refresh
      if (onUpdateCallback) onUpdateCallback('live_db_update');
      // Notify individual components directly via CustomEvent
      dispatchLiveEvent('live_db_update');
    });

    // Granular portal-data events — notify components directly without
    // triggering a full dashboard reload in App.js
    socket.on('grade_update', (data) => {
      console.log('📊 Grade update received');
      dispatchLiveEvent('grade_update', data);
    });

    socket.on('attendance_update', (data) => {
      console.log('📋 Attendance update received');
      dispatchLiveEvent('attendance_update', data);
    });

    socket.on('submission_update', (data) => {
      console.log('📄 Submission update received');
      dispatchLiveEvent('submission_update', data);
    });

    socket.on('announcement_update', (data) => {
      console.log('📢 Announcement update received');
      dispatchLiveEvent('announcement_update', data);
    });

    socket.on('account_deleted', () => {
      console.log('🔴 Account deleted by admin. Logging out...');
      if (onAccountDeletedCallback) onAccountDeletedCallback();
    });

    socket.on('account_blocked', () => {
      console.log('🔴 Account blocked by admin. Logging out...');
      if (onAccountDeletedCallback) onAccountDeletedCallback();
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