
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const SEED_PROVIDER = {
    email: 'dr.patriotic@example.com',
    password_hash: 'REDACTED', // Use bcrypt normally
    first_name: 'Stephen',
    last_name: 'Strange',
    npi: '1234567890',
    doxy_link: 'https://doxy.me/DrStrange'
};

const SEED_ORG = 'Patriotic Telehealth Inc.';

async function seed() {
    console.log('🌱 Starting Database Seed...');
    try {
        await client.connect();

        // 0. Reset Database (Dev only)
        console.log('Resetting Database...');
        await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

        // 1. Run Schema (DDL)
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        console.log('Executing schema.sql...');
        await client.query(schemaSql);

        // 2. Create Organization
        console.log(`Creating Organization: ${SEED_ORG}`);
        const orgRes = await client.query(
            `INSERT INTO organizations (name, default_telehealth_provider) 
             VALUES ($1, 'DOXY') RETURNING id`,
            [SEED_ORG]
        );
        const orgId = orgRes.rows[0].id;

        // 3. Create Role (Provider)
        console.log('Creating Provider Role...');
        const roleRes = await client.query(
            `INSERT INTO roles (name, mfa_required) 
             VALUES ('Provider', true) 
             ON CONFLICT (name) DO UPDATE SET mfa_required=true 
             RETURNING id`
        );
        const roleId = roleRes.rows[0].id;

        // 4. Create User
        console.log(`Creating User: ${SEED_PROVIDER.email}`);
        const userRes = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, organization_id, mfa_enabled, mfa_enrolled_at)
             VALUES ($1, $2, $3, $4, $5, true, NOW())
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [SEED_PROVIDER.email, SEED_PROVIDER.password_hash, SEED_PROVIDER.first_name, SEED_PROVIDER.last_name, orgId]
        );

        if (userRes.rows.length === 0) {
            console.log('User already exists, skipping Provider creation.');
        } else {
            const userId = userRes.rows[0].id;

            // 5. Assign Role
            await client.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [userId, roleId]
            );

            // 6. Config Provider (This is the Doxy Adapter test)
            console.log(`Configuring Doxy.me Link: ${SEED_PROVIDER.doxy_link}`);
            await client.query(
                `INSERT INTO providers (user_id, npi, doxy_me_link) 
                 VALUES ($1, $2, $3)`,
                [userId, SEED_PROVIDER.npi, SEED_PROVIDER.doxy_link]
            );
        }

        console.log('✅ Database Seeded Successfully!');

    } catch (err) {
        console.error('❌ Error seeding database:', err);
    } finally {
        await client.end();
    }
}

seed();
