const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Хранилище данных в памяти
const players = new Map();
const rooms = new Map();
const matchmakingQueue = [];
const serverStats = {
  totalGames: 0,
  totalCommission: 0,
  peakOnline: 0,
  startupTime: Date.now(),
};

// 🎯 УМНАЯ СИСТЕМА ШАНСОВ ДЛЯ МУЛЬТИПЛЕЕРА (оставляем как есть)
const SmartMultiplayerSystem = {
  calculateWinProbability(playerId, betAmount) {
    const player = players.get(playerId);
    if (!player) return 0.5;

    const totalGames = player.wins + player.losses;
    const balanceRatio = player.balance / 1000;

    if (totalGames < 3) return 0.75;
    if (player.lossStreak >= 2) return 0.65;
    if (balanceRatio > 1.8) return 0.2;
    if (balanceRatio > 1.3) return 0.35;
    if (betAmount > 300) return 0.3;

    return 0.45;
  },
};

// === HEALTH / STATUS ===
app.get('/', (req, res) => {
  res.json({
    message: '🎰 Smart CoinFlip Casino Server - Render.com',
    status: 'online',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    online: players.size,
    rooms: rooms.size,
    queue: matchmakingQueue.length,
    totalGames: serverStats.totalGames,
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Smart Coinflip Casino Server is alive 🚀',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    players: players.size,
  });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'pong', ts: Date.now(), activePlayers: players.size });
});

app.get('/stats', (req, res) => {
  res.json({
    online: players.size,
    rooms: rooms.size,
    queue: matchmakingQueue.length,
    totalGames: serverStats.totalGames,
    totalCommission: serverStats.totalCommission,
    peakOnline: serverStats.peakOnline,
    uptime: Date.now() - serverStats.startupTime,
  });
});

// === WEB SOCKET СЕРВЕР ===
wss.on('connection', (ws, req) => {
  console.log(`🟢 Новое подключение ${req.url || ''}`);

  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('❌ Ошибка парсинга:', error);
      sendError(ws, 'Неверный формат сообщения');
    }
  });

  ws.on('close', () => {
    console.log('🔴 Отключение');
    handleDisconnect(ws);
  });

  ws.on('error', (err) => console.error('💥 WebSocket error:', err));
});

// Keep-alive WS
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// === ОБРАБОТЧИКИ СООБЩЕНИЙ ===
function handleMessage(ws, message) {
  switch (message.type) {
    case 'auth':
      return handleAuth(ws, message);
    case 'find_opponent':
      return handleFindOpponent(ws, message);
    case 'make_bet':
      return handleMakeBet(ws, message);
    case 'cancel_search':
      return handleCancelSearch(ws, message);
    case 'ping':
      return ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    default:
      return sendError(ws, 'Неизвестная команда: ' + message.type);
  }
}

function handleAuth(ws, message) {
  const { playerId, balance = 1000 } = message;
  if (!playerId) return sendError(ws, 'Отсутствует playerId');

  let player = players.get(playerId);
  if (!player) {
    player = {
      id: playerId,
      ws,
      balance,
      wins: 0,
      losses: 0,
      winStreak: 0,
      lossStreak: 0,
      roomId: null,
      connectedAt: Date.now(),
    };
    console.log(`🎁 НОВЫЙ ИГРОК: ${playerId} с балансом ${balance} ₽`);
  } else {
    player.ws = ws;
    player.balance = balance;
  }

  players.set(playerId, player);
  ws.playerId = playerId;

  if (players.size > serverStats.peakOnline) serverStats.peakOnline = players.size;

  ws.send(JSON.stringify({ type: 'auth_success', playerId, serverTime: Date.now() }));
  broadcastStats();
}

function handleFindOpponent(ws, message) {
  const player = players.get(ws.playerId);
  if (!player) return sendError(ws, 'Игрок не авторизован');

  const { betAmount } = message;
  if (betAmount < 10 || betAmount > 10000) return sendError(ws, 'Неверная сумма ставки (10-10000)');
  if (betAmount > player.balance) return sendError(ws, 'Недостаточно средств');

  player.betAmount = betAmount;

  const i = matchmakingQueue.findIndex(
    (p) => p.playerId !== player.playerId && p.betAmount === betAmount
  );
  if (i !== -1) {
    const opponent = matchmakingQueue[i];
    matchmakingQueue.splice(i, 1);
    createRoom(player, opponent);
  } else {
    if (!matchmakingQueue.some((p) => p.playerId === player.playerId)) matchmakingQueue.push(player);
    ws.send(JSON.stringify({ type: 'searching', queuePosition: matchmakingQueue.length, betAmount }));
  }
}

function createRoom(player1, player2) {
  const roomId = `room_${Date.now()}`;
  const room = {
    id: roomId,
    player1,
    player2,
    bets: {},
    state: 'betting',
    timer: 30,
    result: null,
    betAmount: player1.betAmount,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  player1.roomId = roomId;
  player2.roomId = roomId;

  const payload = { type: 'opponent_found', roomId, betAmount: player1.betAmount, timer: 30 };
  player1.ws?.send(JSON.stringify({ ...payload, opponent: { id: player2.id, balance: player2.balance } }));
  player2.ws?.send(JSON.stringify({ ...payload, opponent: { id: player1.id, balance: player1.balance } }));

  startBettingTimer(room);
}

function startBettingTimer(room) {
  room.timerInterval = setInterval(() => {
    room.timer--;
    broadcastToRoom(room.id, { type: 'timer_update', timer: room.timer });
    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      handleTimeOut(room);
    }
  }, 1000);
}

function handleMakeBet(ws, message) {
  const player = players.get(ws.playerId);
  if (!player || !player.roomId) return;

  const room = rooms.get(player.roomId);
  if (!room || room.state !== 'betting') return;

  const { bet } = message;
  if (bet !== 'heads' && bet !== 'tails') return sendError(ws, 'Неверная ставка (heads/tails)');

  room.bets[player.id] = bet;
  broadcastToRoom(room.id, { type: 'bet_made', playerId: player.id, bet });

  if (Object.keys(room.bets).length === 2) {
    clearInterval(room.timerInterval);
    startCoinFlip(room);
  }
}

function startCoinFlip(room) {
  room.state = 'flipping';
  const { player1, player2, bets, betAmount } = room;

  const targetPlayer = Math.random() > 0.5 ? player1 : player2;
  const otherPlayer = targetPlayer === player1 ? player2 : player1;

  const winProbability = SmartMultiplayerSystem.calculateWinProbability(targetPlayer.id, betAmount);
  const playerWins = Math.random() < winProbability;

  room.result = playerWins ? bets[targetPlayer.id] : bets[otherPlayer.id];
  room.winner = playerWins ? targetPlayer.id : otherPlayer.id;

  serverStats.totalGames++;
  broadcastToRoom(room.id, { type: 'coin_flip_start', result: room.result });
  setTimeout(() => finishGame(room), 3000);
}

function finishGame(room) {
  const { player1, player2, result, winner, betAmount } = room;
  const commission = Math.floor(betAmount * 0.1);
  const winAmount = betAmount * 2 - commission;

  serverStats.totalCommission += commission;

  if (winner) {
    const winnerPlayer = players.get(winner);
    const loserPlayer = players.get(winner === player1.id ? player2.id : player1.id);
    if (winnerPlayer) {
      winnerPlayer.balance += winAmount;
      winnerPlayer.wins++;
      winnerPlayer.winStreak++;
      winnerPlayer.lossStreak = 0;
    }
    if (loserPlayer) {
      loserPlayer.balance -= betAmount;
      loserPlayer.losses++;
      loserPlayer.lossStreak++;
      loserPlayer.winStreak = 0;
    }
  }

  broadcastToRoom(room.id, {
    type: 'game_result',
    result,
    winner,
    winAmount,
    commission,
    balances: { [player1.id]: player1.balance, [player2.id]: player2.balance },
  });

  setTimeout(() => cleanupRoom(room.id), 8000);
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    if (room.player1) room.player1.roomId = null;
    if (room.player2) room.player2.roomId = null;
    if (room.timerInterval) clearInterval(room.timerInterval);
    rooms.delete(roomId);
  }
}

function handleTimeOut(room) {
  // Если кто-то не сделал ставку — отменяем комнату
  broadcastToRoom(room.id, { type: 'timeout', message: 'Время на ставку истекло' });
  cleanupRoom(room.id);
}

function handleCancelSearch(ws) {
  const idx = matchmakingQueue.findIndex((p) => p.playerId === ws.playerId);
  if (idx !== -1) {
    matchmakingQueue.splice(idx, 1);
    ws.send(JSON.stringify({ type: 'search_canceled' }));
  }
}

function handleDisconnect(ws) {
  const playerId = ws.playerId;
  if (!playerId) return;

  const player = players.get(playerId);
  if (player) {
    const idx = matchmakingQueue.findIndex((p) => p.playerId === playerId);
    if (idx !== -1) matchmakingQueue.splice(idx, 1);

    if (player.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        const opponent = room.player1.id === playerId ? room.player2 : room.player1;
        opponent?.ws?.send(JSON.stringify({ type: 'opponent_disconnected', message: 'Соперник отключился' }));
        cleanupRoom(player.roomId);
      }
    }
    players.delete(playerId);
  }
  broadcastStats();
}

function broadcastToRoom(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  [room.player1, room.player2].forEach((player) => {
    if (player?.ws?.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

function broadcastStats() {
  const stats = {
    type: 'stats_update',
    online: players.size,
    rooms: rooms.size,
    queue: matchmakingQueue.length,
    peakOnline: serverStats.peakOnline,
    totalGames: serverStats.totalGames,
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(stats));
  });
}

function sendError(ws, message) {
  ws?.send(JSON.stringify({ type: 'error', message }));
}

// === ЗАПУСК СЕРВЕРА ДЛЯ RENDER.COM ===
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log('🚀 ===========================================');
  console.log('🎰 SMART COINFLIP CASINO SERVER ЗАПУЩЕН!');
  console.log('🌐 Хостинг: Render.com');
  console.log(`📡 Порт: ${PORT}`);
  console.log(`❤️  Health: https://coinflip-gzhel.onrender.com/health`);
  console.log(`🔄 Ping:   https://coinflip-gzhel.onrender.com/ping`);
  console.log('🎮 Ожидаем подключения игроков...');
  console.log('🚀 ===========================================');
});

// Авто-пинг для предотвращения сна (лог только для видимости)
setInterval(() => {
  console.log('🔄 Keep-alive tick for Render (14m)');
}, 14 * 60 * 1000);
