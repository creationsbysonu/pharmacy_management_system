-- =============================================================================
-- Pharmacy Management System - seed data
-- Ported from the original MySQL dump (../../../pharmacy.sql)
--
-- Stock triggers are disabled during the load because med_qty below already
-- reflects every historical purchase and sale. Triggers are re-enabled at the
-- end. Safe to run more than once.
-- =============================================================================

begin;

alter table public.purchase    disable trigger purchase_stock_sync;
alter table public.sales_items disable trigger sales_item_stock_sync;

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
insert into public.suppliers (sup_id, sup_name, sup_add, sup_phno, sup_mail) values
  (123, 'XYZ Pharmaceuticals',   'Chennai, Tamil Nadu', '8745632145', 'xyz@xyzpharma.com'),
  (136, 'ABC PharmaSupply',      'Trichy',              '7894561235', 'abc@pharmsupp.com'),
  (145, 'Daily Pharma Ltd',      'Hyderabad',           '7854699321', 'daily@dpharma.com'),
  (156, 'MedAll',                'Chennai',             '9874585236', 'mainid@medall.com'),
  (162, 'MedHead Pharmaceuticals','Trichy',              '7894561335', 'abc@pharmsupp.com')
on conflict (sup_id) do nothing;

-- ---------------------------------------------------------------------------
-- Medicines / inventory
-- ---------------------------------------------------------------------------
insert into public.meds (med_id, med_name, med_qty, category, med_price, location_rack) values
  (123001, 'Dolo 650 MG',        625, 'Tablet',  1.00,  'rack 5'),
  (123002, 'Panadol Cold & Flu',  90, 'Tablet',  2.50,  'rack 6'),
  (123003, 'Livogen',             25, 'Capsule', 5.00,  'rack 3'),
  (123004, 'Gelusil',            440, 'Tablet',  1.25,  'rack 4'),
  (123005, 'Cyclopam',           120, 'Tablet',  6.00,  'rack 2'),
  (123006, 'Benadryl 200 ML',     35, 'Syrup',  50.00,  'rack 10'),
  (123007, 'Lopamide',            15, 'Capsule', 5.00,  'rack 7'),
  (123008, 'Vitamic C',           90, 'Tablet',  3.00,  'rack 8'),
  (123009, 'Omeprazole',          35, 'Capsule', 4.00,  'rack 3'),
  (123010, 'Concur 5 MG',        600, 'Tablet',  3.50,  'rack 9'),
  (123011, 'Augmentin 250 ML',   115, 'Syrup',  80.00,  'rack 7')
on conflict (med_id) do nothing;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
insert into public.customer (c_id, c_fname, c_lname, c_age, c_sex, c_phno, c_mail) values
  (987101, 'Safia',  'Malik',     22, 'Female', '9632587415', 'safia@gmail.com'),
  (987102, 'Varun',  'Ilango',    24, 'Male',   '9987565423', 'varun@gmail.com'),
  (987103, 'Suja',   'Suresh',    45, 'Female', '7896541236', 'suja@hotmail.com'),
  (987104, 'Agatha', 'Elizabeth', 30, 'Female', '7845129635', 'agatha@gmail.com'),
  (987105, 'Zayed',  'Shah',      40, 'Male',   '6789541235', 'zshah@hotmail.com'),
  (987106, 'Vijay',  'Kumar',     60, 'Male',   '8996574123', 'vijayk@yahoo.com'),
  (987107, 'Meera',  'Das',       35, 'Female', '7845963259', 'meera@gmail.com')
on conflict (c_id) do nothing;

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
insert into public.employee (e_id, e_fname, e_lname, bdate, e_age, e_sex, e_type, e_jdate, e_sal, e_phno, e_mail, e_add) values
  (1,       'Admin',    '-',        '1989-05-24', 30, 'Female', 'Admin',      '2009-06-24',  95000.00, '9874563219', 'admin@pharmacia.com', 'Chennai'),
  (4567001, 'Varshini', 'Elangovan','1995-10-05', 25, 'Female', 'Pharmacist', '2017-11-12',  25000.00, '9967845123', 'evarsh@hotmail.com',  'Thiruvanmiyur'),
  (4567002, 'Anita',    'Shree',    '2000-10-03', 20, 'Female', 'Pharmacist', '2012-10-06',  45000.00, '8546123566', 'anita@gmail.com',     'Adyar'),
  (4567003, 'Harish',   'Raja',     '1998-02-01', 22, 'Male',   'Pharmacist', '2019-07-06',  21000.00, '7854123694', 'harishraja@live.com', 'T.Nagar'),
  (4567005, 'Amaya',    'Singh',    '1992-01-02', 28, 'Female', 'Pharmacist', '2017-05-16',  32000.00, '7894532165', 'amaya@gmail.com',     'Kottivakkam'),
  (4567006, 'Shoaib',   'Ahmed',    '1999-12-11', 20, 'Male',   'Pharmacist', '2018-09-05',  28000.00, '7896541234', 'shoaib@hotmail.com',  'Porur'),
  (4567009, 'Shayla',   'Hussain',  '1980-02-28', 40, 'Female', 'Manager',    '2010-05-06',  80000.00, '7854123695', 'shaylah@gmail.com',   'Adyar'),
  (4567010, 'Daniel',   'James',    '1993-04-05', 27, 'Male',   'Pharmacist', '2016-01-05',  30000.00, '7896541235', 'daniels@gmail.com',   'Kodambakkam')
on conflict (e_id) do nothing;

-- ---------------------------------------------------------------------------
-- Purchases
-- ---------------------------------------------------------------------------
insert into public.purchase (p_id, sup_id, med_id, p_qty, p_cost, pur_date, mfg_date, exp_date) values
  (1001, 136, 123010,  200, 1500.50, '2020-03-01', '2019-05-05', '2021-05-10'),
  (1002, 123, 123002, 1000, 3000.00, '2020-02-01', '2018-06-01', '2020-12-05'),
  (1003, 145, 123006,   20,  800.00, '2020-04-22', '2017-02-05', '2020-07-01'),
  (1004, 156, 123004,  250, 1000.00, '2020-04-02', '2020-05-06', '2023-05-06'),
  (1005, 123, 123005,  200, 1200.00, '2020-02-01', '2019-08-02', '2021-04-01'),
  (1006, 162, 123010,  500, 1500.00, '2019-04-22', '2018-01-01', '2020-05-02'),
  (1007, 123, 123001,  500,  450.00, '2020-01-02', '2019-01-05', '2022-03-06')
on conflict (p_id) do nothing;

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
insert into public.sales (sale_id, c_id, sold_at, total_amt, e_id) values
  (1,  987101, '2020-04-15 13:23:03', 180.00, 4567009),
  (2,  987106, '2020-04-21 20:19:31', 585.00, 1),
  (3,  987103, '2020-04-15 11:23:53', 120.00, 4567010),
  (4,  987104, '2020-04-14 18:20:00', 955.00, 4567006),
  (5,  987103, '2020-04-21 15:24:43',  45.00, 1),
  (6,  987102, '2020-03-11 10:24:43', 140.00, 4567001),
  (7,  987105, '2020-04-24 00:25:54', 350.00, 1),
  (8,  987104, '2020-04-24 00:47:47',  35.00, 4567001),
  (12, 987103, '2020-04-24 19:33:16',  60.00, 1),
  (13, 987104, '2020-04-24 21:15:56',  62.50, 4567001),
  (15, 987107, '2020-12-04 18:39:46', 420.00, 1),
  (16, 987106, '2020-12-04 18:52:21',  30.00, 1),
  (17, 987103, '2020-12-04 19:35:56',  57.50, 1),
  (18, 987105, '2020-12-04 19:36:56', 160.00, 4567001),
  (20, 987103, '2020-12-04 22:53:18', 150.00, 4567001)
on conflict (sale_id) do nothing;

-- ---------------------------------------------------------------------------
-- Sale line items
-- ---------------------------------------------------------------------------
insert into public.sales_items (sale_id, med_id, sale_qty, tot_price) values
  (1,  123001,  20,  20.00),
  (1,  123011,   2, 160.00),
  (2,  123003,  75, 225.00),
  (2,  123005,  60, 360.00),
  (3,  123008,  40, 120.00),
  (4,  123010, 250, 875.00),
  (4,  123011,   1,  80.00),
  (5,  123001,  45,  45.00),
  (6,  123006,   2, 100.00),
  (6,  123009,  10,  40.00),
  (7,  123001, 100, 100.00),
  (7,  123003,  50, 250.00),
  (8,  123001,  10,  10.00),
  (8,  123002,  10,  25.00),
  (12, 123005,  10,  60.00),
  (13, 123002,  25,  62.50),
  (15, 123005,  45, 270.00),
  (15, 123006,   3, 150.00),
  (16, 123008,  10,  30.00),
  (17, 123004,  10,  12.50),
  (17, 123007,   5,  25.00),
  (17, 123009,   5,  20.00),
  (18, 123011,   2, 160.00),
  (20, 123005,  25, 150.00)
on conflict (sale_id, med_id) do nothing;

alter table public.purchase    enable trigger purchase_stock_sync;
alter table public.sales_items enable trigger sales_item_stock_sync;

-- Push the identity sequences past the explicit ids used above.
select setval(pg_get_serial_sequence('public.suppliers', 'sup_id'), coalesce((select max(sup_id) from public.suppliers), 1));
select setval(pg_get_serial_sequence('public.meds', 'med_id'),       coalesce((select max(med_id) from public.meds), 1));
select setval(pg_get_serial_sequence('public.customer', 'c_id'),     coalesce((select max(c_id) from public.customer), 1));
select setval(pg_get_serial_sequence('public.employee', 'e_id'),     coalesce((select max(e_id) from public.employee), 1));
select setval(pg_get_serial_sequence('public.purchase', 'p_id'),     coalesce((select max(p_id) from public.purchase), 1));
select setval(pg_get_serial_sequence('public.sales', 'sale_id'),     coalesce((select max(sale_id) from public.sales), 1));

commit;
