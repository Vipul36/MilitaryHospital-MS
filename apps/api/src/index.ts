import app from './app';
import dotenv from 'dotenv';
import http from 'http';
import { wsService } from './services/websocket.service';

dotenv.config();

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

wsService.init(server);

server.listen(PORT, () => {
  console.log(`[MHSHMS API Server] Running on http://localhost:${PORT}`);
});
