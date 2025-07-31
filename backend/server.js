import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import uploadRoutes from "./uploadRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];

const app = express();
app.use(express.json());
app.use(uploadRoutes);

// Configura CORS no Express
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS não permitido"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
  })
);

// Cria pool de conexões para MySQL com mysql2/promise
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/"/g, ""),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const PORT = process.env.PORT || 8080;

// Middleware de log
app.use((req, res, next) => {
  console.log(`🟡 ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

const server = http.createServer(app);

// Configura Socket.IO com CORS liberado para os mesmos origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Pasta para salvar fotos de perfil
const perfilDir = path.join(__dirname, "uploads", "perfis");
if (!fs.existsSync(perfilDir)) {
  fs.mkdirSync(perfilDir, { recursive: true });
}

// Multer padrão para arquivos gerais
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const nomeOriginal = path.basename(file.originalname);
    const nomeSanitizado = nomeOriginal.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const nomeUnico = Date.now() + "-" + nomeSanitizado;
    cb(null, nomeUnico);
  },
});
const upload = multer({ storage });

// Multer para upload de foto de perfil, com filtro para imagens JPEG/PNG
const storagePerfil = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, perfilDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `perfil_${req.user.id}${ext}`);
  },
});
const uploadPerfil = multer({
  storage: storagePerfil,
  fileFilter: (req, file, cb) => {
    const tiposAceitos = /jpeg|jpg|png/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (tiposAceitos.test(ext) && tiposAceitos.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Somente imagens JPEG ou PNG são permitidas"));
    }
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Novo cliente conectado:", socket.id);

  socket.on("mensagem", (data) => {
    console.log("📨 Mensagem recebida:", data);
    // Reenvia para todos os outros clientes
    socket.broadcast.emit("mensagem", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// Middleware de autenticação JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// Upload protegido dos arquivos
app.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const { filename, mimetype, path: filepath } = req.file;
    const usuarioId = req.user.id;

    const query = `
    INSERT INTO arquivos (nome, caminho, tipo, usuario_id)
    VALUES (?, ?, ?, ?)
  `;

    try {
      await pool.query(query, [filename, filepath, mimetype, usuarioId]);
      res.json({ message: "Upload feito com sucesso!", file: req.file });
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
      res.status(500).json({ error: "Erro ao salvar no banco" });
    }
  }
);

// Upload protegido de foto de perfil
app.post(
  "/upload-foto-perfil",
  authenticateToken,
  uploadPerfil.single("foto"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma foto enviada" });
    }

    const usuarioId = req.user.id;
    const caminhoRelativo = `/uploads/perfis/${req.file.filename}`;

    const query = "UPDATE users SET foto_perfil = ? WHERE id = ?";

    try {
      await pool.query(query, [caminhoRelativo, usuarioId]);
      res.json({
        message: "Foto de perfil enviada com sucesso",
        foto: caminhoRelativo,
      });
    } catch (err) {
      console.error("Erro ao salvar caminho da foto:", err);
      res.status(500).json({ error: "Erro ao salvar foto de perfil" });
    }
  }
);

// Registro de usuário
app.post("/register", async (req, res) => {
  const { email, username, senha } = req.body;

  if (!email || !username || !senha) {
    return res
      .status(400)
      .json({ error: "Email, username e senha são obrigatórios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const query =
      "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)";
    await pool.query(query, [email, username, hashedPassword]);

    res.json({ message: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    console.error("Erro ao inserir no banco de dados:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email ou username já cadastrado" });
    }
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios" });
    }

    // Busca usuário pelo email na tabela users
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const user = rows[0];

    // Compara senha com o hash no banco
    const senhaValida = await bcrypt.compare(senha, user.password_hash);

    if (!senhaValida) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Gera token JWT com id, email e username
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Retorna token e dados do usuário
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erro na rota /api/login:", error.stack || error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// Listar arquivos do usuário
app.get("/meus-arquivos", authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const query = `
      SELECT id, nome, caminho, tipo, data_upload 
      FROM arquivos 
      WHERE usuario_id = ? 
      ORDER BY data_upload DESC
    `;
    const [results] = await pool.query(query, [usuarioId]);
    res.json(results);
  } catch (err) {
    console.error("Erro ao buscar arquivos:", err);
    res.status(500).json({ error: "Erro ao buscar arquivos." });
  }
});

// Excluir arquivo pelo ID
app.delete("/arquivo/:id", authenticateToken, (req, res) => {
  const usuarioId = req.user.id;
  const arquivoId = req.params.id;

  // Verifica se o arquivo pertence ao usuário
  const selectQuery =
    "SELECT caminho FROM arquivos WHERE id = ? AND usuario_id = ?";
  db.query(selectQuery, [arquivoId, usuarioId], (err, results) => {
    if (err) {
      console.error("Erro ao consultar arquivo:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Arquivo não encontrado ou não autorizado" });
    }

    const caminhoArquivo = results[0].caminho;

    // Remove arquivo do disco
    fs.unlink(caminhoArquivo, (fsErr) => {
      if (fsErr) {
        console.error("Erro ao deletar arquivo do disco:", fsErr);
        // Continuar para não deixar dados inconsistentes
      }

      // Remove registro do banco
      const deleteQuery =
        "DELETE FROM arquivos WHERE id = ? AND usuario_id = ?";
      db.query(deleteQuery, [arquivoId, usuarioId], (delErr) => {
        if (delErr) {
          console.error("Erro ao deletar arquivo do banco:", delErr);
          return res.status(500).json({ error: "Erro ao excluir arquivo" });
        }
        res.json({ message: "Arquivo excluído com sucesso" });
      });
    });
  });
});

app.get("/dados-usuario", authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(400).json({ error: "Usuário inválido" });
    }

    console.log("Buscando dados do usuário com id:", usuarioId);

    const [results] = await pool.query(
      "SELECT email, profile_picture_url FROM users WHERE id = ? LIMIT 1",
      [usuarioId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(results[0]);
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

// Inicialização do servidor
server.listen(process.env.PORT || 8080, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT || 8080}`);
});
