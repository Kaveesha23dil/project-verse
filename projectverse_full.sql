-- =====================================================================
--  ProjectVerse — complete database (schema + seed + expanded dataset)
--  Sri Lanka Technology Campus · CCS3361
--
--  This single file contains all three parts in the correct order.
--  Load with:  mysql -u root -p < projectverse_full.sql
--
--  Every demo account uses the password:  Password123!
-- =====================================================================

-- =====================================================================
--  ProjectVerse — University Research & Innovation Marketplace
--  Database: MySQL 5.7+ / 8.0 (also loads on MariaDB 10.4+)
--  File 01 of 03 : schema (DDL)
-- =====================================================================

DROP DATABASE IF EXISTS projectverse;
CREATE DATABASE projectverse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE projectverse;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
--  SECTION 1 — IDENTITY, ROLES, ORGANISATIONS
-- =====================================================================

CREATE TABLE roles (
  id              TINYINT UNSIGNED PRIMARY KEY,
  code            VARCHAR(20)  NOT NULL UNIQUE,   -- student, researcher, university, business, investor, admin
  name            VARCHAR(60)  NOT NULL,
  description     VARCHAR(255) NULL,
  dashboard_route VARCHAR(80)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE universities (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  short_name   VARCHAR(30)  NULL,
  country      VARCHAR(80)  NOT NULL DEFAULT 'Sri Lanka',
  city         VARCHAR(80)  NULL,
  website      VARCHAR(255) NULL,
  logo_url     VARCHAR(500) NULL,
  email_domain VARCHAR(120) NULL,               -- used to auto-suggest affiliation, e.g. sltc.ac.lk
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_university_name (name),
  KEY ix_university_domain (email_domain)
) ENGINE=InnoDB;

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36)     NOT NULL UNIQUE,
  role_id         TINYINT UNSIGNED NOT NULL,
  university_id   INT UNSIGNED NULL,             -- affiliation (students, researchers, university staff)
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  phone           VARCHAR(30)  NULL,
  headline        VARCHAR(160) NULL,
  bio             TEXT         NULL,
  avatar_url      VARCHAR(500) NULL,
  country         VARCHAR(80)  NULL,
  city            VARCHAR(80)  NULL,
  linkedin_url    VARCHAR(255) NULL,
  website_url     VARCHAR(255) NULL,
  account_status  ENUM('pending','active','suspended','deactivated') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME   NULL,
  -- university verification (universities verify their own students/researchers)
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  verified_by_user_id BIGINT UNSIGNED NULL,
  verified_at     DATETIME     NULL,
  last_login_at   DATETIME     NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME     NULL,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role (role_id),
  KEY ix_users_university (university_id),
  KEY ix_users_status (account_status),
  CONSTRAINT fk_users_role       FOREIGN KEY (role_id)       REFERENCES roles(id),
  CONSTRAINT fk_users_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_verifier   FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---- role-specific profile extensions -------------------------------

CREATE TABLE student_profiles (
  user_id         BIGINT UNSIGNED PRIMARY KEY,
  student_number  VARCHAR(40)  NULL,
  faculty         VARCHAR(120) NULL,
  degree_program  VARCHAR(160) NULL,
  year_of_study   TINYINT UNSIGNED NULL,
  graduation_year SMALLINT UNSIGNED NULL,
  supervisor_name VARCHAR(120) NULL,
  CONSTRAINT fk_student_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE researcher_profiles (
  user_id        BIGINT UNSIGNED PRIMARY KEY,
  designation    VARCHAR(120) NULL,
  department     VARCHAR(160) NULL,
  research_field VARCHAR(160) NULL,
  orcid_id       VARCHAR(40)  NULL,
  google_scholar VARCHAR(255) NULL,
  publications_count INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_researcher_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE university_profiles (
  user_id       BIGINT UNSIGNED PRIMARY KEY,
  official_role VARCHAR(120) NULL,              -- e.g. Head of Research & Innovation Cell
  department    VARCHAR(160) NULL,
  office_phone  VARCHAR(30)  NULL,
  can_verify_users TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_university_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE business_profiles (
  user_id           BIGINT UNSIGNED PRIMARY KEY,
  company_name      VARCHAR(160) NOT NULL,
  registration_no   VARCHAR(60)  NULL,
  industry          VARCHAR(120) NULL,
  company_size      ENUM('1-10','11-50','51-200','201-1000','1000+') NULL,
  company_website   VARCHAR(255) NULL,
  company_logo_url  VARCHAR(500) NULL,
  interests         VARCHAR(500) NULL,
  CONSTRAINT fk_business_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE investor_profiles (
  user_id        BIGINT UNSIGNED PRIMARY KEY,
  firm_name      VARCHAR(160) NULL,
  investor_type  ENUM('angel','vc','corporate','grant_body','individual') NOT NULL DEFAULT 'individual',
  ticket_min     DECIMAL(14,2) NULL,
  ticket_max     DECIMAL(14,2) NULL,
  focus_areas    VARCHAR(500) NULL,
  portfolio_url  VARCHAR(255) NULL,
  CONSTRAINT fk_investor_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---- university verification workflow -------------------------------

CREATE TABLE verification_requests (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  university_id INT UNSIGNED NOT NULL,
  evidence_url  VARCHAR(500) NULL,              -- student ID card / appointment letter
  note          VARCHAR(500) NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by   BIGINT UNSIGNED NULL,
  reviewed_at   DATETIME NULL,
  review_note   VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_verif_status (university_id, status),
  CONSTRAINT fk_verif_user       FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_verif_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  CONSTRAINT fk_verif_reviewer   FOREIGN KEY (reviewed_by)   REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45)  NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 2 — TAXONOMY
-- =====================================================================

CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT UNSIGNED NULL,
  name       VARCHAR(120) NOT NULL,
  slug       VARCHAR(140) NOT NULL UNIQUE,
  icon       VARCHAR(60)  NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE technologies (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(80) NOT NULL UNIQUE,
  slug      VARCHAR(90) NOT NULL UNIQUE,
  tech_type ENUM('language','framework','platform','hardware','method','other') NOT NULL DEFAULT 'other',
  usage_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE industries (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 3 — PUBLICATIONS (projects / research / innovations)
--  Lifecycle: draft -> pending -> approved | rejected -> archived
-- =====================================================================

CREATE TABLE publications (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36) NOT NULL UNIQUE,
  owner_id      BIGINT UNSIGNED NOT NULL,
  university_id INT UNSIGNED NULL,
  category_id   INT UNSIGNED NULL,
  industry_id   INT UNSIGNED NULL,
  title         VARCHAR(220) NOT NULL,
  slug          VARCHAR(260) NOT NULL UNIQUE,
  publication_type ENUM('final_year_project','research_paper','innovation','prototype','patent','thesis','dataset')
                NOT NULL DEFAULT 'final_year_project',
  abstract      VARCHAR(1200) NOT NULL,
  description   MEDIUMTEXT   NULL,
  methodology   TEXT         NULL,
  results       TEXT         NULL,
  keywords      VARCHAR(400) NULL,
  cover_image_url VARCHAR(500) NULL,
  demo_url      VARCHAR(500) NULL,
  repository_url VARCHAR(500) NULL,
  academic_year VARCHAR(12)  NULL,
  completion_date DATE       NULL,
  -- collaboration / funding intent
  open_to_collaboration TINYINT(1) NOT NULL DEFAULT 1,
  open_to_investment    TINYINT(1) NOT NULL DEFAULT 0,
  funding_required      DECIMAL(14,2) NULL,
  funding_currency      CHAR(3) NOT NULL DEFAULT 'USD',
  -- moderation
  status        ENUM('draft','pending','approved','rejected','archived') NOT NULL DEFAULT 'draft',
  submitted_at  DATETIME NULL,
  reviewed_by   BIGINT UNSIGNED NULL,
  reviewed_at   DATETIME NULL,
  rejection_reason VARCHAR(600) NULL,
  published_at  DATETIME NULL,
  -- counters (denormalised for listing performance)
  view_count    INT UNSIGNED NOT NULL DEFAULT 0,
  save_count    INT UNSIGNED NOT NULL DEFAULT 0,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  rating_avg    DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count  INT UNSIGNED NOT NULL DEFAULT 0,
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  hidden_until  DATETIME NULL,
  deleted_at    DATETIME NULL,
  KEY ix_pub_status_published (status, published_at DESC),
  KEY ix_pub_owner (owner_id, status),
  KEY ix_pub_category (category_id),
  KEY ix_pub_university (university_id),
  KEY ix_pub_type (publication_type),
  FULLTEXT KEY ft_pub_search (title, abstract, keywords),
  CONSTRAINT fk_pub_owner      FOREIGN KEY (owner_id)      REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pub_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  CONSTRAINT fk_pub_category   FOREIGN KEY (category_id)   REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_pub_industry   FOREIGN KEY (industry_id)   REFERENCES industries(id) ON DELETE SET NULL,
  CONSTRAINT fk_pub_reviewer   FOREIGN KEY (reviewed_by)   REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE publication_technologies (
  publication_id BIGINT UNSIGNED NOT NULL,
  technology_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (publication_id, technology_id),
  KEY ix_pubtech_tech (technology_id),
  CONSTRAINT fk_pubtech_pub  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_pubtech_tech FOREIGN KEY (technology_id)  REFERENCES technologies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE publication_authors (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NULL,          -- NULL for co-authors without an account
  display_name   VARCHAR(120) NOT NULL,
  affiliation    VARCHAR(160) NULL,
  author_role    ENUM('lead','co_author','supervisor','contributor') NOT NULL DEFAULT 'co_author',
  author_order   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  KEY ix_author_pub (publication_id),
  CONSTRAINT fk_author_pub  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_author_user FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE publication_documents (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NOT NULL,
  file_name      VARCHAR(200) NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  file_type      VARCHAR(40)  NULL,
  file_size_kb   INT UNSIGNED NULL,
  doc_type       ENUM('report','paper','poster','slides','source_code','dataset','other') NOT NULL DEFAULT 'other',
  access_level   ENUM('public','on_request','private') NOT NULL DEFAULT 'on_request',
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_doc_pub (publication_id),
  CONSTRAINT fk_doc_pub FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE saved_publications (
  user_id        BIGINT UNSIGNED NOT NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  collection     VARCHAR(80) NULL,
  saved_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, publication_id),
  KEY ix_saved_pub (publication_id),
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_pub  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- one row per user per publication per month: powers the Basic 20-views/month gate
CREATE TABLE publication_views (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NULL,
  period_key     CHAR(7) NOT NULL,               -- 'YYYY-MM'
  ip_address     VARCHAR(45) NULL,
  viewed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_view_user_pub_period (user_id, publication_id, period_key),
  KEY ix_view_pub (publication_id),
  CONSTRAINT fk_view_pub  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_view_user FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE publication_feedback (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  comment        VARCHAR(1000) NULL,
  status         ENUM('visible','hidden','flagged') NOT NULL DEFAULT 'visible',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feedback_user_pub (publication_id, user_id),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_pub  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 4 — REQUESTS (collaboration, investment, meetings, documents)
-- =====================================================================

CREATE TABLE collaboration_requests (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NULL,
  requester_id   BIGINT UNSIGNED NOT NULL,
  recipient_id   BIGINT UNSIGNED NOT NULL,
  request_type   ENUM('collaboration','investment','licensing','mentorship') NOT NULL DEFAULT 'collaboration',
  subject        VARCHAR(180) NOT NULL,
  message        TEXT NOT NULL,
  proposed_amount DECIMAL(14,2) NULL,
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  status         ENUM('pending','accepted','declined','withdrawn','closed') NOT NULL DEFAULT 'pending',
  response_note  VARCHAR(1000) NULL,
  responded_at   DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_req_recipient (recipient_id, status),
  KEY ix_req_requester (requester_id, status),
  KEY ix_req_pub (publication_id),
  CONSTRAINT fk_req_pub       FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL,
  CONSTRAINT fk_req_requester FOREIGN KEY (requester_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_req_recipient FOREIGN KEY (recipient_id)   REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Premium only
CREATE TABLE meeting_requests (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT UNSIGNED NULL,
  requester_id   BIGINT UNSIGNED NOT NULL,
  recipient_id   BIGINT UNSIGNED NOT NULL,
  title          VARCHAR(180) NOT NULL,
  agenda         TEXT NULL,
  meeting_mode   ENUM('online','onsite') NOT NULL DEFAULT 'online',
  location       VARCHAR(255) NULL,
  meeting_link   VARCHAR(255) NULL,
  proposed_start DATETIME NOT NULL,
  proposed_end   DATETIME NOT NULL,
  status         ENUM('pending','accepted','declined','rescheduled','cancelled','completed') NOT NULL DEFAULT 'pending',
  response_note  VARCHAR(600) NULL,
  responded_at   DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_meeting_recipient (recipient_id, status),
  KEY ix_meeting_requester (requester_id, status),
  CONSTRAINT fk_meet_pub       FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL,
  CONSTRAINT fk_meet_requester FOREIGN KEY (requester_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_meet_recipient FOREIGN KEY (recipient_id)   REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Premium only
CREATE TABLE document_access_requests (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_id    BIGINT UNSIGNED NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  requester_id   BIGINT UNSIGNED NOT NULL,
  owner_id       BIGINT UNSIGNED NOT NULL,
  reason         VARCHAR(800) NOT NULL,
  status         ENUM('pending','granted','denied','expired') NOT NULL DEFAULT 'pending',
  granted_until  DATETIME NULL,
  responded_at   DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_dar_owner (owner_id, status),
  KEY ix_dar_requester (requester_id, status),
  CONSTRAINT fk_dar_doc       FOREIGN KEY (document_id)    REFERENCES publication_documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_dar_pub       FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_dar_requester FOREIGN KEY (requester_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dar_owner     FOREIGN KEY (owner_id)       REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 5 — SUBSCRIPTIONS & BILLING
-- =====================================================================

CREATE TABLE subscription_plans (
  id             TINYINT UNSIGNED PRIMARY KEY,
  code           ENUM('basic','premium') NOT NULL UNIQUE,
  name           VARCHAR(60) NOT NULL,
  tagline        VARCHAR(160) NULL,
  price_monthly  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_yearly   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  is_active      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Feature matrix rendered on the pricing page and enforced by the API
CREATE TABLE plan_features (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id     TINYINT UNSIGNED NOT NULL,
  feature_key VARCHAR(60)  NOT NULL,
  label       VARCHAR(200) NOT NULL,
  is_included TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_plan_feature (plan_id, feature_key),
  CONSTRAINT fk_planfeature_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- NULL monthly_limit == unlimited
CREATE TABLE plan_limits (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id       TINYINT UNSIGNED NOT NULL,
  metric        ENUM('publication_full_view','saved_publication','outgoing_request','meeting_request','document_request') NOT NULL,
  monthly_limit INT UNSIGNED NULL,
  UNIQUE KEY uq_plan_metric (plan_id, metric),
  CONSTRAINT fk_planlimit_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payment_methods (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  card_brand    VARCHAR(30) NOT NULL,            -- visa / mastercard / amex
  card_last4    CHAR(4)     NOT NULL,            -- never store the full PAN
  card_token    VARCHAR(120) NOT NULL,           -- reference from the payment gateway
  holder_name   VARCHAR(120) NOT NULL,
  exp_month     TINYINT UNSIGNED NOT NULL,
  exp_year      SMALLINT UNSIGNED NOT NULL,
  billing_country VARCHAR(80) NULL,
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pm_user (user_id),
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              BIGINT UNSIGNED NOT NULL,
  plan_id              TINYINT UNSIGNED NOT NULL,
  billing_cycle        ENUM('none','monthly','yearly') NOT NULL DEFAULT 'none',
  status               ENUM('active','cancelled','expired','past_due') NOT NULL DEFAULT 'active',
  amount               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  payment_method_id    BIGINT UNSIGNED NULL,
  current_period_start DATETIME NOT NULL,
  current_period_end   DATETIME NULL,            -- NULL for the perpetual Basic plan
  auto_renew           TINYINT(1) NOT NULL DEFAULT 1,
  cancelled_at         DATETIME NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_sub_user_status (user_id, status),
  KEY ix_sub_period_end (current_period_end),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  CONSTRAINT fk_sub_pm   FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE subscription_invoices (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no        VARCHAR(30) NOT NULL UNIQUE,
  subscription_id   BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  billing_cycle     ENUM('monthly','yearly') NOT NULL,
  period_start      DATETIME NOT NULL,
  period_end        DATETIME NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL,
  gateway_reference VARCHAR(120) NULL,
  status            ENUM('paid','failed','refunded','pending') NOT NULL DEFAULT 'paid',
  paid_at           DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_inv_user (user_id),
  CONSTRAINT fk_inv_sub  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_user FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_pm   FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Rolling monthly counters used by the quota middleware
CREATE TABLE usage_counters (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  period_key CHAR(7) NOT NULL,                   -- 'YYYY-MM'
  metric     ENUM('publication_full_view','saved_publication','outgoing_request','meeting_request','document_request') NOT NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usage (user_id, period_key, metric),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 6 — MARKETPLACE (e-commerce)
-- =====================================================================

CREATE TABLE product_categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT UNSIGNED NULL,
  name       VARCHAR(120) NOT NULL,
  slug       VARCHAR(140) NOT NULL UNIQUE,
  icon       VARCHAR(60) NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT fk_prodcat_parent FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE products (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid           CHAR(36) NOT NULL UNIQUE,
  seller_id      BIGINT UNSIGNED NOT NULL,
  publication_id BIGINT UNSIGNED NULL,           -- product spun out of a publication
  category_id    INT UNSIGNED NOT NULL,
  title          VARCHAR(200) NOT NULL,
  slug           VARCHAR(240) NOT NULL UNIQUE,
  short_description VARCHAR(400) NULL,
  description    MEDIUMTEXT NULL,
  product_type   ENUM('physical','digital','service','dataset','license','component') NOT NULL DEFAULT 'physical',
  condition_type ENUM('new','used','prototype','not_applicable') NOT NULL DEFAULT 'new',
  price          DECIMAL(12,2) NOT NULL,
  compare_at_price DECIMAL(12,2) NULL,
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_alert INT NOT NULL DEFAULT 3,
  is_digital     TINYINT(1) NOT NULL DEFAULT 0,
  digital_file_url VARCHAR(500) NULL,
  shipping_fee   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ships_from_city VARCHAR(80) NULL,
  status         ENUM('draft','pending','active','rejected','out_of_stock','archived') NOT NULL DEFAULT 'draft',
  approved_by    BIGINT UNSIGNED NULL,
  approved_at    DATETIME NULL,
  rejection_reason VARCHAR(600) NULL,
  view_count     INT UNSIGNED NOT NULL DEFAULT 0,
  sold_count     INT UNSIGNED NOT NULL DEFAULT 0,
  rating_avg     DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count   INT UNSIGNED NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  KEY ix_prod_status (status, created_at DESC),
  KEY ix_prod_seller (seller_id, status),
  KEY ix_prod_category (category_id),
  FULLTEXT KEY ft_prod_search (title, short_description, description),
  CONSTRAINT chk_price_positive CHECK (price >= 0),
  CONSTRAINT fk_prod_seller   FOREIGN KEY (seller_id)      REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_prod_pub      FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL,
  CONSTRAINT fk_prod_category FOREIGN KEY (category_id)    REFERENCES product_categories(id),
  CONSTRAINT fk_prod_approver FOREIGN KEY (approved_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  alt_text   VARCHAR(160) NULL,
  position   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  KEY ix_img_product (product_id),
  CONSTRAINT fk_img_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_attributes (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  attr_name  VARCHAR(80) NOT NULL,
  attr_value VARCHAR(240) NOT NULL,
  KEY ix_attr_product (product_id),
  CONSTRAINT fk_attr_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  label       VARCHAR(40) NULL,
  recipient_name VARCHAR(120) NOT NULL,
  phone       VARCHAR(30) NOT NULL,
  line1       VARCHAR(200) NOT NULL,
  line2       VARCHAR(200) NULL,
  city        VARCHAR(80) NOT NULL,
  district    VARCHAR(80) NULL,
  postal_code VARCHAR(20) NULL,
  country     VARCHAR(80) NOT NULL DEFAULT 'Sri Lanka',
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  KEY ix_addr_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE carts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL UNIQUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  added_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart_product (cart_id, product_id),
  CONSTRAINT fk_cartitem_cart    FOREIGN KEY (cart_id)    REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cartitem_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wishlists (
  user_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  added_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_wish_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wish_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no          VARCHAR(24) NOT NULL UNIQUE,
  buyer_id          BIGINT UNSIGNED NOT NULL,
  shipping_address_id BIGINT UNSIGNED NULL,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_total    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  platform_fee      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_total         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  order_status      ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  payment_status    ENUM('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
  payment_method_id BIGINT UNSIGNED NULL,
  gateway_reference VARCHAR(120) NULL,
  buyer_note        VARCHAR(600) NULL,
  placed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_order_buyer (buyer_id, order_status),
  CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_addr  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_pm    FOREIGN KEY (payment_method_id)   REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NULL,
  seller_id     BIGINT UNSIGNED NOT NULL,
  title_snapshot VARCHAR(200) NOT NULL,
  image_snapshot VARCHAR(500) NULL,
  unit_price    DECIMAL(12,2) NOT NULL,
  quantity      INT UNSIGNED NOT NULL,
  line_total    DECIMAL(12,2) NOT NULL,
  item_status   ENUM('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  tracking_no   VARCHAR(80) NULL,
  KEY ix_item_order (order_id),
  KEY ix_item_seller (seller_id, item_status),
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_item_seller  FOREIGN KEY (seller_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_reviews (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL,
  buyer_id      BIGINT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  comment       VARCHAR(1000) NULL,
  status        ENUM('visible','hidden','flagged') NOT NULL DEFAULT 'visible',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_buyer_product (product_id, buyer_id),
  CONSTRAINT chk_product_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_prodrev_product FOREIGN KEY (product_id)    REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_prodrev_item    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
  CONSTRAINT fk_prodrev_buyer   FOREIGN KEY (buyer_id)      REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE seller_payouts (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id    BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  fee_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_amount   DECIMAL(12,2) NOT NULL,
  status       ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  paid_at      DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_payout_seller (seller_id, status),
  CONSTRAINT fk_payout_seller FOREIGN KEY (seller_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_item   FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 7 — MESSAGING, NOTIFICATIONS, AUDIT
-- =====================================================================

CREATE TABLE conversations (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject        VARCHAR(180) NULL,
  publication_id BIGINT UNSIGNED NULL,
  request_id     BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME NULL,
  CONSTRAINT fk_conv_pub FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL,
  CONSTRAINT fk_conv_req FOREIGN KEY (request_id)     REFERENCES collaboration_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE conversation_participants (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  last_read_at    DATETIME NULL,
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT fk_cp_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_user FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  attachment_url  VARCHAR(500) NULL,
  sent_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_msg_conv (conversation_id, sent_at),
  CONSTRAINT fk_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(60) NOT NULL,               -- publication.approved, request.received, order.paid ...
  title      VARCHAR(180) NOT NULL,
  body       VARCHAR(600) NULL,
  link_url   VARCHAR(300) NULL,
  priority   ENUM('normal','priority') NOT NULL DEFAULT 'normal',
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_notif_user (user_id, is_read, created_at DESC),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Every administrator / university decision is written here
CREATE TABLE moderation_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id     BIGINT UNSIGNED NULL,
  entity_type  ENUM('publication','product','user','feedback','review','order') NOT NULL,
  entity_id    BIGINT UNSIGNED NOT NULL,
  action       VARCHAR(40) NOT NULL,             -- approved, rejected, suspended, restored
  from_status  VARCHAR(30) NULL,
  to_status    VARCHAR(30) NULL,
  note         VARCHAR(600) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_modlog_entity (entity_type, entity_id),
  CONSTRAINT fk_modlog_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NULL,
  entity_id   BIGINT UNSIGNED NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_activity_user (user_id, created_at DESC),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE system_settings (
  setting_key   VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  description   VARCHAR(255) NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
--  SECTION 8 — VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW v_user_plan AS
SELECT u.id                AS user_id,
       u.full_name,
       u.email,
       r.code              AS role_code,
       COALESCE(p.code, 'basic')   AS plan_code,
       s.id                AS subscription_id,
       s.status            AS subscription_status,
       s.billing_cycle,
       s.current_period_end
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN subscriptions s
       ON s.user_id = u.id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
LEFT JOIN subscription_plans p ON p.id = s.plan_id;

CREATE OR REPLACE VIEW v_publication_cards AS
SELECT pb.id, pb.uuid, pb.slug, pb.title, pb.abstract, pb.publication_type, pb.status,
       pb.cover_image_url, pb.published_at, pb.view_count, pb.save_count,
       pb.rating_avg, pb.rating_count, pb.open_to_collaboration, pb.open_to_investment,
       c.name  AS category_name, c.slug AS category_slug,
       un.name AS university_name,
       u.id    AS owner_id, u.full_name AS owner_name, u.avatar_url AS owner_avatar,
       r.code  AS owner_role
FROM publications pb
JOIN users u      ON u.id = pb.owner_id
JOIN roles r      ON r.id = u.role_id
LEFT JOIN categories c   ON c.id = pb.category_id
LEFT JOIN universities un ON un.id = pb.university_id
WHERE pb.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_marketplace_products AS
SELECT p.id, p.uuid, p.slug, p.title, p.short_description, p.price, p.compare_at_price,
       p.currency, p.product_type, p.condition_type, p.stock_quantity, p.status,
       p.rating_avg, p.rating_count, p.sold_count, p.created_at,
       pc.name AS category_name, pc.slug AS category_slug,
       s.id AS seller_id, s.full_name AS seller_name, r.code AS seller_role,
       (SELECT image_url FROM product_images pi
         WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.position LIMIT 1) AS primary_image
FROM products p
JOIN product_categories pc ON pc.id = p.category_id
JOIN users s ON s.id = p.seller_id
JOIN roles r ON r.id = s.role_id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_admin_moderation_queue AS
SELECT 'publication' AS entity_type, pb.id AS entity_id, pb.title AS title,
       u.full_name AS submitted_by, r.code AS submitter_role, pb.submitted_at AS submitted_at
FROM publications pb
JOIN users u ON u.id = pb.owner_id
JOIN roles r ON r.id = u.role_id
WHERE pb.status = 'pending'
UNION ALL
SELECT 'product', p.id, p.title, u.full_name, r.code, p.created_at
FROM products p
JOIN users u ON u.id = p.seller_id
JOIN roles r ON r.id = u.role_id
WHERE p.status = 'pending';

-- =====================================================================
--  SECTION 9 — TRIGGERS
-- =====================================================================

DELIMITER $$

-- Keep save_count in step with saved_publications
CREATE TRIGGER trg_saved_pub_after_insert
AFTER INSERT ON saved_publications FOR EACH ROW
BEGIN
  UPDATE publications SET save_count = save_count + 1 WHERE id = NEW.publication_id;
END$$

CREATE TRIGGER trg_saved_pub_after_delete
AFTER DELETE ON saved_publications FOR EACH ROW
BEGIN
  UPDATE publications SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.publication_id;
END$$

-- Stamp lifecycle timestamps and write the audit trail on status change
CREATE TRIGGER trg_publication_before_update
BEFORE UPDATE ON publications FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'pending'  THEN SET NEW.submitted_at = NOW(); END IF;
    IF NEW.status = 'approved' THEN SET NEW.published_at = NOW(), NEW.reviewed_at = NOW(); END IF;
    IF NEW.status = 'rejected' THEN SET NEW.reviewed_at  = NOW(); END IF;
  END IF;
END$$

CREATE TRIGGER trg_publication_after_update
AFTER UPDATE ON publications FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO moderation_logs (actor_id, entity_type, entity_id, action, from_status, to_status, note)
    VALUES (NEW.reviewed_by, 'publication', NEW.id, CONCAT('status:', NEW.status),
            OLD.status, NEW.status, NEW.rejection_reason);
  END IF;
END$$

-- Recompute publication rating whenever feedback changes
CREATE TRIGGER trg_feedback_after_insert
AFTER INSERT ON publication_feedback FOR EACH ROW
BEGIN
  UPDATE publications p
     SET p.rating_avg = (SELECT ROUND(AVG(rating),2) FROM publication_feedback
                          WHERE publication_id = NEW.publication_id AND status = 'visible'),
         p.rating_count = (SELECT COUNT(*) FROM publication_feedback
                            WHERE publication_id = NEW.publication_id AND status = 'visible')
   WHERE p.id = NEW.publication_id;
END$$

-- Recompute product rating and flip stock status
CREATE TRIGGER trg_product_review_after_insert
AFTER INSERT ON product_reviews FOR EACH ROW
BEGIN
  UPDATE products p
     SET p.rating_avg = (SELECT ROUND(AVG(rating),2) FROM product_reviews
                          WHERE product_id = NEW.product_id AND status = 'visible'),
         p.rating_count = (SELECT COUNT(*) FROM product_reviews
                            WHERE product_id = NEW.product_id AND status = 'visible')
   WHERE p.id = NEW.product_id;
END$$

CREATE TRIGGER trg_product_before_update
BEFORE UPDATE ON products FOR EACH ROW
BEGIN
  IF NEW.status = 'active' AND NEW.is_digital = 0 AND NEW.stock_quantity <= 0 THEN
    SET NEW.status = 'out_of_stock';
  END IF;
END$$

-- Give every new account the Basic plan and a cart
CREATE TRIGGER trg_user_after_insert
AFTER INSERT ON users FOR EACH ROW
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, billing_cycle, status, amount,
                             current_period_start, current_period_end, auto_renew)
  VALUES (NEW.id, 1, 'none', 'active', 0.00, NOW(), NULL, 0);

  INSERT INTO carts (user_id) VALUES (NEW.id);

  INSERT INTO notifications (user_id, type, title, body, link_url)
  VALUES (NEW.id, 'account.welcome', 'Welcome to ProjectVerse',
          'Your Basic plan is active. Complete your profile to start publishing.', '/settings/profile');
END$$

DELIMITER ;

-- =====================================================================
--  SECTION 10 — STORED PROCEDURES
-- =====================================================================

DELIMITER $$

-- Returns allowed = 1/0 for a metered action and increments the counter when allowed.
-- monthly_limit IS NULL on the plan means unlimited.
CREATE PROCEDURE sp_consume_quota (
  IN  p_user_id BIGINT UNSIGNED,
  IN  p_metric  VARCHAR(40),
  OUT p_allowed TINYINT,
  OUT p_used    INT,
  OUT p_limit   INT
)
BEGIN
  DECLARE v_plan_id TINYINT UNSIGNED DEFAULT 1;
  DECLARE v_period  CHAR(7);

  SET v_period = DATE_FORMAT(NOW(), '%Y-%m');

  SELECT COALESCE(s.plan_id, 1) INTO v_plan_id
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ORDER BY s.plan_id DESC LIMIT 1;

  SELECT monthly_limit INTO p_limit
  FROM plan_limits WHERE plan_id = v_plan_id AND metric = p_metric LIMIT 1;

  INSERT INTO usage_counters (user_id, period_key, metric, used_count)
  VALUES (p_user_id, v_period, p_metric, 0)
  ON DUPLICATE KEY UPDATE used_count = used_count;

  SELECT used_count INTO p_used
  FROM usage_counters WHERE user_id = p_user_id AND period_key = v_period AND metric = p_metric;

  IF p_limit IS NULL OR p_used < p_limit THEN
    UPDATE usage_counters SET used_count = used_count + 1
     WHERE user_id = p_user_id AND period_key = v_period AND metric = p_metric;
    SET p_allowed = 1;
    SET p_used = p_used + 1;
  ELSE
    SET p_allowed = 0;
  END IF;
END$$

-- Publish flow: draft -> pending, queued for administrator approval
CREATE PROCEDURE sp_submit_publication (
  IN p_publication_id BIGINT UNSIGNED,
  IN p_owner_id BIGINT UNSIGNED
)
BEGIN
  UPDATE publications
     SET status = 'pending', submitted_at = NOW(), rejection_reason = NULL
   WHERE id = p_publication_id AND owner_id = p_owner_id AND status IN ('draft','rejected');

  INSERT INTO notifications (user_id, type, title, body, link_url)
  SELECT a.id, 'moderation.new_submission', 'A publication is waiting for review',
         CONCAT('"', p.title, '" was submitted for approval.'), '/admin/moderation'
  FROM users a
  JOIN roles r ON r.id = a.role_id AND r.code = 'admin'
  JOIN publications p ON p.id = p_publication_id
  WHERE a.account_status = 'active';
END$$

-- Administrator decision, with owner notification
CREATE PROCEDURE sp_review_publication (
  IN p_publication_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_decision VARCHAR(10),          -- 'approved' | 'rejected'
  IN p_note VARCHAR(600)
)
BEGIN
  UPDATE publications
     SET status = p_decision,
         reviewed_by = p_admin_id,
         rejection_reason = IF(p_decision = 'rejected', p_note, NULL)
   WHERE id = p_publication_id AND status = 'pending';

  INSERT INTO notifications (user_id, type, title, body, link_url, priority)
  SELECT p.owner_id,
         CONCAT('publication.', p_decision),
         IF(p_decision = 'approved', 'Your publication is live', 'Your publication needs changes'),
         CONCAT('"', p.title, '" was ', p_decision,
                IF(p_note IS NULL OR p_note = '', '.', CONCAT(': ', p_note))),
         CONCAT('/publications/', p.slug),
         'priority'
  FROM publications p WHERE p.id = p_publication_id;
END$$

DELIMITER ;


-- =====================================================================
--  ProjectVerse — File 02 of 03 : reference + demo data
--  Every demo account uses the password:  Password123!
-- =====================================================================
USE projectverse;

-- ---------------------------------------------------------------- roles
INSERT INTO roles (id, code, name, description, dashboard_route) VALUES
 (1,'student','Student','Uploads final year projects and manages collaboration requests','/dashboard/student'),
 (2,'researcher','Researcher','Publishes research and manages innovations','/dashboard/researcher'),
 (3,'university','University','Verifies users, monitors projects and promotes research','/dashboard/university'),
 (4,'business','Business','Searches projects and sends collaboration requests','/dashboard/business'),
 (5,'investor','Investor','Discovers innovations and offers funding','/dashboard/investor'),
 (6,'admin','Administrator','Manages users, approvals, security and system activity','/dashboard/admin');

-- --------------------------------------------------------- universities
INSERT INTO universities (id, name, short_name, country, city, website, email_domain) VALUES
 (1,'Sri Lanka Technology Campus','SLTC','Sri Lanka','Padukka','https://sltc.ac.lk','sltc.ac.lk'),
 (2,'University of Moratuwa','UOM','Sri Lanka','Moratuwa','https://uom.lk','uom.lk'),
 (3,'University of Colombo','UOC','Sri Lanka','Colombo','https://cmb.ac.lk','cmb.ac.lk'),
 (4,'University of Peradeniya','UOP','Sri Lanka','Kandy','https://pdn.ac.lk','pdn.ac.lk'),
 (5,'NSBM Green University','NSBM','Sri Lanka','Homagama','https://nsbm.ac.lk','nsbm.ac.lk');

-- ----------------------------------------------------- plans & limits
INSERT INTO subscription_plans (id, code, name, tagline, price_monthly, price_yearly, currency) VALUES
 (1,'basic','Basic','Everything you need to explore the marketplace', 0.00, 0.00,'USD'),
 (2,'premium','Premium','Unlimited access, meetings and document requests', 20.00, 200.00,'USD');

INSERT INTO plan_limits (plan_id, metric, monthly_limit) VALUES
 (1,'publication_full_view', 20),
 (1,'saved_publication', 5),
 (1,'outgoing_request', 3),
 (1,'meeting_request', 0),
 (1,'document_request', 0),
 (2,'publication_full_view', NULL),
 (2,'saved_publication', NULL),
 (2,'outgoing_request', NULL),
 (2,'meeting_request', NULL),
 (2,'document_request', NULL);

INSERT INTO plan_features (plan_id, feature_key, label, is_included, sort_order) VALUES
 (1,'browse_all','Browse every approved publication in the marketplace',1,1),
 (1,'full_view','View full details of up to 20 publications per month',1,2),
 (1,'save','Save up to 5 publications',1,3),
 (1,'requests','Send up to 3 collaboration or investment requests per month',1,4),
 (1,'core_fields','See title, abstract, category, technology and owner details',1,5),
 (1,'notifications','Receive basic notifications',1,6),
 (1,'profile','Update your profile information',1,7),
 (1,'advanced_search','Advanced search and filtering',0,8),
 (1,'meetings','Schedule meeting requests with project owners',0,9),
 (1,'documents','Request access to project documents',0,10),
 (2,'basic_all','Everything in Basic',1,1),
 (2,'full_view','View full details of unlimited publications',1,2),
 (2,'advanced_search','Advanced search and filtering by category, technology, industry and university',1,3),
 (2,'save','Save unlimited publications',1,4),
 (2,'requests','Send unlimited collaboration or investment requests',1,5),
 (2,'meetings','Schedule meeting requests with project owners',1,6),
 (2,'documents','Request access to project documents from the owner',1,7),
 (2,'notifications','Receive priority notifications',1,8);

-- ------------------------------------------------------------ taxonomy
INSERT INTO categories (id, parent_id, name, slug, icon, sort_order) VALUES
 (1,NULL,'Artificial Intelligence','artificial-intelligence','brain',1),
 (2,NULL,'Software Engineering','software-engineering','code',2),
 (3,NULL,'Internet of Things','internet-of-things','cpu',3),
 (4,NULL,'Renewable Energy','renewable-energy','sun',4),
 (5,NULL,'Health & Biomedical','health-biomedical','heart',5),
 (6,NULL,'Agriculture Technology','agriculture-technology','leaf',6),
 (7,NULL,'Cybersecurity','cybersecurity','shield',7),
 (8,NULL,'Materials & Manufacturing','materials-manufacturing','layers',8),
 (9,1,'Computer Vision','computer-vision',NULL,1),
 (10,1,'Natural Language Processing','natural-language-processing',NULL,2),
 (11,3,'Smart Sensors','smart-sensors',NULL,1);

INSERT INTO industries (id, name, slug) VALUES
 (1,'Information Technology','information-technology'),
 (2,'Healthcare','healthcare'),
 (3,'Agriculture','agriculture'),
 (4,'Energy & Utilities','energy-utilities'),
 (5,'Manufacturing','manufacturing'),
 (6,'Education','education'),
 (7,'Financial Services','financial-services'),
 (8,'Logistics','logistics');

INSERT INTO technologies (id, name, slug, tech_type) VALUES
 (1,'React.js','reactjs','framework'),
 (2,'Node.js','nodejs','platform'),
 (3,'Spring Boot','spring-boot','framework'),
 (4,'MySQL','mysql','platform'),
 (5,'Python','python','language'),
 (6,'TensorFlow','tensorflow','framework'),
 (7,'Arduino','arduino','hardware'),
 (8,'Raspberry Pi','raspberry-pi','hardware'),
 (9,'LoRaWAN','lorawan','platform'),
 (10,'Docker','docker','platform'),
 (11,'YOLOv8','yolov8','method'),
 (12,'Flutter','flutter','framework'),
 (13,'Blockchain','blockchain','method'),
 (14,'ESP32','esp32','hardware');

INSERT INTO product_categories (id, parent_id, name, slug, icon, sort_order) VALUES
 (1,NULL,'Prototypes & Devices','prototypes-devices','box',1),
 (2,NULL,'Components & Sensors','components-sensors','cpu',2),
 (3,NULL,'Datasets','datasets','database',3),
 (4,NULL,'Software & Licenses','software-licenses','key',4),
 (5,NULL,'Lab Equipment','lab-equipment','flask',5),
 (6,NULL,'Research Services','research-services','handshake',6),
 (7,NULL,'Publications & Reports','publications-reports','file',7),
 (8,NULL,'3D Printing & Fabrication','fabrication','printer',8);

-- ------------------------------------------------------------- users
-- password for all demo accounts: Password123!
SET @pw = '$2b$10$QALVqqquj0vE.uka56YkGeZ8WCju7D7qjPVQXRylTtevJVL4Al9KG';

INSERT INTO users (id, uuid, role_id, university_id, full_name, email, password_hash, phone, headline, bio, city, country, account_status, verification_status, email_verified_at) VALUES
 (1,'11111111-1111-4111-8111-111111111111',6,NULL,'System Administrator','admin@projectverse.io',@pw,'0112000000','Platform operations','Keeps the marketplace safe, reviewed and running.','Colombo','Sri Lanka','active','verified',NOW()),
 (2,'22222222-2222-4222-8222-222222222222',3,1,'SLTC Research & Innovation Cell','research@sltc.ac.lk',@pw,'0112500500','Research & Innovation Cell, SLTC','Verifies SLTC members and promotes campus research to industry.','Padukka','Sri Lanka','active','verified',NOW()),
 (3,'33333333-3333-4333-8333-333333333333',1,1,'Malsha Sathsarani','malsha@sltc.ac.lk',@pw,'0761664059','Final year student, Computing & IT','Building an innovation marketplace for university research.','Negombo','Sri Lanka','active','verified',NOW()),
 (4,'44444444-4444-4444-8444-444444444444',1,1,'Oshini Gunarathna','oshini@sltc.ac.lk',@pw,'0763182156','Frontend developer, Computing & IT','Interface design and accessible front ends.','Kandy','Sri Lanka','active','verified',NOW()),
 (5,'55555555-5555-4555-8555-555555555555',2,2,'Dr. Nuwan Perera','nuwan.perera@uom.lk',@pw,'0112640000','Senior Lecturer, Electronic Engineering','Low power sensor networks and edge machine learning.','Moratuwa','Sri Lanka','active','verified',NOW()),
 (6,'66666666-6666-4666-8666-666666666666',2,3,'Dr. Anjali Fernando','anjali.fernando@cmb.ac.lk',@pw,'0112581835','Research Fellow, Biomedical Informatics','Clinical decision support and medical imaging.','Colombo','Sri Lanka','active','verified',NOW()),
 (7,'77777777-7777-4777-8777-777777777777',4,NULL,'Kavindu Jayasuriya','kavindu@orbittech.lk',@pw,'0114567890','Head of Innovation, Orbit Technologies','Scouting university research for product teams.','Colombo','Sri Lanka','active','unverified',NOW()),
 (8,'88888888-8888-4888-8888-888888888888',5,NULL,'Rashmi Alwis','rashmi@lankaventures.com',@pw,'0117788990','Partner, Lanka Ventures','Seed cheques for deep tech coming out of universities.','Colombo','Sri Lanka','active','unverified',NOW());

INSERT INTO student_profiles (user_id, student_number, faculty, degree_program, year_of_study, graduation_year, supervisor_name) VALUES
 (3,'CIT-24-01-0428','Faculty of Computing and IT','BSc (Hons) Information Technology',4,2026,'Mr. Prabath Samarasinghe'),
 (4,'CIT-24-01-0332','Faculty of Computing and IT','BSc (Hons) Software Engineering',4,2026,'Mr. Prabath Samarasinghe');

INSERT INTO researcher_profiles (user_id, designation, department, research_field, orcid_id) VALUES
 (5,'Senior Lecturer','Electronic & Telecommunication Engineering','Edge AI and sensor networks','0000-0002-1825-0097'),
 (6,'Research Fellow','Faculty of Medicine','Biomedical informatics','0000-0001-5109-3700');

INSERT INTO university_profiles (user_id, official_role, department, office_phone) VALUES
 (2,'Head of Research & Innovation Cell','Office of Research','0112500501');

INSERT INTO business_profiles (user_id, company_name, registration_no, industry, company_size, company_website, interests) VALUES
 (7,'Orbit Technologies (Pvt) Ltd','PV00123456','Information Technology','51-200','https://orbittech.lk','Computer vision, logistics automation, IoT');

INSERT INTO investor_profiles (user_id, firm_name, investor_type, ticket_min, ticket_max, focus_areas) VALUES
 (8,'Lanka Ventures','vc',10000.00,250000.00,'Deep tech, agri tech, health tech');

-- Upgrade the investor to Premium so both plan states are demonstrable
INSERT INTO payment_methods (id, user_id, card_brand, card_last4, card_token, holder_name, exp_month, exp_year, billing_country, is_default)
VALUES (1,8,'visa','4242','tok_demo_visa_4242','Rashmi Alwis',11,2029,'Sri Lanka',1);

UPDATE subscriptions
   SET plan_id = 2, billing_cycle = 'yearly', amount = 200.00, payment_method_id = 1,
       current_period_start = NOW(), current_period_end = DATE_ADD(NOW(), INTERVAL 1 YEAR), auto_renew = 1
 WHERE user_id = 8;

INSERT INTO subscription_invoices (invoice_no, subscription_id, user_id, amount, currency, billing_cycle, period_start, period_end, payment_method_id, gateway_reference, status, paid_at)
SELECT 'INV-2026-000001', s.id, 8, 200.00, 'USD', 'yearly', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1, 'pay_demo_0001', 'paid', NOW()
FROM subscriptions s WHERE s.user_id = 8;

-- ------------------------------------------------------ publications
INSERT INTO publications
 (id, uuid, owner_id, university_id, category_id, industry_id, title, slug, publication_type, abstract, description,
  keywords, academic_year, open_to_collaboration, open_to_investment, funding_required, status, submitted_at,
  reviewed_by, published_at, view_count, save_count)
VALUES
 (1,'aaaaaaa1-0000-4000-8000-000000000001',3,1,2,1,
  'ProjectVerse — University Research & Innovation Marketplace',
  'projectverse-university-research-innovation-marketplace','final_year_project',
  'A centralised platform that connects students, researchers, universities, businesses and investors so that academic work reaches industry instead of stopping at assessment.',
  'ProjectVerse gives every academic output a public home: a moderated publication record, a collaboration channel, and a marketplace where research outputs and project supplies can be traded. Role based dashboards give each group only the tools it needs.',
  'innovation marketplace, university industry linkage, collaboration','2025/2026',1,1,15000.00,'approved',
  DATE_SUB(NOW(), INTERVAL 20 DAY),1,DATE_SUB(NOW(), INTERVAL 18 DAY),412,37),
 (2,'aaaaaaa1-0000-4000-8000-000000000002',5,2,3,3,
  'Solar Powered LoRaWAN Soil Monitoring for Smallholder Paddy Fields',
  'solar-lorawan-soil-monitoring-paddy','research_paper',
  'A field trial of a low cost soil moisture and salinity node that reports over LoRaWAN and runs a full season on a 2W solar panel.',
  'Twenty nodes were deployed across four districts for a full cultivation season. The paper reports packet delivery, battery behaviour under monsoon conditions, and the irrigation savings observed against a control plot.',
  'LoRaWAN, precision agriculture, soil sensing','2025/2026',1,1,42000.00,'approved',
  DATE_SUB(NOW(), INTERVAL 30 DAY),1,DATE_SUB(NOW(), INTERVAL 27 DAY),968,112),
 (3,'aaaaaaa1-0000-4000-8000-000000000003',6,3,5,2,
  'Retinal Image Screening for Early Diabetic Retinopathy in Low Resource Clinics',
  'retinal-screening-diabetic-retinopathy','innovation',
  'A screening pipeline that runs on a mid range phone and flags referable retinopathy from images captured with a clip on lens.',
  'The model was trained on 14,000 locally collected fundus images and validated against ophthalmologist grading. The work targets clinics with no on site specialist.',
  'medical imaging, screening, diabetic retinopathy','2025/2026',1,1,60000.00,'approved',
  DATE_SUB(NOW(), INTERVAL 12 DAY),1,DATE_SUB(NOW(), INTERVAL 10 DAY),1543,208),
 (4,'aaaaaaa1-0000-4000-8000-000000000004',4,1,1,8,
  'Vision Based Parcel Damage Detection for Last Mile Delivery',
  'vision-parcel-damage-detection','final_year_project',
  'A camera rig and detection model that grades parcel damage at handover, replacing a manual checklist that riders rarely complete.',
  'Built around YOLOv8 with a custom dataset of 6,200 annotated parcel photographs collected at three depots.',
  'computer vision, logistics, quality control','2025/2026',1,0,NULL,'pending',
  DATE_SUB(NOW(), INTERVAL 2 DAY),NULL,NULL,0,0),
 (5,'aaaaaaa1-0000-4000-8000-000000000005',3,1,7,7,
  'Consent Ledger — Auditable Data Sharing Between Campus Systems',
  'consent-ledger-campus-data-sharing','prototype',
  'A permissioned ledger that records who accessed a student record, why, and under which consent grant.',
  NULL,'access control, audit, consent','2025/2026',1,0,NULL,'draft',
  NULL,NULL,NULL,0,0);

INSERT INTO publication_technologies (publication_id, technology_id) VALUES
 (1,1),(1,2),(1,4),(1,10),
 (2,7),(2,9),(2,5),(2,14),
 (3,5),(3,6),(3,12),
 (4,5),(4,11),(4,1),
 (5,2),(5,13),(5,4);

INSERT INTO publication_authors (publication_id, user_id, display_name, affiliation, author_role, author_order) VALUES
 (1,3,'Malsha Sathsarani','Sri Lanka Technology Campus','lead',1),
 (1,4,'Oshini Gunarathna','Sri Lanka Technology Campus','co_author',2),
 (1,NULL,'Mr. Prabath Samarasinghe','Sri Lanka Technology Campus','supervisor',3),
 (2,5,'Dr. Nuwan Perera','University of Moratuwa','lead',1),
 (3,6,'Dr. Anjali Fernando','University of Colombo','lead',1),
 (4,4,'Oshini Gunarathna','Sri Lanka Technology Campus','lead',1);

INSERT INTO publication_documents (publication_id, file_name, file_url, file_type, file_size_kb, doc_type, access_level) VALUES
 (1,'ProjectVerse_Final_Report.pdf','/storage/docs/projectverse-report.pdf','application/pdf',4820,'report','on_request'),
 (2,'LoRaWAN_Field_Trial_Data.csv','/storage/docs/lorawan-field-data.csv','text/csv',960,'dataset','on_request'),
 (2,'LoRaWAN_Paper_Preprint.pdf','/storage/docs/lorawan-preprint.pdf','application/pdf',2100,'paper','public'),
 (3,'Retinal_Screening_Protocol.pdf','/storage/docs/retinal-protocol.pdf','application/pdf',1750,'paper','on_request');

INSERT INTO publication_feedback (publication_id, user_id, rating, comment) VALUES
 (2,7,5,'Exactly the kind of field validated work we look for. Interested in a pilot with our agri client.'),
 (3,8,5,'Strong clinical framing and a believable deployment path.'),
 (1,7,4,'Useful concept. Would like to see the moderation workflow documented in more detail.');

-- --------------------------------------------------------- marketplace
INSERT INTO products
 (id, uuid, seller_id, publication_id, category_id, title, slug, short_description, description,
  product_type, condition_type, price, stock_quantity, is_digital, shipping_fee, ships_from_city,
  status, approved_by, approved_at, sold_count, rating_avg, rating_count)
VALUES
 (1,'bbbbbbb1-0000-4000-8000-000000000001',5,2,1,
  'Solar LoRaWAN Soil Node (assembled, field tested)','solar-lorawan-soil-node',
  'Assembled sensor node with solar harvesting, moisture and salinity probes, tested for one full season.',
  'Ships calibrated with a probe set, IP67 enclosure and mounting stake. Firmware source is included under an academic licence.',
  'physical','new',185.00,12,0,15.00,'Moratuwa','active',1,DATE_SUB(NOW(), INTERVAL 20 DAY),34,4.80,5),
 (2,'bbbbbbb1-0000-4000-8000-000000000002',5,2,3,
  'Paddy Field Soil Telemetry Dataset (4 districts, one season)','paddy-soil-telemetry-dataset',
  '1.2M labelled readings from 20 nodes across four districts, with weather and yield ground truth.',
  'CSV and Parquet, documented schema, released for non commercial research use.',
  'dataset','not_applicable',60.00,0,1,0.00,NULL,'active',1,DATE_SUB(NOW(), INTERVAL 20 DAY),58,4.90,9),
 (3,'bbbbbbb1-0000-4000-8000-000000000003',6,3,6,
  'Fundus Image Annotation Service (ophthalmologist graded)','fundus-annotation-service',
  'Specialist grading for research datasets, priced per hundred images with a two week turnaround.',
  'Two independent graders with adjudication on disagreement. Includes a grading rubric and inter rater report.',
  'service','not_applicable',420.00,0,1,0.00,'Colombo','active',1,DATE_SUB(NOW(), INTERVAL 8 DAY),6,5.00,3),
 (4,'bbbbbbb1-0000-4000-8000-000000000004',3,NULL,2,
  'ESP32 Prototyping Bundle for Final Year Projects','esp32-prototyping-bundle',
  'Everything a final year IoT project needs: ESP32 board, sensor set, breadboard, jumpers and a 12 page starter guide.',
  'Curated after three years of watching juniors buy the wrong parts twice.',
  'physical','new',48.00,40,0,6.00,'Negombo','active',1,DATE_SUB(NOW(), INTERVAL 5 DAY),21,4.60,7),
 (5,'bbbbbbb1-0000-4000-8000-000000000005',4,NULL,4,
  'Campus Event Manager — Source Licence','campus-event-manager-licence',
  'React and Node source for a campus event system, single university licence with six months of updates.',
  'Includes deployment notes, seed data and a Figma file for the interface.',
  'license','not_applicable',150.00,0,1,0.00,NULL,'pending',NULL,NULL,0,0.00,0);

INSERT INTO product_images (product_id, image_url, alt_text, position, is_primary) VALUES
 (1,'/storage/products/lora-node-1.jpg','Assembled solar LoRaWAN soil node',0,1),
 (1,'/storage/products/lora-node-2.jpg','Node installed in a paddy field',1,0),
 (2,'/storage/products/dataset-cover.jpg','Telemetry dataset cover',0,1),
 (3,'/storage/products/annotation-service.jpg','Fundus grading workstation',0,1),
 (4,'/storage/products/esp32-bundle.jpg','ESP32 prototyping bundle contents',0,1),
 (5,'/storage/products/event-manager.jpg','Campus event manager screenshot',0,1);

INSERT INTO product_attributes (product_id, attr_name, attr_value) VALUES
 (1,'Battery','3.7V 5000mAh Li-ion with 2W panel'),
 (1,'Range','Up to 8 km line of sight'),
 (1,'Warranty','6 months'),
 (2,'Records','1,240,000'),
 (2,'Format','CSV, Parquet'),
 (2,'Licence','Non commercial research'),
 (4,'Contents','ESP32, DHT22, soil probe, OLED, breadboard, jumper set');

INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, city, district, postal_code, country, is_default) VALUES
 (1,7,'Office','Kavindu Jayasuriya','0114567890','No. 42, Union Place','Colombo 02','Colombo','00200','Sri Lanka',1),
 (2,8,'Office','Rashmi Alwis','0117788990','Level 8, World Trade Center','Colombo 01','Colombo','00100','Sri Lanka',1);

INSERT INTO orders (id, order_no, buyer_id, shipping_address_id, subtotal, shipping_total, platform_fee, grand_total, order_status, payment_status, payment_method_id, placed_at) VALUES
 (1,'PV-2026-000001',7,1,370.00,30.00,18.50,418.50,'delivered','paid',NULL,DATE_SUB(NOW(), INTERVAL 14 DAY)),
 (2,'PV-2026-000002',8,2,60.00,0.00,3.00,63.00,'paid','paid',1,DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO order_items (order_id, product_id, seller_id, title_snapshot, unit_price, quantity, line_total, item_status) VALUES
 (1,1,5,'Solar LoRaWAN Soil Node (assembled, field tested)',185.00,2,370.00,'delivered'),
 (2,2,5,'Paddy Field Soil Telemetry Dataset (4 districts, one season)',60.00,1,60.00,'delivered');

INSERT INTO product_reviews (product_id, order_item_id, buyer_id, rating, comment) VALUES
 (1,1,7,5,'Arrived calibrated and survived two weeks of rain without a reset.'),
 (2,2,8,5,'Well documented schema. Saved our team a month of collection work.');

-- ------------------------------------------------------------ requests
INSERT INTO collaboration_requests (publication_id, requester_id, recipient_id, request_type, subject, message, proposed_amount, status, created_at) VALUES
 (2,7,5,'collaboration','Pilot deployment with our agri client',
  'We run irrigation software for three plantation groups and would like to trial 50 of your nodes this season. Happy to fund the hardware and share the telemetry back with your lab.',
  NULL,'accepted',DATE_SUB(NOW(), INTERVAL 9 DAY)),
 (3,8,6,'investment','Seed funding for clinical validation',
  'We would like to discuss a seed round to take the screening pipeline through a multi site validation. Our usual first cheque is in the 50k to 150k range.',
  120000.00,'pending',DATE_SUB(NOW(), INTERVAL 4 DAY)),
 (1,7,3,'collaboration','Interested in the marketplace moderation model',
  'Your approval workflow is close to something we need internally. Could we talk about a joint pilot with our innovation team?',
  NULL,'pending',DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO meeting_requests (publication_id, requester_id, recipient_id, title, agenda, meeting_mode, meeting_link, proposed_start, proposed_end, status) VALUES
 (3,8,6,'Seed round — first conversation','Team, validation plan, funding requirement and timeline.','online','https://meet.example.com/pv-seed-001',
  DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 3 DAY), INTERVAL 45 MINUTE),'pending');

INSERT INTO document_access_requests (document_id, publication_id, requester_id, owner_id, reason, status) VALUES
 (2,2,8,5,'Reviewing data quality before committing to a funding decision.','granted'),
 (4,3,8,6,'Due diligence on the screening protocol.','pending');

-- ------------------------------------------------------- notifications
INSERT INTO notifications (user_id, type, title, body, link_url, priority, is_read) VALUES
 (5,'request.received','New collaboration request','Orbit Technologies wants to pilot your soil monitoring nodes.','/requests',       'normal',1),
 (6,'request.received','New investment request','Lanka Ventures proposed a seed round for your screening pipeline.','/requests',    'priority',0),
 (3,'request.received','New collaboration request','Orbit Technologies is interested in ProjectVerse.','/requests',                    'normal',0),
 (1,'moderation.new_submission','A publication is waiting for review','"Vision Based Parcel Damage Detection" was submitted for approval.','/admin/moderation','normal',0),
 (1,'moderation.new_submission','A product is waiting for review','"Campus Event Manager — Source Licence" was submitted for approval.','/admin/moderation','normal',0),
 (8,'billing.paid','Premium is active','Your yearly Premium plan is active until next year.','/settings/billing','normal',1);

-- --------------------------------------------------------- verification
INSERT INTO verification_requests (user_id, university_id, evidence_url, note, status) VALUES
 (4,1,'/storage/verification/oshini-id.jpg','Student ID card, Faculty of Computing and IT','pending');

-- ------------------------------------------------------------ settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
 ('platform_fee_percent','5','Commission retained on each marketplace order item'),
 ('premium_price_monthly','20','USD per month'),
 ('premium_price_yearly','200','USD per year'),
 ('auto_approve_publications','0','When 1, publications skip administrator review'),
 ('support_email','support@projectverse.io','Shown in the footer and transactional email');


-- =====================================================================
--  ProjectVerse — File 03 of 03 : expanded dataset
--
--  Brings every core table to between 15 and 20 records, as required for
--  the CCS3361 database submission. Load AFTER 01_schema.sql and
--  02_seed.sql.
--
--  Every account here uses the same password:  Password123!
-- =====================================================================
USE projectverse;

SET @pw := '$2b$10$QALVqqquj0vE.uka56YkGeZ8WCju7D7qjPVQXRylTtevJVL4Al9KG';

-- ---------------------------------------------------------------------
--  Reference data
-- ---------------------------------------------------------------------

-- universities: 5 -> 16
INSERT INTO universities (id, name, short_name, country, city, website, email_domain) VALUES
 (6,'University of Kelaniya','UOK','Sri Lanka','Kelaniya','https://kln.ac.lk','kln.ac.lk'),
 (7,'University of Ruhuna','UOR','Sri Lanka','Matara','https://ruh.ac.lk','ruh.ac.lk'),
 (8,'University of Jaffna','UOJ','Sri Lanka','Jaffna','https://jfn.ac.lk','jfn.ac.lk'),
 (9,'University of Sri Jayewardenepura','USJ','Sri Lanka','Nugegoda','https://sjp.ac.lk','sjp.ac.lk'),
 (10,'Sabaragamuwa University of Sri Lanka','SUSL','Sri Lanka','Belihuloya','https://sab.ac.lk','sab.ac.lk'),
 (11,'Wayamba University of Sri Lanka','WUSL','Sri Lanka','Kuliyapitiya','https://wyb.ac.lk','wyb.ac.lk'),
 (12,'Rajarata University of Sri Lanka','RUSL','Sri Lanka','Mihintale','https://rjt.ac.lk','rjt.ac.lk'),
 (13,'Uva Wellassa University','UWU','Sri Lanka','Badulla','https://uwu.ac.lk','uwu.ac.lk'),
 (14,'South Eastern University of Sri Lanka','SEUSL','Sri Lanka','Oluvil','https://seu.ac.lk','seu.ac.lk'),
 (15,'Informatics Institute of Technology','IIT','Sri Lanka','Colombo','https://iit.ac.lk','iit.ac.lk'),
 (16,'General Sir John Kotelawala Defence University','KDU','Sri Lanka','Ratmalana','https://kdu.ac.lk','kdu.ac.lk');

-- industries: 8 -> 16
INSERT INTO industries (id, name, slug) VALUES
 (9,'Construction','construction'),
 (10,'Tourism & Hospitality','tourism-hospitality'),
 (11,'Textiles & Apparel','textiles-apparel'),
 (12,'Water & Sanitation','water-sanitation'),
 (13,'Marine & Fisheries','marine-fisheries'),
 (14,'Public Sector','public-sector'),
 (15,'Retail & E-commerce','retail-ecommerce'),
 (16,'Environment & Climate','environment-climate');

-- technologies: 14 -> 20
INSERT INTO technologies (id, name, slug, tech_type) VALUES
 (15,'PostgreSQL','postgresql','platform'),
 (16,'PyTorch','pytorch','framework'),
 (17,'Kubernetes','kubernetes','platform'),
 (18,'MQTT','mqtt','method'),
 (19,'OpenCV','opencv','framework'),
 (20,'Django','django','framework');

-- ---------------------------------------------------------------------
--  Users : 8 -> 20
--  The after-insert trigger gives each of these a Basic subscription,
--  a cart and a welcome notification automatically.
-- ---------------------------------------------------------------------
INSERT INTO users (id, uuid, role_id, university_id, full_name, email, password_hash, phone,
                   headline, bio, city, country, account_status, verification_status, email_verified_at) VALUES
 (9,'99999999-0009-4009-8009-000000000009',1,2,'Ishara Wickramasinghe','ishara@uom.lk',@pw,'0771002001',
  'Final year student, Electronic Engineering','Embedded systems and low-power sensing.','Moratuwa','Sri Lanka','active','verified',NOW()),
 (10,'99999999-0010-4010-8010-000000000010',1,3,'Tharindu Bandara','tharindu@cmb.ac.lk',@pw,'0771002002',
  'MSc student, Computer Science','Applied machine learning for local-language text.','Colombo','Sri Lanka','active','verified',NOW()),
 (11,'99999999-0011-4011-8011-000000000011',1,4,'Sanduni Rathnayake','sanduni@pdn.ac.lk',@pw,'0771002003',
  'Final year student, Agricultural Engineering','Post-harvest handling and cold chain design.','Kandy','Sri Lanka','active','pending',NULL),
 (12,'99999999-0012-4012-8012-000000000012',1,5,'Dinuka Peris','dinuka@nsbm.ac.lk',@pw,'0771002004',
  'Undergraduate, Software Engineering','Web platforms and developer tooling.','Homagama','Sri Lanka','active','pending',NULL),
 (13,'99999999-0013-4013-8013-000000000013',2,4,'Prof. Chandima Silva','chandima.silva@pdn.ac.lk',@pw,'0812395001',
  'Professor, Department of Civil Engineering','Structural health monitoring and durable materials.','Kandy','Sri Lanka','active','verified',NOW()),
 (14,'99999999-0014-4014-8014-000000000014',2,6,'Dr. Hasitha Gunawardena','hasitha@kln.ac.lk',@pw,'0112903001',
  'Senior Lecturer, Department of Chemistry','Water treatment chemistry and low-cost filtration.','Kelaniya','Sri Lanka','active','verified',NOW()),
 (15,'99999999-0015-4015-8015-000000000015',2,7,'Dr. Menaka Dissanayake','menaka@ruh.ac.lk',@pw,'0412222001',
  'Senior Lecturer, Department of Fisheries Biology','Coastal ecology and small-scale fisheries.','Matara','Sri Lanka','active','verified',NOW()),
 (16,'99999999-0016-4016-8016-000000000016',3,2,'UOM Industry Liaison Centre','ilc@uom.lk',@pw,'0112650301',
  'Industry Liaison Centre, University of Moratuwa','Connects departmental research with industry partners.','Moratuwa','Sri Lanka','active','verified',NOW()),
 (17,'99999999-0017-4017-8017-000000000017',3,4,'Peradeniya Research Office','research@pdn.ac.lk',@pw,'0812392001',
  'Research and Innovation Office','Oversees institutional research output and verification.','Kandy','Sri Lanka','active','verified',NOW()),
 (18,'99999999-0018-4018-8018-000000000018',4,NULL,'Nadeesha Ekanayake','nadeesha@hexalabs.lk',@pw,'0114500900',
  'Head of R&D, Hexa Labs','Sourcing university prototypes for industrial automation.','Colombo','Sri Lanka','active','verified',NOW()),
 (19,'99999999-0019-4019-8019-000000000019',4,NULL,'Ruwan Abeysekara','ruwan@greenfieldagro.lk',@pw,'0114500901',
  'Operations Director, Greenfield Agro','Post-harvest logistics across the dry zone.','Anuradhapura','Sri Lanka','active','verified',NOW()),
 (20,'99999999-0020-4020-8020-000000000020',5,NULL,'Dilshan Mendis','dilshan@serendibcapital.com',@pw,'0114500902',
  'Partner, Serendib Capital','Early-stage deep tech across South Asia.','Colombo','Sri Lanka','active','verified',NOW());

-- role extension rows
INSERT INTO student_profiles (user_id, student_number, faculty, degree_program, year_of_study, graduation_year, supervisor_name) VALUES
 (9,'EN18452','Faculty of Engineering','BSc Eng (Hons) Electronic & Telecommunication',4,2026,'Dr. Nuwan Perera'),
 (10,'CS22118','Faculty of Science','MSc Computer Science',2,2026,'Dr. Anjali Fernando'),
 (11,'AG19233','Faculty of Agriculture','BSc Agricultural Engineering',4,2026,'Prof. Chandima Silva'),
 (12,'SE20871','School of Computing','BSc (Hons) Software Engineering',3,2027,'Dr. Hasitha Gunawardena');

INSERT INTO researcher_profiles (user_id, designation, department, research_field, orcid_id, publications_count) VALUES
 (13,'Professor','Civil Engineering','Structural health monitoring','0000-0002-1825-0097',48),
 (14,'Senior Lecturer','Chemistry','Water treatment and filtration','0000-0001-5109-3700',22),
 (15,'Senior Lecturer','Fisheries Biology','Coastal ecology','0000-0003-1415-9269',17);

INSERT INTO university_profiles (user_id, official_role, department, office_phone) VALUES
 (16,'Director, Industry Liaison Centre','Industry Liaison Centre','0112650301'),
 (17,'Deputy Director, Research','Research and Innovation Office','0812392001');

INSERT INTO business_profiles (user_id, company_name, registration_no, industry, company_size, company_website, interests) VALUES
 (18,'Hexa Labs (Pvt) Ltd','PV00128745','Manufacturing','51-200','https://hexalabs.lk','Industrial automation, robotics, machine vision'),
 (19,'Greenfield Agro Exports','PV00098221','Agriculture','201-1000','https://greenfieldagro.lk','Cold chain, post-harvest loss, traceability');

INSERT INTO investor_profiles (user_id, firm_name, investor_type, ticket_min, ticket_max, focus_areas, portfolio_url) VALUES
 (20,'Serendib Capital Partners','vc',25000.00,500000.00,'Deep tech, climate, agritech','https://serendibcapital.com');

-- ---------------------------------------------------------------------
--  Publications : 7 -> 20
-- ---------------------------------------------------------------------
INSERT INTO publications
 (id, uuid, owner_id, university_id, category_id, industry_id, title, slug, publication_type, abstract,
  description, methodology, results, keywords, academic_year, open_to_collaboration, open_to_investment,
  funding_required, status, submitted_at, reviewed_by, reviewed_at, published_at,
  view_count, save_count, request_count, is_featured) VALUES
 (8,'aaaa0008-0008-4008-8008-000000000008',9,2,3,4,
  'Low-Power Wireless Sensor Node for Distribution Transformer Monitoring',
  'low-power-wireless-sensor-node-transformer-monitoring','final_year_project',
  'A battery-backed sensor node that reports transformer oil temperature, load current and vibration over LoRaWAN, running for eighteen months on a single charge.',
  'The node combines a current transformer clamp, a PT100 probe and a MEMS accelerometer with an ESP32 and a LoRaWAN radio. Duty cycling and event-triggered sampling keep average draw under 400 microamps.',
  'Field trials on nine distribution transformers across two feeders over eleven months, with laboratory calibration against a reference meter.',
  'Detected two developing faults before failure. Mean absolute temperature error 0.6 C. Estimated battery life 18.4 months.',
  'LoRaWAN, transformer, condition monitoring, low power','2025/2026',1,1,22000.00,
  'approved',DATE_SUB(NOW(),INTERVAL 62 DAY),1,DATE_SUB(NOW(),INTERVAL 60 DAY),DATE_SUB(NOW(),INTERVAL 60 DAY),412,17,4,1),

 (9,'aaaa0009-0009-4009-8009-000000000009',10,3,10,1,
  'Sinhala Named-Entity Recognition on Low-Resource Annotated Corpora',
  'sinhala-named-entity-recognition-low-resource','research_paper',
  'A transfer-learning approach that reaches usable named-entity accuracy for Sinhala with fewer than ten thousand annotated sentences.',
  'A multilingual transformer is adapted with a Sinhala morphological pre-processing layer and trained on a hand-annotated news corpus released with the paper.',
  'Annotation of 9,400 sentences by three annotators with adjudication. Comparison against three baselines under identical splits.',
  'F1 of 0.81 on person, location and organisation entities, against 0.62 for the strongest baseline.',
  'NLP, Sinhala, named entity recognition, low resource','2025/2026',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 48 DAY),1,DATE_SUB(NOW(),INTERVAL 46 DAY),DATE_SUB(NOW(),INTERVAL 46 DAY),388,21,3,1),

 (10,'aaaa0010-0010-4010-8010-000000000010',11,4,6,3,
  'Evaporative Cold Storage for Smallholder Vegetable Farms',
  'evaporative-cold-storage-smallholder-vegetable-farms','innovation',
  'A brick-and-sand evaporative store that holds leafy vegetables eight degrees below ambient without grid electricity, built for under thirty thousand rupees.',
  'The unit uses a double brick wall with a sand cavity kept damp by a solar-pumped drip line, sized for 200 kg of produce.',
  'Six-month trial on four farms in Nuwara Eliya and Matale, with weight-loss and marketability scoring against open-shed controls.',
  'Marketable weight after five days improved from 61% to 88%. Internal temperature averaged 8.2 C below ambient.',
  'post-harvest, evaporative cooling, smallholder, cold chain','2025/2026',1,1,12000.00,
  'approved',DATE_SUB(NOW(),INTERVAL 40 DAY),1,DATE_SUB(NOW(),INTERVAL 38 DAY),DATE_SUB(NOW(),INTERVAL 38 DAY),295,14,5,0),

 (11,'aaaa0011-0011-4011-8011-000000000011',13,4,8,9,
  'Vibration-Based Crack Detection in Reinforced Concrete Beams',
  'vibration-based-crack-detection-reinforced-concrete','research_paper',
  'A modal analysis method that locates cracks in reinforced concrete beams from ambient vibration alone, without closing the structure to traffic.',
  'Accelerometer arrays sample ambient response; a curvature-based damage index localises loss of stiffness along the span.',
  'Laboratory validation on twelve cast beams with induced cracking, followed by measurement on two road bridges.',
  'Crack location identified within 8% of span length in 21 of 24 laboratory cases.',
  'structural health monitoring, modal analysis, concrete','2024/2025',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 92 DAY),1,DATE_SUB(NOW(),INTERVAL 90 DAY),DATE_SUB(NOW(),INTERVAL 90 DAY),206,9,2,0),

 (12,'aaaa0012-0012-4012-8012-000000000012',14,6,5,12,
  'Laterite-Based Filtration Media for Household Fluoride Removal',
  'laterite-based-filtration-media-fluoride-removal','research_paper',
  'Locally sourced laterite, thermally activated, removes fluoride from groundwater to below the WHO guideline at a materials cost under twenty rupees per litre treated.',
  'Laterite from three dry-zone sites is characterised and activated at 300 to 500 C, then evaluated in column studies against commercial activated alumina.',
  'Batch isotherm studies followed by 90-day column trials on real groundwater from Anuradhapura.',
  'Residual fluoride held below 1.0 mg/L for 1,800 bed volumes. Cost per litre roughly one fifth of activated alumina.',
  'fluoride, groundwater, laterite, filtration','2025/2026',1,1,18000.00,
  'approved',DATE_SUB(NOW(),INTERVAL 34 DAY),1,DATE_SUB(NOW(),INTERVAL 32 DAY),DATE_SUB(NOW(),INTERVAL 32 DAY),341,19,6,1),

 (13,'aaaa0013-0013-4013-8013-000000000013',15,7,6,13,
  'Catch Composition and Effort in Small-Scale Southern Coastal Fisheries',
  'catch-composition-effort-southern-coastal-fisheries','dataset',
  'Thirty months of landing-site observations covering catch weight, species composition and fishing effort at six southern landing sites.',
  'Daily enumerator records from Dondra, Mirissa, Weligama, Hikkaduwa, Ambalangoda and Beruwala, cleaned and harmonised to a single schema.',
  'Stratified sampling of landings across seasons with species identification verified against a reference collection.',
  'A cleaned dataset of 41,200 landing records, with a documented schema and known-gaps register.',
  'fisheries, dataset, coastal, catch per unit effort','2024/2025',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 71 DAY),1,DATE_SUB(NOW(),INTERVAL 70 DAY),DATE_SUB(NOW(),INTERVAL 70 DAY),178,12,1,0),

 (14,'aaaa0014-0014-4014-8014-000000000014',12,5,2,1,
  'Offline-First Progressive Web Application for Rural Clinic Records',
  'offline-first-pwa-rural-clinic-records','final_year_project',
  'A clinic record system that works with no connectivity for days at a time and reconciles cleanly when a connection returns.',
  'Local-first storage with a conflict-resolution layer designed around the append-only nature of clinical notes.',
  'Deployed in two rural clinics for four months with structured feedback from six staff.',
  'Median record entry time fell from 3.4 to 1.9 minutes. No unresolved sync conflicts across 8,900 records.',
  'PWA, offline first, health records, sync','2025/2026',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 27 DAY),1,DATE_SUB(NOW(),INTERVAL 25 DAY),DATE_SUB(NOW(),INTERVAL 25 DAY),263,15,3,0),

 (15,'aaaa0015-0015-4015-8015-000000000015',5,2,9,5,
  'Machine Vision Grading of Ceylon Cinnamon Quills',
  'machine-vision-grading-ceylon-cinnamon-quills','innovation',
  'An imaging rig and classifier that grades cinnamon quills to export categories at 340 quills per minute, replacing a manual step that varies between graders.',
  'A backlit conveyor, line-scan camera and a compact convolutional model deployed on an edge device at the processing floor.',
  'Trained on 28,000 labelled quill images graded by three certified graders, with disagreement cases adjudicated.',
  'Agreement with the adjudicated grade was 94.1%, above the 88.6% average agreement between individual human graders.',
  'computer vision, cinnamon, grading, edge AI','2025/2026',1,1,45000.00,
  'approved',DATE_SUB(NOW(),INTERVAL 20 DAY),1,DATE_SUB(NOW(),INTERVAL 18 DAY),DATE_SUB(NOW(),INTERVAL 18 DAY),504,26,8,1),

 (16,'aaaa0016-0016-4016-8016-000000000016',6,3,5,2,
  'Retinal Image Screening for Diabetic Retinopathy in Primary Care',
  'retinal-image-screening-diabetic-retinopathy-primary-care','research_paper',
  'A screening pipeline that flags referable diabetic retinopathy from handheld fundus images taken by non-specialist staff.',
  'Image quality gating precedes classification, so unusable captures are rejected at the point of care rather than producing a false negative.',
  'Retrospective evaluation on 6,100 images from two clinics, with grading by two ophthalmologists.',
  'Sensitivity 0.93 and specificity 0.87 for referable disease. 11% of captures were rejected for quality and retaken.',
  'diabetic retinopathy, screening, medical imaging','2024/2025',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 55 DAY),1,DATE_SUB(NOW(),INTERVAL 53 DAY),DATE_SUB(NOW(),INTERVAL 53 DAY),367,23,4,0),

 (17,'aaaa0017-0017-4017-8017-000000000017',9,2,7,1,
  'Firmware Attestation for Low-Cost Industrial Controllers',
  'firmware-attestation-low-cost-industrial-controllers','thesis',
  'A lightweight attestation scheme letting an operator verify controller firmware has not been altered, on hardware without a secure element.',
  'A challenge-response scheme over a memory checksum, with timing bounds that make emulation detectable.',
  'Implemented on three controller families and evaluated against a simulated adversary with full flash write access.',
  'Detected all 40 tampering attempts. Attestation completed within 220 ms.',
  'firmware, attestation, industrial control, security','2025/2026',1,0,NULL,
  'approved',DATE_SUB(NOW(),INTERVAL 15 DAY),1,DATE_SUB(NOW(),INTERVAL 13 DAY),DATE_SUB(NOW(),INTERVAL 13 DAY),149,7,1,0),

 (18,'aaaa0018-0018-4018-8018-000000000018',10,3,10,6,
  'Automatic Question Generation from Sinhala Textbook Passages',
  'automatic-question-generation-sinhala-textbook','research_paper',
  'A system that drafts comprehension questions from Sinhala school textbook passages for teachers to review and adapt.',
  NULL,NULL,NULL,
  'NLP, education, question generation','2025/2026',1,0,NULL,
  'pending',DATE_SUB(NOW(),INTERVAL 2 DAY),NULL,NULL,NULL,0,0,0,0),

 (19,'aaaa0019-0019-4019-8019-000000000019',11,4,6,3,
  'Solar Drying Tunnel Design for Chilli and Turmeric',
  'solar-drying-tunnel-chilli-turmeric','innovation',
  'A polytunnel dryer sized for quarter-acre smallholdings that cuts drying time by half while keeping produce off the ground.',
  NULL,NULL,NULL,
  'solar drying, spices, post-harvest','2025/2026',1,1,9000.00,
  'pending',DATE_SUB(NOW(),INTERVAL 1 DAY),NULL,NULL,NULL,0,0,0,0),

 (20,'aaaa0020-0020-4020-8020-000000000020',12,5,2,15,
  'Delivery Route Optimisation for Small Urban Retailers',
  'delivery-route-optimisation-small-urban-retailers','final_year_project',
  'A routing tool for shops running two or three vans, built around the constraint that drivers know the roads better than the algorithm does.',
  NULL,NULL,NULL,
  'routing, logistics, optimisation','2025/2026',1,0,NULL,
  'draft',NULL,NULL,NULL,NULL,0,0,0,0);

-- publication technologies
INSERT INTO publication_technologies (publication_id, technology_id) VALUES
 (8,9),(8,14),(8,5),(9,5),(9,6),(9,16),(10,7),(10,8),
 (11,5),(11,19),(12,5),(12,4),(13,5),(13,15),(14,1),(14,2),
 (15,11),(15,19),(15,6),(16,6),(16,16),(17,7),(17,14),(18,5),
 (19,7),(20,1),(20,2),(20,4);

-- publication authors
INSERT INTO publication_authors (publication_id, user_id, display_name, author_role, author_order) VALUES
 (8,9,'Ishara Wickramasinghe','lead',1),
 (8,5,'Dr. Nuwan Perera','supervisor',2),
 (9,10,'Tharindu Bandara','lead',1),
 (9,6,'Dr. Anjali Fernando','supervisor',2),
 (10,11,'Sanduni Rathnayake','lead',1),
 (11,13,'Prof. Chandima Silva','lead',1),
 (12,14,'Dr. Hasitha Gunawardena','lead',1),
 (13,15,'Dr. Menaka Dissanayake','lead',1),
 (14,12,'Dinuka Peris','lead',1),
 (15,5,'Dr. Nuwan Perera','lead',1),
 (16,6,'Dr. Anjali Fernando','lead',1),
 (17,9,'Ishara Wickramasinghe','lead',1),
 (18,10,'Tharindu Bandara','lead',1),
 (19,11,'Sanduni Rathnayake','lead',1),
 (20,12,'Dinuka Peris','lead',1);

-- publication documents
INSERT INTO publication_documents (publication_id, doc_type, file_name, file_url, file_size_kb, access_level) VALUES
 (8,'report','transformer-node-final-report.pdf','/uploads/docs/transformer-node-report.pdf',4820,'on_request'),
 (8,'dataset','eleven-month-field-log.csv','/uploads/docs/transformer-field-log.csv',2310,'on_request'),
 (9,'report','sinhala-ner-paper.pdf','/uploads/docs/sinhala-ner.pdf',1740,'public'),
 (10,'report','evaporative-store-build-guide.pdf','/uploads/docs/evaporative-store.pdf',6120,'public'),
 (11,'report','beam-crack-detection.pdf','/uploads/docs/beam-crack.pdf',3980,'on_request'),
 (12,'report','laterite-fluoride-study.pdf','/uploads/docs/laterite-fluoride.pdf',2870,'on_request'),
 (13,'dataset','coastal-landings-2023-2025.csv','/uploads/docs/coastal-landings.csv',15400,'on_request'),
 (14,'report','clinic-pwa-dissertation.pdf','/uploads/docs/clinic-pwa.pdf',5210,'private'),
 (15,'report','cinnamon-grading-report.pdf','/uploads/docs/cinnamon-grading.pdf',7340,'on_request'),
 (16,'report','retinopathy-screening-paper.pdf','/uploads/docs/retinopathy.pdf',3110,'public'),
 (17,'report','firmware-attestation-thesis.pdf','/uploads/docs/firmware-attestation.pdf',4460,'on_request'),
 (12,'slides','laterite-defence-slides.pdf','/uploads/docs/laterite-slides.pdf',1890,'public');

-- ---------------------------------------------------------------------
--  Verification requests : 1 -> 16
-- ---------------------------------------------------------------------
INSERT INTO verification_requests (user_id, university_id, evidence_url, note, status, reviewed_by, reviewed_at, review_note, created_at) VALUES
 (9,2,'/uploads/evidence/en18452.pdf','Student record card','approved',16,DATE_SUB(NOW(),INTERVAL 70 DAY),'Verified against faculty roll.',DATE_SUB(NOW(),INTERVAL 72 DAY)),
 (10,3,'/uploads/evidence/cs22118.pdf','Postgraduate enrolment letter','approved',2,DATE_SUB(NOW(),INTERVAL 64 DAY),'Confirmed with the Faculty of Science.',DATE_SUB(NOW(),INTERVAL 66 DAY)),
 (11,4,'/uploads/evidence/ag19233.pdf','Student identity card','pending',NULL,NULL,NULL,DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (12,5,'/uploads/evidence/se20871.pdf','Enrolment confirmation','pending',NULL,NULL,NULL,DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (13,4,'/uploads/evidence/staff-chandima.pdf','Staff identity card','approved',17,DATE_SUB(NOW(),INTERVAL 96 DAY),'Departmental confirmation received.',DATE_SUB(NOW(),INTERVAL 98 DAY)),
 (14,6,'/uploads/evidence/staff-hasitha.pdf','Staff appointment letter','approved',2,DATE_SUB(NOW(),INTERVAL 88 DAY),'Verified.',DATE_SUB(NOW(),INTERVAL 90 DAY)),
 (15,7,'/uploads/evidence/staff-menaka.pdf','Staff identity card','approved',2,DATE_SUB(NOW(),INTERVAL 80 DAY),'Verified.',DATE_SUB(NOW(),INTERVAL 82 DAY)),
 (16,2,'/uploads/evidence/ilc-authorisation.pdf','Centre authorisation letter','approved',1,DATE_SUB(NOW(),INTERVAL 120 DAY),'Institutional account approved.',DATE_SUB(NOW(),INTERVAL 121 DAY)),
 (17,4,'/uploads/evidence/pdn-research-office.pdf','Office authorisation letter','approved',1,DATE_SUB(NOW(),INTERVAL 118 DAY),'Institutional account approved.',DATE_SUB(NOW(),INTERVAL 119 DAY)),
 (3,1,'/uploads/evidence/sltc-student-3.pdf','Student identity card','approved',2,DATE_SUB(NOW(),INTERVAL 110 DAY),'Verified against faculty roll.',DATE_SUB(NOW(),INTERVAL 112 DAY)),
 (5,2,'/uploads/evidence/staff-nuwan.pdf','Staff identity card','approved',16,DATE_SUB(NOW(),INTERVAL 105 DAY),'Verified.',DATE_SUB(NOW(),INTERVAL 106 DAY)),
 (6,3,'/uploads/evidence/staff-anjali.pdf','Staff identity card','approved',2,DATE_SUB(NOW(),INTERVAL 100 DAY),'Verified.',DATE_SUB(NOW(),INTERVAL 101 DAY)),
 (2,1,'/uploads/evidence/sltc-cell.pdf','Institutional authorisation','approved',1,DATE_SUB(NOW(),INTERVAL 130 DAY),'Institutional account approved.',DATE_SUB(NOW(),INTERVAL 131 DAY));

-- ---------------------------------------------------------------------
--  Saved publications : 0 -> 18
-- ---------------------------------------------------------------------
INSERT INTO saved_publications (user_id, publication_id, collection, saved_at) VALUES
 (18,8,'Automation shortlist',DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (18,15,'Automation shortlist',DATE_SUB(NOW(),INTERVAL 16 DAY)),
 (18,17,'Automation shortlist',DATE_SUB(NOW(),INTERVAL 10 DAY)),
 (18,11,NULL,DATE_SUB(NOW(),INTERVAL 44 DAY)),
 (19,10,'Cold chain',DATE_SUB(NOW(),INTERVAL 26 DAY)),
 (19,19,'Cold chain',DATE_SUB(NOW(),INTERVAL 1 DAY)),
 (19,13,NULL,DATE_SUB(NOW(),INTERVAL 33 DAY)),
 (20,15,'Deal flow',DATE_SUB(NOW(),INTERVAL 14 DAY)),
 (20,12,'Deal flow',DATE_SUB(NOW(),INTERVAL 22 DAY)),
 (20,8,'Deal flow',DATE_SUB(NOW(),INTERVAL 29 DAY)),
 (20,10,NULL,DATE_SUB(NOW(),INTERVAL 18 DAY)),
 (8,15,'Watchlist',DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (8,16,'Watchlist',DATE_SUB(NOW(),INTERVAL 40 DAY)),
 (7,9,NULL,DATE_SUB(NOW(),INTERVAL 21 DAY)),
 (7,14,NULL,DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (5,12,NULL,DATE_SUB(NOW(),INTERVAL 25 DAY)),
 (6,8,NULL,DATE_SUB(NOW(),INTERVAL 19 DAY)),
 (13,17,NULL,DATE_SUB(NOW(),INTERVAL 7 DAY));

-- ---------------------------------------------------------------------
--  Publication feedback : 3 -> 18
-- ---------------------------------------------------------------------
INSERT INTO publication_feedback (publication_id, user_id, rating, comment, created_at) VALUES
 (8,18,5,'The eighteen-month battery figure is the part that matters for us. We would want to see the duty-cycle configuration.',DATE_SUB(NOW(),INTERVAL 28 DAY)),
 (8,20,4,'Strong field validation. Costing per node is missing.',DATE_SUB(NOW(),INTERVAL 26 DAY)),
 (8,13,5,'Clean instrumentation work and honest about the failure cases.',DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (9,6,5,'Releasing the annotated corpus alongside the paper is the right decision.',DATE_SUB(NOW(),INTERVAL 40 DAY)),
 (9,10,4,'Would like to see performance on transliterated text.',DATE_SUB(NOW(),INTERVAL 35 DAY)),
 (10,19,5,'We have farms that would take this tomorrow. Build cost is credible.',DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (10,11,4,'Good work. The control comparison could be larger.',DATE_SUB(NOW(),INTERVAL 27 DAY)),
 (11,18,4,'Useful for our bridge inspection contracts.',DATE_SUB(NOW(),INTERVAL 60 DAY)),
 (12,20,5,'Cost argument is the standout. Interested in scale-up.',DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (12,14,4,'Column trial length is appropriate for the claim.',DATE_SUB(NOW(),INTERVAL 18 DAY)),
 (13,15,5,'A genuinely reusable dataset with an honest gaps register.',DATE_SUB(NOW(),INTERVAL 50 DAY)),
 (14,6,4,'The conflict-resolution design is sensible for clinical notes.',DATE_SUB(NOW(),INTERVAL 15 DAY)),
 (15,18,5,'Throughput and agreement figures are both above what we need.',DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (15,20,5,'Clear commercial path. We have asked for a meeting.',DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (15,19,4,'Would want to see it on lower grades of quill.',DATE_SUB(NOW(),INTERVAL 7 DAY)),
 (16,5,5,'Rejecting unusable captures at the point of care is the correct design choice.',DATE_SUB(NOW(),INTERVAL 45 DAY)),
 (17,18,4,'Relevant to our controller fleet.',DATE_SUB(NOW(),INTERVAL 8 DAY));

-- ---------------------------------------------------------------------
--  Collaboration and investment requests : 6 -> 18
-- ---------------------------------------------------------------------
INSERT INTO collaboration_requests
 (publication_id, requester_id, recipient_id, request_type, subject, message, proposed_amount, status, response_note, responded_at, created_at) VALUES
 (8,18,9,'collaboration','Pilot on our plant substation',
  'We run three substations at our Ekala plant and would like to trial six nodes over a quarter, with our maintenance team logging faults independently.',NULL,
  'accepted','Happy to run the pilot. I can supply six units by the end of the month.',DATE_SUB(NOW(),INTERVAL 25 DAY),DATE_SUB(NOW(),INTERVAL 28 DAY)),
 (8,20,9,'investment','Seed funding for a production run',
  'We would fund a 200-unit production run and the certification work in exchange for a minority stake. Happy to discuss structure.',22000.00,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (15,18,5,'collaboration','Deployment at our cinnamon processing line',
  'We process about four tonnes a week and grading is our bottleneck. We would like to install the rig on one line and measure against our graders.',NULL,
  'accepted','Yes. I would want two weeks of your images first to check the lighting.',DATE_SUB(NOW(),INTERVAL 14 DAY),DATE_SUB(NOW(),INTERVAL 16 DAY)),
 (15,20,5,'investment','Series seed for commercialisation',
  'This is the clearest commercial path we have seen this quarter. We would like to lead a seed round.',45000.00,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 6 DAY)),
 (10,19,11,'collaboration','Deployment across our outgrower network',
  'We work with roughly 400 smallholders in Matale and Nuwara Eliya. We would fund twenty units and collect the loss data for you.',NULL,
  'accepted','That would give us a much bigger sample than the original trial. Yes.',DATE_SUB(NOW(),INTERVAL 20 DAY),DATE_SUB(NOW(),INTERVAL 23 DAY)),
 (10,20,11,'investment','Funding to build a manufacturing partner',
  'Interested in funding tooling and a local fabrication partner rather than unit sales.',12000.00,
  'declined','I want to finish the field data before taking investment.',DATE_SUB(NOW(),INTERVAL 15 DAY),DATE_SUB(NOW(),INTERVAL 18 DAY)),
 (12,20,14,'investment','Scale-up of the filtration media',
  'We would fund a pilot plant to produce activated laterite at volume for the dry zone.',18000.00,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (12,19,14,'collaboration','Trial in our estate housing supply',
  'We supply water to about 900 estate households and fluoride is a persistent complaint.',NULL,
  'accepted','Send me the water analysis and I will size a column for you.',DATE_SUB(NOW(),INTERVAL 10 DAY),DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (9,18,10,'collaboration','Sinhala entity extraction for our support desk',
  'We handle a large volume of Sinhala support tickets and want to route them automatically.',NULL,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (11,18,13,'collaboration','Bridge inspection contract work',
  'We hold two provincial inspection contracts. Interested in whether the method can be applied under live traffic.',NULL,
  'accepted','It can, and that is the point of the ambient approach. Let us talk.',DATE_SUB(NOW(),INTERVAL 55 DAY),DATE_SUB(NOW(),INTERVAL 58 DAY)),
 (16,18,6,'collaboration','Screening pilot with our occupational health service',
  'We run annual health checks for about 1,200 staff and would like to add retinal screening.',NULL,
  'declined','This needs ethics approval that I cannot arrange this year.',DATE_SUB(NOW(),INTERVAL 40 DAY),DATE_SUB(NOW(),INTERVAL 44 DAY)),
 (13,19,15,'collaboration','Sourcing data for our seafood traceability work',
  'We would like to use the landing records to validate our traceability model.',NULL,
  'accepted','Happy to share under a data agreement.',DATE_SUB(NOW(),INTERVAL 60 DAY),DATE_SUB(NOW(),INTERVAL 63 DAY)),
 (14,18,12,'collaboration','Adapting the offline sync layer',
  'Our field engineers work without signal for days. The sync design looks directly reusable.',NULL,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 2 DAY)),
 (17,18,9,'collaboration','Attestation across our controller fleet',
  'We have roughly 300 controllers of two families in service and no way to verify firmware today.',NULL,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 7 DAY)),
 (16,20,6,'investment','Funding a regional screening rollout',
  'Interested in funding a rollout across primary care clinics in three provinces.',60000.00,
  'withdrawn',NULL,NULL,DATE_SUB(NOW(),INTERVAL 35 DAY)),
 (8,19,9,'collaboration','Monitoring on our cold store transformers',
  'Our cold stores lose product when transformers fail. Interested in a small trial.',NULL,
  'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 1 DAY));

-- ---------------------------------------------------------------------
--  Meeting requests : 2 -> 16
-- ---------------------------------------------------------------------
INSERT INTO meeting_requests
 (publication_id, requester_id, recipient_id, title, agenda, meeting_mode, location, meeting_link,
  proposed_start, proposed_end, status, response_note, responded_at, created_at) VALUES
 (15,20,5,'Seed round structure','Valuation, use of funds, and the manufacturing plan.','online',NULL,'https://meet.example.com/pv-cinnamon',
  DATE_ADD(NOW(),INTERVAL 3 DAY),DATE_ADD(NOW(),INTERVAL 3 DAY)+INTERVAL 45 MINUTE,'accepted','Thursday works.',DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 6 DAY)),
 (15,18,5,'Line trial planning','Camera mounting, lighting, and the measurement protocol.','onsite','Hexa Labs, Ekala',NULL,
  DATE_ADD(NOW(),INTERVAL 6 DAY),DATE_ADD(NOW(),INTERVAL 6 DAY)+INTERVAL 60 MINUTE,'accepted','I will bring the reference rig.',DATE_SUB(NOW(),INTERVAL 8 DAY),DATE_SUB(NOW(),INTERVAL 10 DAY)),
 (8,20,9,'Production run costing','Unit economics at 200 units and certification requirements.','online',NULL,'https://meet.example.com/pv-transformer',
  DATE_ADD(NOW(),INTERVAL 2 DAY),DATE_ADD(NOW(),INTERVAL 2 DAY)+INTERVAL 45 MINUTE,'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 2 DAY)),
 (8,18,9,'Substation pilot kickoff','Node placement and the independent fault log.','onsite','Ekala plant',NULL,
  DATE_ADD(NOW(),INTERVAL 9 DAY),DATE_ADD(NOW(),INTERVAL 9 DAY)+INTERVAL 90 MINUTE,'accepted','Confirmed.',DATE_SUB(NOW(),INTERVAL 20 DAY),DATE_SUB(NOW(),INTERVAL 22 DAY)),
 (12,20,14,'Pilot plant scope','Throughput target, siting, and regulatory questions.','online',NULL,'https://meet.example.com/pv-laterite',
  DATE_ADD(NOW(),INTERVAL 4 DAY),DATE_ADD(NOW(),INTERVAL 4 DAY)+INTERVAL 60 MINUTE,'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (12,19,14,'Estate water trial','Water analysis review and column sizing.','online',NULL,'https://meet.example.com/pv-estate',
  DATE_ADD(NOW(),INTERVAL 7 DAY),DATE_ADD(NOW(),INTERVAL 7 DAY)+INTERVAL 45 MINUTE,'accepted','Send the analysis beforehand.',DATE_SUB(NOW(),INTERVAL 9 DAY),DATE_SUB(NOW(),INTERVAL 11 DAY)),
 (10,19,11,'Outgrower rollout','Unit count, siting and who collects the loss data.','online',NULL,'https://meet.example.com/pv-coldstore',
  DATE_ADD(NOW(),INTERVAL 5 DAY),DATE_ADD(NOW(),INTERVAL 5 DAY)+INTERVAL 60 MINUTE,'accepted','Yes, and I will bring the trial protocol.',DATE_SUB(NOW(),INTERVAL 18 DAY),DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (11,18,13,'Live-traffic inspection method','Sensor placement and traffic management implications.','onsite','Peradeniya',NULL,
  DATE_SUB(NOW(),INTERVAL 40 DAY),DATE_SUB(NOW(),INTERVAL 40 DAY)+INTERVAL 90 MINUTE,'completed','Useful session.',DATE_SUB(NOW(),INTERVAL 50 DAY),DATE_SUB(NOW(),INTERVAL 54 DAY)),
 (16,20,6,'Screening rollout economics','Cost per screen and clinic staffing.','online',NULL,NULL,
  DATE_SUB(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 30 DAY)+INTERVAL 45 MINUTE,'declined','I withdrew from this discussion.',DATE_SUB(NOW(),INTERVAL 34 DAY),DATE_SUB(NOW(),INTERVAL 36 DAY)),
 (13,19,15,'Data sharing agreement','Scope of use and attribution.','online',NULL,'https://meet.example.com/pv-fisheries',
  DATE_SUB(NOW(),INTERVAL 55 DAY),DATE_SUB(NOW(),INTERVAL 55 DAY)+INTERVAL 45 MINUTE,'completed','Agreement signed.',DATE_SUB(NOW(),INTERVAL 58 DAY),DATE_SUB(NOW(),INTERVAL 60 DAY)),
 (9,18,10,'Ticket routing proof of concept','Sample tickets and accuracy expectations.','online',NULL,NULL,
  DATE_ADD(NOW(),INTERVAL 8 DAY),DATE_ADD(NOW(),INTERVAL 8 DAY)+INTERVAL 30 MINUTE,'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 2 DAY)),
 (17,18,9,'Attestation on our controller families','Which families, and what an integration would involve.','online',NULL,NULL,
  DATE_ADD(NOW(),INTERVAL 10 DAY),DATE_ADD(NOW(),INTERVAL 10 DAY)+INTERVAL 45 MINUTE,'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (14,18,12,'Reusing the sync layer','Licensing and how much of it is portable.','online',NULL,NULL,
  DATE_ADD(NOW(),INTERVAL 11 DAY),DATE_ADD(NOW(),INTERVAL 11 DAY)+INTERVAL 45 MINUTE,'pending',NULL,NULL,DATE_SUB(NOW(),INTERVAL 1 DAY)),
 (10,20,11,'Manufacturing partner discussion','Tooling cost and a local fabricator.','online',NULL,NULL,
  DATE_SUB(NOW(),INTERVAL 16 DAY),DATE_SUB(NOW(),INTERVAL 16 DAY)+INTERVAL 45 MINUTE,'declined','Not taking investment yet.',DATE_SUB(NOW(),INTERVAL 17 DAY),DATE_SUB(NOW(),INTERVAL 19 DAY));

-- ---------------------------------------------------------------------
--  Products : 6 -> 18
-- ---------------------------------------------------------------------
INSERT INTO products
 (id, uuid, seller_id, publication_id, category_id, title, slug, short_description, description,
  product_type, condition_type, price, compare_at_price, stock_quantity, is_digital, digital_file_url,
  shipping_fee, ships_from_city, status, approved_by, approved_at, view_count, sold_count) VALUES
 (7,'bbbb0007-0007-4007-8007-000000000007',9,8,1,'Transformer Monitoring Node — assembled unit',
  'transformer-monitoring-node-assembled','Assembled LoRaWAN sensor node with clamp, probe and enclosure.',
  'Fully assembled and calibrated. Supplied with a current clamp, PT100 probe, IP65 enclosure and a configuration guide.',
  'physical','new',18500.00,21000.00,12,0,NULL,850.00,'Moratuwa','active',1,DATE_SUB(NOW(),INTERVAL 55 DAY),244,7),
 (8,'bbbb0008-0008-4008-8008-000000000008',9,8,3,'Eleven-Month Transformer Field Dataset',
  'eleven-month-transformer-field-dataset','Temperature, load and vibration traces from nine transformers.',
  'Cleaned CSV with a documented schema, including the two pre-failure episodes annotated by the maintenance team.',
  'dataset','not_applicable',6500.00,NULL,0,1,'/uploads/products/transformer-dataset.zip',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 50 DAY),167,11),
 (9,'bbbb0009-0009-4009-8009-000000000009',10,9,3,'Sinhala NER Annotated Corpus (9,400 sentences)',
  'sinhala-ner-annotated-corpus','Hand-annotated Sinhala news sentences with entity spans.',
  'Three-annotator corpus with adjudicated labels, released in CoNLL and JSON formats with an annotation guideline document.',
  'dataset','not_applicable',9200.00,NULL,0,1,'/uploads/products/sinhala-ner-corpus.zip',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 44 DAY),298,14),
 (10,'bbbb0010-0010-4010-8010-000000000010',11,10,7,'Evaporative Cold Store — build drawings and bill of materials',
  'evaporative-cold-store-build-drawings','Dimensioned drawings, materials list and costing for a 200 kg unit.',
  'Everything needed to build the store, including supplier notes for the sand grade and the drip line.',
  'digital','not_applicable',3200.00,4000.00,0,1,'/uploads/products/cold-store-drawings.pdf',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 36 DAY),412,23),
 (11,'bbbb0011-0011-4011-8011-000000000011',13,11,6,'Structural Vibration Survey — per span',
  'structural-vibration-survey-per-span','Ambient vibration measurement and damage-index reporting.',
  'On-site accelerometer survey of a single span with a written report locating any stiffness loss. Travel charged separately outside the Central Province.',
  'service','not_applicable',72000.00,NULL,0,1,NULL,0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 80 DAY),131,4),
 (12,'bbbb0012-0012-4012-8012-000000000012',14,12,2,'Activated Laterite Filtration Media — 5 kg',
  'activated-laterite-filtration-media-5kg','Thermally activated laterite graded for column use.',
  'Activated at 400 C and sieved to 0.6 to 1.2 mm. Supplied with a column sizing sheet.',
  'physical','new',4400.00,NULL,26,0,NULL,600.00,'Kelaniya','active',1,DATE_SUB(NOW(),INTERVAL 30 DAY),189,9),
 (13,'bbbb0013-0013-4013-8013-000000000013',15,13,3,'Southern Coastal Landings Dataset 2023–2025',
  'southern-coastal-landings-dataset','41,200 landing records across six southern sites.',
  'Harmonised schema with species codes, effort and a documented known-gaps register. Supplied under an attribution licence.',
  'dataset','not_applicable',11000.00,NULL,0,1,'/uploads/products/coastal-landings.zip',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 66 DAY),143,6),
 (14,'bbbb0014-0014-4014-8014-000000000014',5,15,1,'Cinnamon Grading Rig — reference build',
  'cinnamon-grading-rig-reference-build','Backlit conveyor section, line-scan camera mount and edge box.',
  'Reference hardware matching the published build. Model weights and the deployment guide are supplied separately under licence.',
  'physical','prototype',186000.00,NULL,3,0,NULL,4500.00,'Moratuwa','active',1,DATE_SUB(NOW(),INTERVAL 15 DAY),377,2),
 (15,'bbbb0015-0015-4015-8015-000000000015',5,15,4,'Cinnamon Grading Model — commercial licence',
  'cinnamon-grading-model-commercial-licence','Trained model weights with a one-year commercial licence.',
  'Includes the inference container, the calibration procedure and one year of retraining support.',
  'license','not_applicable',145000.00,NULL,0,1,'/uploads/products/cinnamon-model-licence.pdf',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 14 DAY),221,3),
 (16,'bbbb0016-0016-4016-8016-000000000016',12,14,4,'Offline Sync Layer — source licence',
  'offline-sync-layer-source-licence','The conflict-resolution layer as a reusable library.',
  'TypeScript source with tests and an integration guide, licensed for use in one product.',
  'license','not_applicable',38000.00,45000.00,0,1,'/uploads/products/sync-layer-licence.zip',0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 20 DAY),164,5),
 (17,'bbbb0017-0017-4017-8017-000000000017',6,16,6,'Retinal Image Grading — research service',
  'retinal-image-grading-research-service','Ophthalmologist-adjudicated grading for research datasets.',
  'Double grading with adjudication of disagreements, priced per hundred images.',
  'service','not_applicable',26000.00,NULL,0,1,NULL,0.00,NULL,'active',1,DATE_SUB(NOW(),INTERVAL 48 DAY),97,3),
 (18,'bbbb0018-0018-4018-8018-000000000018',11,10,1,'Solar Drip Pump Kit for Evaporative Stores',
  'solar-drip-pump-kit-evaporative-stores','Panel, pump, controller and drip line sized for a 200 kg store.',
  'Matched components so the store keeps its sand cavity damp without a grid connection.',
  'physical','new',12800.00,14500.00,0,0,NULL,900.00,'Kandy','active',1,DATE_SUB(NOW(),INTERVAL 25 DAY),208,16),
 (19,'bbbb0019-0019-4019-8019-000000000019',9,17,4,'Firmware Attestation Reference Implementation',
  'firmware-attestation-reference-implementation','C implementation for three controller families.',
  'Source, test harness and the porting notes described in the thesis.',
  'license','not_applicable',22000.00,NULL,0,1,'/uploads/products/attestation-reference.zip',0.00,NULL,'pending',NULL,NULL,41,0),
 (20,'bbbb0020-0020-4020-8020-000000000020',14,12,5,'Bench Column Test Rig — laterite studies',
  'bench-column-test-rig-laterite','Three-column bench rig with peristaltic feed.',
  'Assembled rig for replicating the published column studies, supplied without media.',
  'physical','used',56000.00,NULL,2,0,NULL,2500.00,'Kelaniya','pending',NULL,NULL,29,0);

-- product images
INSERT INTO product_images (product_id, image_url, alt_text, position) VALUES
 (7,'/uploads/products/node-1.jpg','Assembled sensor node in enclosure',1),
 (7,'/uploads/products/node-2.jpg','Node mounted on a transformer',2),
 (10,'/uploads/products/coldstore-1.jpg','Completed evaporative store',1),
 (12,'/uploads/products/laterite-1.jpg','Graded activated laterite',1),
 (14,'/uploads/products/rig-1.jpg','Grading rig on the conveyor line',1),
 (14,'/uploads/products/rig-2.jpg','Line-scan camera mount',2),
 (18,'/uploads/products/pump-1.jpg','Solar drip pump kit contents',1),
 (20,'/uploads/products/column-rig-1.jpg','Three-column bench rig',1);

-- product attributes
INSERT INTO product_attributes (product_id, attr_name, attr_value) VALUES
 (7,'Radio','LoRaWAN 868 MHz'),
 (7,'Battery life','18 months typical'),
 (7,'Ingress rating','IP65'),
 (9,'Sentences','9,400'),
 (9,'Formats','CoNLL, JSON'),
 (12,'Grain size','0.6 – 1.2 mm'),
 (12,'Activation','400 C'),
 (14,'Throughput','340 quills per minute'),
 (14,'Camera','Line scan, 4096 px'),
 (18,'Panel','50 W monocrystalline');

-- ---------------------------------------------------------------------
--  Addresses : 3 -> 16
-- ---------------------------------------------------------------------
INSERT INTO addresses (user_id, label, recipient_name, phone, line1, line2, city, district, postal_code, country, is_default) VALUES
 (9,'Home','Ishara Wickramasinghe','0771002001','24/3 Galle Road',NULL,'Moratuwa','Colombo','10400','Sri Lanka',1),
 (10,'Home','Tharindu Bandara','0771002002','112 Baseline Road','Apartment 4B','Colombo','Colombo','00900','Sri Lanka',1),
 (11,'Home','Sanduni Rathnayake','0771002003','7 Peradeniya Road',NULL,'Kandy','Kandy','20000','Sri Lanka',1),
 (12,'Home','Dinuka Peris','0771002004','56 Highlevel Road',NULL,'Homagama','Colombo','10200','Sri Lanka',1),
 (13,'Office','Prof. Chandima Silva','0812395001','Department of Civil Engineering','University of Peradeniya','Kandy','Kandy','20400','Sri Lanka',1),
 (14,'Office','Dr. Hasitha Gunawardena','0112903001','Department of Chemistry','University of Kelaniya','Kelaniya','Gampaha','11600','Sri Lanka',1),
 (15,'Office','Dr. Menaka Dissanayake','0412222001','Department of Fisheries Biology','University of Ruhuna','Matara','Matara','81000','Sri Lanka',1),
 (18,'Plant','Nadeesha Ekanayake','0114500900','Hexa Labs, Ekala Industrial Zone',NULL,'Ja-Ela','Gampaha','11350','Sri Lanka',1),
 (18,'Head office','Nadeesha Ekanayake','0114500900','44 Union Place',NULL,'Colombo','Colombo','00200','Sri Lanka',0),
 (19,'Warehouse','Ruwan Abeysekara','0114500901','Greenfield Agro, Mihintale Road',NULL,'Anuradhapura','Anuradhapura','50000','Sri Lanka',1),
 (20,'Office','Dilshan Mendis','0114500902','8 Sir Baron Jayatilaka Mawatha','Level 6','Colombo','Colombo','00100','Sri Lanka',1),
 (5,'Department','Dr. Nuwan Perera','0112640000','Department of Electronic Engineering','University of Moratuwa','Moratuwa','Colombo','10400','Sri Lanka',1),
 (6,'Department','Dr. Anjali Fernando','0112581835','Faculty of Medicine','University of Colombo','Colombo','Colombo','00800','Sri Lanka',1);

-- ---------------------------------------------------------------------
--  Orders : 3 -> 16, order items -> 20
-- ---------------------------------------------------------------------
INSERT INTO orders (id, order_no, buyer_id, shipping_address_id, subtotal, shipping_total, platform_fee,
                    grand_total, order_status, payment_status, gateway_reference, placed_at) VALUES
 (4,'PV-2026-000004',18,8,37000.00,1700.00,1850.00,40550.00,'delivered','paid','pay_demo_0004',DATE_SUB(NOW(),INTERVAL 48 DAY)),
 (5,'PV-2026-000005',18,8,6500.00,0.00,325.00,6825.00,'delivered','paid','pay_demo_0005',DATE_SUB(NOW(),INTERVAL 45 DAY)),
 (6,'PV-2026-000006',19,10,3200.00,0.00,160.00,3360.00,'delivered','paid','pay_demo_0006',DATE_SUB(NOW(),INTERVAL 34 DAY)),
 (7,'PV-2026-000007',19,10,25600.00,1800.00,1280.00,28680.00,'delivered','paid','pay_demo_0007',DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (8,'PV-2026-000008',20,11,9200.00,0.00,460.00,9660.00,'delivered','paid','pay_demo_0008',DATE_SUB(NOW(),INTERVAL 28 DAY)),
 (9,'PV-2026-000009',18,8,9200.00,0.00,460.00,9660.00,'delivered','paid','pay_demo_0009',DATE_SUB(NOW(),INTERVAL 26 DAY)),
 (10,'PV-2026-000010',7,3,11000.00,0.00,550.00,11550.00,'delivered','paid','pay_demo_0010',DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (11,'PV-2026-000011',19,10,8800.00,1200.00,440.00,10440.00,'shipped','paid','pay_demo_0011',DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (12,'PV-2026-000012',18,8,38000.00,0.00,1900.00,39900.00,'delivered','paid','pay_demo_0012',DATE_SUB(NOW(),INTERVAL 18 DAY)),
 (13,'PV-2026-000013',20,11,3200.00,0.00,160.00,3360.00,'delivered','paid','pay_demo_0013',DATE_SUB(NOW(),INTERVAL 16 DAY)),
 (14,'PV-2026-000014',19,10,12800.00,900.00,640.00,14340.00,'shipped','paid','pay_demo_0014',DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (15,'PV-2026-000015',18,9,26000.00,0.00,1300.00,27300.00,'processing','paid','pay_demo_0015',DATE_SUB(NOW(),INTERVAL 6 DAY)),
 (16,'PV-2026-000016',7,3,6500.00,0.00,325.00,6825.00,'processing','paid','pay_demo_0016',DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (17,'PV-2026-000017',20,11,11000.00,0.00,550.00,11550.00,'pending','unpaid',NULL,DATE_SUB(NOW(),INTERVAL 1 DAY));

INSERT INTO order_items (order_id, product_id, seller_id, title_snapshot, unit_price, quantity, line_total, item_status, tracking_no) VALUES
 (4,7,9,'Transformer Monitoring Node — assembled unit',18500.00,2,37000.00,'delivered','SLP4471209'),
 (5,8,9,'Eleven-Month Transformer Field Dataset',6500.00,1,6500.00,'delivered',NULL),
 (6,10,11,'Evaporative Cold Store — build drawings and bill of materials',3200.00,1,3200.00,'delivered',NULL),
 (7,12,14,'Activated Laterite Filtration Media — 5 kg',4400.00,4,17600.00,'delivered','SLP4471884'),
 (7,18,11,'Solar Drip Pump Kit for Evaporative Stores',12800.00,1,12800.00,'delivered','SLP4471885'),
 (8,9,10,'Sinhala NER Annotated Corpus (9,400 sentences)',9200.00,1,9200.00,'delivered',NULL),
 (9,9,10,'Sinhala NER Annotated Corpus (9,400 sentences)',9200.00,1,9200.00,'delivered',NULL),
 (10,13,15,'Southern Coastal Landings Dataset 2023–2025',11000.00,1,11000.00,'delivered',NULL),
 (11,12,14,'Activated Laterite Filtration Media — 5 kg',4400.00,2,8800.00,'shipped','SLP4472310'),
 (12,16,12,'Offline Sync Layer — source licence',38000.00,1,38000.00,'delivered',NULL),
 (13,10,11,'Evaporative Cold Store — build drawings and bill of materials',3200.00,1,3200.00,'delivered',NULL),
 (14,18,11,'Solar Drip Pump Kit for Evaporative Stores',12800.00,1,12800.00,'shipped','SLP4472644'),
 (15,17,6,'Retinal Image Grading — research service',26000.00,1,26000.00,'confirmed',NULL),
 (16,8,9,'Eleven-Month Transformer Field Dataset',6500.00,1,6500.00,'confirmed',NULL),
 (17,13,15,'Southern Coastal Landings Dataset 2023–2025',11000.00,1,11000.00,'pending',NULL);

-- ---------------------------------------------------------------------
--  Product reviews : 2 -> 16
-- ---------------------------------------------------------------------
INSERT INTO product_reviews (product_id, buyer_id, rating, comment, created_at) VALUES
 (7,18,5,'Arrived calibrated and the mounting was straightforward. Two units running since March.',DATE_SUB(NOW(),INTERVAL 40 DAY)),
 (8,18,4,'Well documented. The annotated failure episodes are the useful part.',DATE_SUB(NOW(),INTERVAL 38 DAY)),
 (9,20,5,'Annotation guideline is clear and the adjudication notes are included. Rare.',DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (9,18,5,'Saved us months of labelling work.',DATE_SUB(NOW(),INTERVAL 22 DAY)),
 (10,19,5,'Drawings were enough for our fabricator to build without questions.',DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (10,20,4,'Good value. A materials cost update for this year would help.',DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (12,19,4,'Consistent grain size. Column sizing sheet was accurate for our flow.',DATE_SUB(NOW(),INTERVAL 26 DAY)),
 (13,7,5,'Clean schema and an honest gaps register. Exactly what we needed.',DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (16,18,4,'Integrated in about a week. Tests were genuinely useful.',DATE_SUB(NOW(),INTERVAL 14 DAY)),
 (18,19,5,'Matched components meant no sizing guesswork.',DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (7,19,4,'Solid build. Shipping took longer than expected.',DATE_SUB(NOW(),INTERVAL 18 DAY)),
 (12,18,5,'Second order. Consistent between batches.',DATE_SUB(NOW(),INTERVAL 8 DAY)),
 (8,7,4,'Useful for benchmarking our own monitoring work.',DATE_SUB(NOW(),INTERVAL 2 DAY)),
 (13,20,5,'Well curated. Attribution terms are reasonable.',DATE_SUB(NOW(),INTERVAL 15 DAY));

-- ---------------------------------------------------------------------
--  Seller payouts
-- ---------------------------------------------------------------------
INSERT INTO seller_payouts (seller_id, order_item_id, gross_amount, fee_amount, net_amount, status, paid_at) VALUES
 (9,(SELECT id FROM order_items WHERE order_id=4 LIMIT 1),37000.00,1850.00,35150.00,'paid',DATE_SUB(NOW(),INTERVAL 40 DAY)),
 (9,(SELECT id FROM order_items WHERE order_id=5 LIMIT 1),6500.00,325.00,6175.00,'paid',DATE_SUB(NOW(),INTERVAL 38 DAY)),
 (11,(SELECT id FROM order_items WHERE order_id=6 LIMIT 1),3200.00,160.00,3040.00,'paid',DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (10,(SELECT id FROM order_items WHERE order_id=8 LIMIT 1),9200.00,460.00,8740.00,'paid',DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (15,(SELECT id FROM order_items WHERE order_id=10 LIMIT 1),11000.00,550.00,10450.00,'paid',DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (12,(SELECT id FROM order_items WHERE order_id=12 LIMIT 1),38000.00,1900.00,36100.00,'paid',DATE_SUB(NOW(),INTERVAL 14 DAY)),
 (14,(SELECT id FROM order_items WHERE order_id=11 LIMIT 1),8800.00,440.00,8360.00,'pending',NULL),
 (11,(SELECT id FROM order_items WHERE order_id=14 LIMIT 1),12800.00,640.00,12160.00,'pending',NULL),
 (6,(SELECT id FROM order_items WHERE order_id=15 LIMIT 1),26000.00,1300.00,24700.00,'pending',NULL);

-- ---------------------------------------------------------------------
--  Conversations opened by accepted requests
-- ---------------------------------------------------------------------
INSERT INTO conversations (id, subject, publication_id, last_message_at) VALUES
 (2,'Pilot on our plant substation',8,DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (3,'Deployment at our cinnamon processing line',15,DATE_SUB(NOW(),INTERVAL 13 DAY)),
 (4,'Deployment across our outgrower network',10,DATE_SUB(NOW(),INTERVAL 19 DAY)),
 (5,'Trial in our estate housing supply',12,DATE_SUB(NOW(),INTERVAL 9 DAY));

INSERT INTO conversation_participants (conversation_id, user_id) VALUES
 (2,18),(2,9),(3,18),(3,5),(4,19),(4,11),(5,19),(5,14);

INSERT INTO messages (conversation_id, sender_id, body, sent_at) VALUES
 (2,9,'Happy to run the pilot. I can supply six units by the end of the month.',DATE_SUB(NOW(),INTERVAL 25 DAY)),
 (2,18,'That works. Our maintenance lead will keep an independent fault log so we are not marking our own homework.',DATE_SUB(NOW(),INTERVAL 24 DAY)),
 (3,5,'Yes. I would want two weeks of your images first to check the lighting.',DATE_SUB(NOW(),INTERVAL 14 DAY)),
 (3,18,'Sending a sample set tomorrow. Our line runs warmer than a lab, so worth checking drift.',DATE_SUB(NOW(),INTERVAL 13 DAY)),
 (4,11,'That would give us a much bigger sample than the original trial. Yes.',DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (4,19,'We will fund twenty units. Can you supply the build drawings for our fabricator?',DATE_SUB(NOW(),INTERVAL 19 DAY)),
 (5,14,'Send me the water analysis and I will size a column for you.',DATE_SUB(NOW(),INTERVAL 10 DAY)),
 (5,19,'Attached. Fluoride is running about 2.8 mg/L across the three boreholes.',DATE_SUB(NOW(),INTERVAL 9 DAY));

-- ---------------------------------------------------------------------
--  Publication views (drives the Basic 20-per-month meter)
-- ---------------------------------------------------------------------
INSERT INTO publication_views (publication_id, user_id, period_key, viewed_at) VALUES
 (8,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (9,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 8 DAY)),
 (10,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 7 DAY)),
 (11,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 7 DAY)),
 (12,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 6 DAY)),
 (15,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (16,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (17,18,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (8,20,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 10 DAY)),
 (10,20,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (12,20,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 8 DAY)),
 (15,20,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 6 DAY)),
 (16,20,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (9,19,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 11 DAY)),
 (10,19,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 10 DAY)),
 (13,19,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (19,19,DATE_FORMAT(NOW(),'%Y-%m'),DATE_SUB(NOW(),INTERVAL 1 DAY));

-- ---------------------------------------------------------------------
--  Wishlists
-- ---------------------------------------------------------------------
INSERT INTO wishlists (user_id, product_id, added_at) VALUES
 (18,14,DATE_SUB(NOW(),INTERVAL 13 DAY)),
 (18,15,DATE_SUB(NOW(),INTERVAL 13 DAY)),
 (19,10,DATE_SUB(NOW(),INTERVAL 30 DAY)),
 (19,7,DATE_SUB(NOW(),INTERVAL 20 DAY)),
 (20,14,DATE_SUB(NOW(),INTERVAL 11 DAY)),
 (20,16,DATE_SUB(NOW(),INTERVAL 17 DAY)),
 (7,9,DATE_SUB(NOW(),INTERVAL 25 DAY)),
 (7,13,DATE_SUB(NOW(),INTERVAL 22 DAY)),
 (8,12,DATE_SUB(NOW(),INTERVAL 19 DAY)),
 (3,10,DATE_SUB(NOW(),INTERVAL 15 DAY)),
 (4,18,DATE_SUB(NOW(),INTERVAL 12 DAY)),
 (5,12,DATE_SUB(NOW(),INTERVAL 9 DAY)),
 (6,13,DATE_SUB(NOW(),INTERVAL 7 DAY)),
 (9,20,DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (10,9,DATE_SUB(NOW(),INTERVAL 3 DAY));

-- ---------------------------------------------------------------------
--  Keep denormalised counters honest after bulk loading
-- ---------------------------------------------------------------------
UPDATE publications p SET save_count =
  (SELECT COUNT(*) FROM saved_publications s WHERE s.publication_id = p.id);

UPDATE publications p SET request_count =
  (SELECT COUNT(*) FROM collaboration_requests c WHERE c.publication_id = p.id);

UPDATE publications p SET
  rating_avg  = COALESCE((SELECT ROUND(AVG(f.rating),2) FROM publication_feedback f
                           WHERE f.publication_id = p.id AND f.status='visible'),0),
  rating_count = (SELECT COUNT(*) FROM publication_feedback f
                   WHERE f.publication_id = p.id AND f.status='visible');

UPDATE products pr SET
  rating_avg   = COALESCE((SELECT ROUND(AVG(r.rating),2) FROM product_reviews r
                            WHERE r.product_id = pr.id AND r.status='visible'),0),
  rating_count = (SELECT COUNT(*) FROM product_reviews r
                   WHERE r.product_id = pr.id AND r.status='visible'),
  sold_count   = COALESCE((SELECT SUM(oi.quantity) FROM order_items oi
                            WHERE oi.product_id = pr.id),0);

UPDATE technologies t SET usage_count =
  (SELECT COUNT(*) FROM publication_technologies pt WHERE pt.technology_id = t.id);
