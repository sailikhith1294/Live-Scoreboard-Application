import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: false,
});

socket.onLiveUpdate = (callback) => socket.on('match:global_update', callback);
socket.offLiveUpdate = (callback) => socket.off('match:global_update', callback);
socket.joinMatch = (matchId) => socket.emit('match:join', matchId);
socket.leaveMatch = (matchId) => socket.emit('match:leave', matchId);

// Organizer events
socket.joinOrganizer = (userId) => socket.emit('organizer:join', userId);
socket.leaveOrganizer = (userId) => socket.emit('organizer:leave', userId);
socket.onOrganizerUpdate = (callback) => socket.on('organizer:update', callback);
socket.offOrganizerUpdate = (callback) => socket.off('organizer:update', callback);

// Admin events
socket.joinAdmin = () => socket.emit('admin:join');
socket.leaveAdmin = () => socket.emit('admin:leave');
socket.onAdminUpdate = (callback) => socket.on('admin:update', callback);
socket.offAdminUpdate = (callback) => socket.off('admin:update', callback);

// Umpire events
socket.joinUmpire = (userId) => socket.emit('umpire:join', userId);
socket.leaveUmpire = (userId) => socket.emit('umpire:leave', userId);

// Player events
socket.joinPlayer = (userId) => socket.emit('player:join', userId);
socket.leavePlayer = (userId) => socket.emit('player:leave', userId);

export default socket;
