import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const rawArgs = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
const patientOnly = rawArgs.includes('--patient-only');
const includeCredentials = rawArgs.includes('--include-credentials');
const recipientEmails = rawArgs.filter((value) => !value.startsWith('--')).length > 0
    ? rawArgs.filter((value) => !value.startsWith('--'))
    : [
        'stharazeev2@gmail.com',
        'dayoolufolaju@gmail.com',
        'dayo@patriotictelehealth.com',
    ];

const scenarios = [
    {
        label: 'patient_welcome',
        templateKey: 'patient_welcome' as const,
        templateData: {
            first_name: 'Alex',
            platform_name: 'Patriotic Telehealth',
            support_email: 'support@patriotictelehealth.com',
            firstName: 'Alex',
            platformName: 'Patriotic Telehealth',
            supportEmail: 'support@patriotictelehealth.com',
        },
    },
    {
        label: 'staff_welcome(provider)',
        templateKey: 'staff_welcome' as const,
        templateData: {
            first_name: 'Jordan',
            platform_name: 'Patriotic Telehealth',
            role: 'provider',
            email: 'provider.test@patriotictelehealth.com',
            temporary_password: 'TempPass#2026',
            login_url: 'https://patriotictelehealth.com/login',
            support_email: 'support@patriotictelehealth.com',
            firstName: 'Jordan',
            platformName: 'Patriotic Telehealth',
            loginEmail: 'provider.test@patriotictelehealth.com',
            login_email: 'provider.test@patriotictelehealth.com',
            password: 'TempPass#2026',
            temporaryPassword: 'TempPass#2026',
            loginUrl: 'https://patriotictelehealth.com/login',
            supportEmail: 'support@patriotictelehealth.com',
        },
    },
    {
        label: 'staff_welcome(admin)',
        templateKey: 'staff_welcome' as const,
        templateData: {
            first_name: 'Morgan',
            platform_name: 'Patriotic Telehealth',
            role: 'admin',
            email: 'admin.test@patriotictelehealth.com',
            temporary_password: 'TempPass#2026',
            login_url: 'https://patriotictelehealth.com/login',
            support_email: 'support@patriotictelehealth.com',
            firstName: 'Morgan',
            platformName: 'Patriotic Telehealth',
            loginEmail: 'admin.test@patriotictelehealth.com',
            login_email: 'admin.test@patriotictelehealth.com',
            password: 'TempPass#2026',
            temporaryPassword: 'TempPass#2026',
            loginUrl: 'https://patriotictelehealth.com/login',
            supportEmail: 'support@patriotictelehealth.com',
        },
    },
    {
        label: 'appointment_request_notification(patient)',
        templateKey: 'appointment_request_notification' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            requested_date: 'April 25, 2026 at 3:00 PM',
            appointment_reason: 'Weight loss consultation request',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            requestedDate: 'April 25, 2026 at 3:00 PM',
            appointmentReason: 'Weight loss consultation request',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_request_notification(provider)',
        templateKey: 'appointment_request_notification' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            requested_date: 'April 25, 2026 at 3:00 PM',
            appointment_reason: 'Weight loss consultation request',
            provider_dashboard_url: 'https://patriotictelehealth.com/waitlist',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            requestedDate: 'April 25, 2026 at 3:00 PM',
            appointmentReason: 'Weight loss consultation request',
            providerDashboardUrl: 'https://patriotictelehealth.com/waitlist',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_booked(patient)',
        templateKey: 'appointment_booked' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'April 28, 2026',
            appointment_time: '5:30 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            reschedule_url: 'https://patriotictelehealth.com/patient/scheduled',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'April 28, 2026',
            appointmentTime: '5:30 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            rescheduleUrl: 'https://patriotictelehealth.com/patient/scheduled',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_booked(provider)',
        templateKey: 'appointment_booked' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'April 28, 2026',
            appointment_time: '5:30 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            reschedule_url: 'https://patriotictelehealth.com/calendar',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'April 28, 2026',
            appointmentTime: '5:30 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            rescheduleUrl: 'https://patriotictelehealth.com/calendar',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_rescheduled(patient)',
        templateKey: 'appointment_rescheduled' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            old_date: 'April 28, 2026',
            old_time: '5:30 PM',
            new_date: 'April 30, 2026',
            new_time: '6:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/patient/scheduled',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            oldDate: 'April 28, 2026',
            oldTime: '5:30 PM',
            newDate: 'April 30, 2026',
            newTime: '6:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/patient/scheduled',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_rescheduled(provider)',
        templateKey: 'appointment_rescheduled' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            old_date: 'April 28, 2026',
            old_time: '5:30 PM',
            new_date: 'April 30, 2026',
            new_time: '6:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/calendar',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            oldDate: 'April 28, 2026',
            oldTime: '5:30 PM',
            newDate: 'April 30, 2026',
            newTime: '6:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/calendar',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_cancelled(patient)',
        templateKey: 'appointment_cancelled' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 1, 2026',
            appointment_time: '4:00 PM',
            cancellation_reason: 'Provider unavailable',
            schedule_url: 'https://patriotictelehealth.com/book',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 1, 2026',
            appointmentTime: '4:00 PM',
            cancellationReason: 'Provider unavailable',
            scheduleUrl: 'https://patriotictelehealth.com/book',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_cancelled(provider)',
        templateKey: 'appointment_cancelled' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 1, 2026',
            appointment_time: '4:00 PM',
            cancellation_reason: 'Provider unavailable',
            schedule_url: 'https://patriotictelehealth.com/calendar',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 1, 2026',
            appointmentTime: '4:00 PM',
            cancellationReason: 'Provider unavailable',
            scheduleUrl: 'https://patriotictelehealth.com/calendar',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_reminder_24h(patient)',
        templateKey: 'appointment_reminder_24h' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 2, 2026',
            appointment_time: '4:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/patient/scheduled',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 2, 2026',
            appointmentTime: '4:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/patient/scheduled',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_reminder_24h(provider)',
        templateKey: 'appointment_reminder_24h' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 2, 2026',
            appointment_time: '4:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/calendar',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 2, 2026',
            appointmentTime: '4:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/calendar',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_reminder_1h(patient)',
        templateKey: 'appointment_reminder_1h' as const,
        templateData: {
            recipient_type: 'patient',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 2, 2026',
            appointment_time: '4:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/patient/scheduled',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'patient',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 2, 2026',
            appointmentTime: '4:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/patient/scheduled',
            platformName: 'Patriotic Telehealth',
        },
    },
    {
        label: 'appointment_reminder_1h(provider)',
        templateKey: 'appointment_reminder_1h' as const,
        templateData: {
            recipient_type: 'provider',
            patient_name: 'Alex Carter',
            provider_name: 'Dr. Jordan Reyes',
            appointment_date: 'May 2, 2026',
            appointment_time: '4:00 PM',
            appointment_location: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manage_url: 'https://patriotictelehealth.com/calendar',
            platform_name: 'Patriotic Telehealth',
            recipientType: 'provider',
            patientName: 'Alex Carter',
            providerName: 'Dr. Jordan Reyes',
            appointmentDate: 'May 2, 2026',
            appointmentTime: '4:00 PM',
            appointmentLocation: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            manageUrl: 'https://patriotictelehealth.com/calendar',
            platformName: 'Patriotic Telehealth',
        },
    },
];

async function main(): Promise<void> {
    const { sendDirectTemplateEmail } = await import('../modules/notifications/direct-email');
    const filteredScenarios = scenarios.filter((scenario) => {
        if (patientOnly) {
            if (scenario.label === 'patient_welcome') return true;
            if (includeCredentials && scenario.label.startsWith('staff_welcome')) return true;
            return scenario.label.includes('(patient)');
        }

        if (includeCredentials) {
            return true;
        }

        return !scenario.label.startsWith('staff_welcome');
    });

    for (const recipientEmail of recipientEmails) {
        for (const scenario of filteredScenarios) {
            await sendDirectTemplateEmail({
                templateKey: scenario.templateKey,
                toEmail: recipientEmail,
                templateData: scenario.templateData,
                customArgs: {
                    smokeTest: 'true',
                    scenario: scenario.label,
                },
            });
            console.log(`Sent ${scenario.label} to ${recipientEmail}`);
        }
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
