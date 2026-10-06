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
