CREATE DATABASE CoD_db;
USE CoD_db;

CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_name VARCHAR(150) NOT NULL,
  size VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  rating VARCHAR(30) NOT NULL
);

INSERT INTO games (game_name, size, category, rating) VALUES
('Call of Duty: Modern Warfare II (2022)', '125 GB', 'Modern Warfare', 'Mostly Positive'),
('Call of Duty: Modern Warfare (2019)', '149 GB', 'Modern Warfare', 'Very Positive'),
('Call of Duty: Black Ops Cold War', '175 GB', 'Black Ops', 'Mostly Positive'),
('Call of Duty: Modern Warfare IV (2026)', '100 GB', 'Modern Warfare', 'Mostly Positive'),
('Call of Duty: WWII', '90 GB', 'WWII', 'Mostly Positive'),
('Call of Duty: Ghosts', '40 GB', 'Ghosts', 'Mostly Positive');

SELECT * FROM games;