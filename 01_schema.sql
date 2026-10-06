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
