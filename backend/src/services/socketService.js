const jwt = require('jsonwebtoken');

let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  // JWT authentication for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User ${socket.userId} connected (${socket.id})`);

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Join a conversation room for targeted updates
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${socket.userId} disconnected`);
    });
  });
};

// Emit to a specific conversation room
const emitToConversation = (conversationId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`conv:${conversationId}`).emit(event, data);
  }
};

// Broadcast to all connected users
const broadcast = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = { initSocket, emitToConversation, broadcast };
