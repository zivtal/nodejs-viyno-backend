const fs = require("fs");
const express = require('express');
const expressSession = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('./middlewares/logger.middleware');
const config = require('./config');
const { SESSION_SECRET } = config;

const app = express();
const http = require('http').createServer(app);
const { PORT = 3030 } = process.env;
const IS_PROD = process.env.NODE_ENV === 'production';

// SERVER SETTINGS
const session = expressSession({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
});
app.use(express.json({ limit: '50mb' }));
app.use(session);
app.use(fileUpload({}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (IS_PROD) app.use(express.static('public'));
else {
  const corsOptions = {
    origin: [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3030',
      'http://localhost:3030',
    ],
    credentials: true,
  };
  app.use(cors(corsOptions));
}

// SET ROUTES
const authRoutes = require('./api/auth/auth.route');
const userRoutes = require('./api/user/user.route');
const wineRoutes = require('./api/wine/wine.route');
const wineryRoutes = require('./api/winery/winery.route');
const postRoutes = require('./api/post/post.route');
const uploadRoutes = require('./api/upload/upload.route');
const { connectSockets } = require('./service/socket.service');

const setupAsyncLocalStorage = require('./middlewares/als.middleware');
app.all('*', setupAsyncLocalStorage);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wine', wineRoutes);
app.use('/api/winery', wineryRoutes);
app.use('/api/post', postRoutes);
app.use('/api/upload', uploadRoutes);
connectSockets(http, session);

app.get('/**', async (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath);
});

// START SERVER
http.listen(PORT, () =>
  logger.info(
    'Server is running',
    IS_PROD ? 'Production mode' : 'Development mode',
    `Address: http://localhost:${PORT}`
  )
);
