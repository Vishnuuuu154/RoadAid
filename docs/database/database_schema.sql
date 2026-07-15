CREATE DATABASE IF NOT EXISTS roadaid;
USE roadaid;

-- ===========================================
-- Table: users
-- ===========================================

CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,

                       full_name VARCHAR(100) NOT NULL,

                       email VARCHAR(100) NOT NULL UNIQUE,

                       phone VARCHAR(15) NOT NULL UNIQUE,

                       password VARCHAR(255) NOT NULL,

                       role VARCHAR(30) NOT NULL,

                       profile_image VARCHAR(255),

                       is_active BOOLEAN NOT NULL DEFAULT TRUE,

                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP
);
-- ===========================================
-- Table: service_providers
-- ===========================================

CREATE TABLE service_providers (
                                   id INT AUTO_INCREMENT PRIMARY KEY,

                                   user_id INT NOT NULL UNIQUE,

                                   experience_years INT NOT NULL,

                                   verification_status VARCHAR(20) NOT NULL,

                                   average_rating DECIMAL(3,2) DEFAULT 0.00,

                                   total_reviews INT DEFAULT 0,

                                   completed_jobs INT DEFAULT 0,

                                   online_status VARCHAR(20) DEFAULT 'OFFLINE',

                                   bio TEXT,

                                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

                                   CONSTRAINT fk_provider_user
                                       FOREIGN KEY (user_id)
                                           REFERENCES users(id)
                                           ON DELETE CASCADE
);

-- ===========================================
-- Table: workshops
-- ===========================================

CREATE TABLE workshops (
                           id INT AUTO_INCREMENT PRIMARY KEY,

                           provider_id INT NOT NULL UNIQUE,

                           workshop_name VARCHAR(100) NOT NULL,

                           address TEXT NOT NULL,

                           latitude DECIMAL(10,8) NOT NULL,

                           longitude DECIMAL(11,8) NOT NULL,

                           opening_time TIME NOT NULL,

                           closing_time TIME NOT NULL,

                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

                           CONSTRAINT fk_workshop_provider
                               FOREIGN KEY (provider_id)
                                   REFERENCES service_providers(id)
                                   ON DELETE CASCADE
);
-- ===========================================
-- Table: provider_services
-- ===========================================

CREATE TABLE provider_services (
                                   id INT AUTO_INCREMENT PRIMARY KEY,

                                   provider_id INT NOT NULL,

                                   service_name VARCHAR(30) NOT NULL,

                                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                   CONSTRAINT fk_provider_services_provider
                                       FOREIGN KEY (provider_id)
                                           REFERENCES service_providers(id)
                                           ON DELETE CASCADE,

                                   CONSTRAINT uk_provider_service
                                       UNIQUE (provider_id, service_name)
);
-- ===========================================
-- Table: vehicles
-- ===========================================

CREATE TABLE vehicles (
                          id INT AUTO_INCREMENT PRIMARY KEY,

                          user_id INT NOT NULL,

                          vehicle_type VARCHAR(30) NOT NULL,

                          brand VARCHAR(50) NOT NULL,

                          model VARCHAR(50) NOT NULL,

                          registration_number VARCHAR(20) NOT NULL UNIQUE,

                          fuel_type VARCHAR(20) NOT NULL,

                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_vehicle_user
                              FOREIGN KEY (user_id)
                                  REFERENCES users(id)
                                  ON DELETE CASCADE
);
-- ===========================================
-- Table: service_requests
-- ===========================================

CREATE TABLE service_requests (
                                  id INT AUTO_INCREMENT PRIMARY KEY,

                                  user_id INT NOT NULL,

                                  provider_id INT NOT NULL,

                                  vehicle_id INT NOT NULL,

                                  service_type VARCHAR(30) NOT NULL,

                                  request_type VARCHAR(20) NOT NULL,

                                  problem_description TEXT NOT NULL,

                                  latitude DECIMAL(10,8) NOT NULL,

                                  longitude DECIMAL(11,8) NOT NULL,

                                  status VARCHAR(30) NOT NULL,

                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

                                  CONSTRAINT fk_request_user
                                      FOREIGN KEY (user_id)
                                          REFERENCES users(id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT fk_request_provider
                                      FOREIGN KEY (provider_id)
                                          REFERENCES service_providers(id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT fk_request_vehicle
                                      FOREIGN KEY (vehicle_id)
                                          REFERENCES vehicles(id)
                                          ON DELETE CASCADE
);

-- ===========================================
-- Table: quotations
-- ===========================================

CREATE TABLE quotations (
                            id INT AUTO_INCREMENT PRIMARY KEY,

                            request_id INT NOT NULL UNIQUE,

                            labour_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,

                            parts_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,

                            travel_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

                            platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

                            total_amount DECIMAL(10,2) NOT NULL,

                            status VARCHAR(30) NOT NULL,

                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

                            CONSTRAINT fk_quotation_request
                                FOREIGN KEY (request_id)
                                    REFERENCES service_requests(id)
                                    ON DELETE CASCADE
);
-- ===========================================
-- Table: payments
-- ===========================================

CREATE TABLE payments (
                          id INT AUTO_INCREMENT PRIMARY KEY,

                          quotation_id INT NOT NULL UNIQUE,

                          amount DECIMAL(10,2) NOT NULL,

                          tip_amount DECIMAL(10,2) DEFAULT 0.00,

                          payment_method VARCHAR(30) NOT NULL,

                          payment_status VARCHAR(30) NOT NULL,

                          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_payment_quotation
                              FOREIGN KEY (quotation_id)
                                  REFERENCES quotations(id)
                                  ON DELETE CASCADE
);

-- ===========================================
-- Table: reviews
-- ===========================================

CREATE TABLE reviews (
                         id INT AUTO_INCREMENT PRIMARY KEY,

                         request_id INT NOT NULL UNIQUE,

                         user_id INT NOT NULL,

                         provider_id INT NOT NULL,

                         rating INT NOT NULL,

                         review TEXT,

                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT fk_review_request
                             FOREIGN KEY (request_id)
                                 REFERENCES service_requests(id)
                                 ON DELETE CASCADE,

                         CONSTRAINT fk_review_user
                             FOREIGN KEY (user_id)
                                 REFERENCES users(id)
                                 ON DELETE CASCADE,

                         CONSTRAINT fk_review_provider
                             FOREIGN KEY (provider_id)
                                 REFERENCES service_providers(id)
                                 ON DELETE CASCADE,

                         CONSTRAINT chk_rating
                             CHECK (rating BETWEEN 1 AND 5)
);
-- ===========================================
-- Table: complaints
-- ===========================================

CREATE TABLE complaints (
                            id INT AUTO_INCREMENT PRIMARY KEY,

                            request_id INT NOT NULL,

                            user_id INT NOT NULL,

                            complaint_type VARCHAR(50) NOT NULL,

                            description TEXT NOT NULL,

                            status VARCHAR(30) NOT NULL,

                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_complaint_request
                                FOREIGN KEY (request_id)
                                    REFERENCES service_requests(id)
                                    ON DELETE CASCADE,

                            CONSTRAINT fk_complaint_user
                                FOREIGN KEY (user_id)
                                    REFERENCES users(id)
                                    ON DELETE CASCADE
);
-- ===========================================
-- Table: notifications
-- ===========================================

CREATE TABLE notifications (
                               id INT AUTO_INCREMENT PRIMARY KEY,

                               user_id INT NOT NULL,

                               title VARCHAR(100) NOT NULL,

                               message TEXT NOT NULL,

                               is_read BOOLEAN DEFAULT FALSE,

                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT fk_notification_user
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(id)
                                       ON DELETE CASCADE
);
-- ===========================================
-- Table: favorites
-- ===========================================

CREATE TABLE favorites (

                           user_id INT NOT NULL,

                           provider_id INT NOT NULL,

                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                           PRIMARY KEY (user_id, provider_id),

                           CONSTRAINT fk_favorite_user
                               FOREIGN KEY (user_id)
                                   REFERENCES users(id)
                                   ON DELETE CASCADE,

                           CONSTRAINT fk_favorite_provider
                               FOREIGN KEY (provider_id)
                                   REFERENCES service_providers(id)
                                   ON DELETE CASCADE
);
-- ===========================================
-- Table: system_logs
-- ===========================================

CREATE TABLE system_logs (
                             id INT AUTO_INCREMENT PRIMARY KEY,

                             user_id INT NOT NULL,

                             action VARCHAR(255) NOT NULL,

                             timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                             CONSTRAINT fk_log_user
                                 FOREIGN KEY (user_id)
                                     REFERENCES users(id)
                                     ON DELETE CASCADE
);
-- ===========================================
-- Table: request_status_history
-- ===========================================

CREATE TABLE request_status_history (
                                        id INT AUTO_INCREMENT PRIMARY KEY,

                                        request_id INT NOT NULL,

                                        status VARCHAR(30) NOT NULL,

                                        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                        CONSTRAINT fk_history_request
                                            FOREIGN KEY (request_id)
                                                REFERENCES service_requests(id)
                                                ON DELETE CASCADE
);