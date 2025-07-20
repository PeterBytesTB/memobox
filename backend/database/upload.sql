CREATE DATABASE memobox;

USE memobox;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255)
);

CREATE TABLE uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  filename VARCHAR(255),
  originalname VARCHAR(255),
  mimetype VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
