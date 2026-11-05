-- Jalankan SEKALI di VM 2 (MySQL).
CREATE DATABASE IF NOT EXISTS CoD_db CHARACTER SET utf8mb4;
USE CoD_db;

CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_name VARCHAR(150) NOT NULL,
  size VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  rating VARCHAR(30) NOT NULL,
  image_url VARCHAR(500) NULL,
  seller_name VARCHAR(100) NULL,
  submission_id CHAR(36) NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'local',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_submission (submission_id)
);

INSERT INTO games (game_name, size, category, rating) VALUES
('Call of Duty: Modern Warfare II (2022)', '125 GB', 'Modern Warfare', 'Mostly Positive'),
('Call of Duty: Modern Warfare (2019)', '149 GB', 'Modern Warfare', 'Very Positive'),
('Call of Duty: Black Ops Cold War', '175 GB', 'Black Ops', 'Mostly Positive'),
('Call of Duty: Modern Warfare IV (2026)', '100 GB', 'Modern Warfare', 'Mostly Positive'),
('Call of Duty: WWII', '90 GB', 'WWII', 'Mostly Positive'),
('Call of Duty: Ghosts', '40 GB', 'Ghosts', 'Mostly Positive');
