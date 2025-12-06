UPDATE users SET password_hash = '$2a$10$tOgrAx2ExM6YqhFTQ.HF0OVqLrnO5bekxojIcbKELvWdx1Nfz.9s.' WHERE email = 'admin@example.com';
SELECT email, password_hash FROM users WHERE email = 'admin@example.com';
