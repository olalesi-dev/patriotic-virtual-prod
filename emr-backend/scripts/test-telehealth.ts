
import { db } from '../src/config/database';
import { TelehealthService } from '../src/services/telehealth';
import { logger } from '../src/utils/logger';

async function testTelehealth() {
    console.log('\n🏥 --- STARTING TELEHEALTH ADAPTER TEST ---\n');

    try {
        const service = new TelehealthService();

        // 1. SETUP: Get our seeded provider and org
        const providerRes = await db.query("SELECT user_id, organization_id FROM providers JOIN users ON providers.user_id = users.id WHERE email = 'dr.patriotic@example.com'");
        const provider = providerRes.rows[0];
        if (!provider) throw new Error('Seeded provider not found. Did you run the seed script?');

        console.log(`✅ Found Provider: Dr. Patriotic (ID: ${provider.user_id})`);

        // 2. SETUP: Create a Dummy Patient
        const patientRes = await db.query(`
            INSERT INTO patients (first_name, last_name, organization_id) 
            VALUES ('Tony', 'Stark', $1) RETURNING id
        `, [provider.organization_id]);
        const patientId = patientRes.rows[0].id;
        console.log(`✅ Created Patient: Tony Stark (ID: ${patientId})`);

        // 3. TEST CASE A: Standard Visit (Should use DOXY)
        console.log('\n🧪 TEST A: Standard Visit (Default Provider)');

        // Create Type
        const typeARes = await db.query(`
            INSERT INTO appointment_types (name, organization_id, video_provider_override)
            VALUES ('General Consult', $1, NULL) RETURNING id
        `, [provider.organization_id]);

        // Create Appointment
        const apptARes = await db.query(`
            INSERT INTO appointments (organization_id, patient_id, provider_id, appointment_type_id, start_time, end_time)
            VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '30 minutes') RETURNING id
        `, [provider.organization_id, patientId, provider.user_id, typeARes.rows[0].id]);

        // EXECUTE ADAPTER
        const resultA = await service.generateLink(apptARes.rows[0].id);
        console.log(`   👉 Strategy: ${resultA.provider}`);
        console.log(`   🔗 Join Link: ${resultA.joinLink}`);

        if (resultA.provider === 'DOXY' && resultA.joinLink.includes('doxy.me')) {
            console.log('   ✅ PASS: Correctly resolved to Provider Default (Doxy)');
        } else {
            console.error('   ❌ FAIL: Expected Doxy');
        }

        // 4. TEST CASE B: Psychiatry Visit (Should use ZOOM)
        console.log('\n🧪 TEST B: Psychiatry Visit (Zoom Override)');

        // Create Type with Override
        const typeBRes = await db.query(`
            INSERT INTO appointment_types (name, organization_id, video_provider_override)
            VALUES ('Psychiatry Review', $1, 'ZOOM') RETURNING id
        `, [provider.organization_id]);

        // Create Appointment
        const apptBRes = await db.query(`
            INSERT INTO appointments (organization_id, patient_id, provider_id, appointment_type_id, start_time, end_time)
            VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '60 minutes') RETURNING id
        `, [provider.organization_id, patientId, provider.user_id, typeBRes.rows[0].id]);

        // EXECUTE ADAPTER
        const resultB = await service.generateLink(apptBRes.rows[0].id);
        console.log(`   👉 Strategy: ${resultB.provider}`);
        console.log(`   🔗 Join Link: ${resultB.joinLink}`);

        if (resultB.provider === 'ZOOM' && resultB.joinLink.includes('zoom.us')) {
            console.log('   ✅ PASS: Correctly resolved to Appointment Override (Zoom)');
        } else {
            console.error('   ❌ FAIL: Expected Zoom');
        }

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
    } finally {
        await db.end();
        console.log('\n🏁 --- TEST COMPLETE ---');
    }
}

testTelehealth();
