-- Runs once, on first container init, alongside the default POSTGRES_DB
-- database. Gives the test suite ("Isolated test database" requirement) a
-- database distinct from development so a test run can never touch dev data.
CREATE DATABASE abra_test;
