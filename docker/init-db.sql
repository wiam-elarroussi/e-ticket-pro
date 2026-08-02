-- Exécuté automatiquement au premier démarrage du conteneur Postgres :
-- crée le rôle applicatif et une base par microservice.
CREATE USER eticketpro WITH PASSWORD 'eticketpro_dev_pwd';

CREATE DATABASE eticketpro_auth OWNER eticketpro;
CREATE DATABASE eticketpro_events OWNER eticketpro;
CREATE DATABASE eticketpro_venue OWNER eticketpro;
CREATE DATABASE eticketpro_pos OWNER eticketpro;
CREATE DATABASE eticketpro_tickets OWNER eticketpro;
CREATE DATABASE eticketpro_access OWNER eticketpro;
