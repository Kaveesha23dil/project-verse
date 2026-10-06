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
