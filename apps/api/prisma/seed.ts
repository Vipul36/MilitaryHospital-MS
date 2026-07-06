import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database started...');

  // Clear existing records to prevent unique constraints issues
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.labReport.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.consultation.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.doctorSchedule.deleteMany({});
  await prisma.doctor.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.hospital.deleteMany({});

  console.log('Cleared existing records.');

  // 1. Seed Hospital
  const hospital = await prisma.hospital.create({
    data: {
      name: 'Military Hospital Jaipur',
      command: 'SOUTHERN',
      city: 'Jaipur',
      state: 'Rajasthan',
      latitude: 26.9124,
      longitude: 75.7873,
      phone: '+911412200999',
      email: 'mhjaipur@militaryhospital.gov.in',
      capacity: 450,
      icuBeds: 50,
      generalBeds: 400
    }
  });
  console.log('Created Hospital:', hospital.name);

  // 2. Seed Departments
  const deptGenMed = await prisma.department.create({
    data: {
      hospitalId: hospital.hospitalId,
      departmentName: 'General Medicine',
      floor: 1,
      building: 'Dhanvantari Block',
      hod: 'Col. Dr. Rajesh Verma'
    }
  });

  const deptOrtho = await prisma.department.create({
    data: {
      hospitalId: hospital.hospitalId,
      departmentName: 'Orthopedics',
      floor: 2,
      building: 'Sushruta Block',
      hod: 'Lt. Col. Dr. Vikram Dev'
    }
  });

  const deptCardio = await prisma.department.create({
    data: {
      hospitalId: hospital.hospitalId,
      departmentName: 'Cardiology',
      floor: 1,
      building: 'Cardiovascular Wing',
      hod: 'Col. Dr. A. K. Sharma'
    }
  });
  console.log('Created Departments: General Medicine, Orthopedics, Cardiology');

  // Hashed Passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const doctorPasswordHash = await bcrypt.hash('doctor123', 10);
  const patientPasswordHash = await bcrypt.hash('patient123', 10);

  // 3. Seed Admin User
  const adminUser = await prisma.user.create({
    data: {
      serviceNumber: 'SM-90001',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      email: 'admin@militaryhospital.gov.in',
      phone: '+919999999999',
      status: 'ACTIVE'
    }
  });
  console.log('Created Admin User:', adminUser.username);

  // 4. Seed Doctor User & Doctor Entity
  const doctorUser = await prisma.user.create({
    data: {
      serviceNumber: 'SM-10042',
      username: 'doctor',
      passwordHash: doctorPasswordHash,
      role: 'DOCTOR',
      email: 'vikram.dev@militaryhospital.gov.in',
      phone: '+918888888888',
      status: 'ACTIVE'
    }
  });

  const doctorEntity = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      departmentId: deptOrtho.departmentId,
      specialization: 'Orthopedics',
      qualification: 'MS (Ortho), DNB',
      experience: 12,
      availableToday: true,
      roomNumber: 'Ortho-203',
      licenseNumber: 'MCI-12093-B'
    }
  });

  // Seed default doctor schedule
  await prisma.doctorSchedule.create({
    data: {
      doctorId: doctorEntity.doctorId,
      day: 'MONDAY',
      startTime: '09:00',
      endTime: '13:00',
      maxPatients: 30,
      leaveStatus: false
    }
  });
  console.log('Created Doctor User & Roster for:', doctorUser.username);

  // 5. Seed Patient User & Patient Entity
  const patientUser = await prisma.user.create({
    data: {
      serviceNumber: 'DEF-90812-M',
      username: 'patient',
      passwordHash: patientPasswordHash,
      role: 'PATIENT',
      email: 'sharma@militaryhospital.gov.in',
      phone: '+917777777777',
      status: 'ACTIVE'
    }
  });

  const patientEntity = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      defenceId: 'DEF-90812-M',
      bloodGroup: 'O_POS',
      dob: new Date('1984-06-15'),
      gender: 'MALE',
      unit: '12 Armoured Regiment',
      rank: 'Major',
      retired: false,
      dependentType: 'SELF',
      emergencyName: 'Sunita Dev',
      emergencyRel: 'SPOUSE',
      emergencyPhone: '+919876543210',
      address: 'Qtr 42B, Military Station, Jaipur',
      allergies: ['Penicillin'],
      currentHospital: 'Military Hospital Jaipur'
    }
  });
  console.log('Created Patient User & Profile for:', patientUser.username);

  // 6. Seed Medicines & Inventory
  const medDolo = await prisma.medicine.create({
    data: {
      genericName: 'Paracetamol 650mg',
      brandName: 'Dolo-650',
      manufacturer: 'Micro Labs',
      strength: '650mg',
      unit: 'Tablet',
      expiryDate: new Date('2027-12-31'),
      batchNumber: 'B-DL8921'
    }
  });

  const medAmox = await prisma.medicine.create({
    data: {
      genericName: 'Amoxicillin 500mg',
      brandName: 'Novamox 500',
      manufacturer: 'Cipla',
      strength: '500mg',
      unit: 'Capsule',
      expiryDate: new Date('2026-10-15'),
      batchNumber: 'B-NM2029'
    }
  });

  await prisma.inventory.createMany({
    data: [
      {
        medicineId: medDolo.medicineId,
        hospitalId: hospital.hospitalId,
        currentStock: 12000,
        minimumStock: 2000,
        maximumStock: 20000,
        reorderLevel: 3000
      },
      {
        medicineId: medAmox.medicineId,
        hospitalId: hospital.hospitalId,
        currentStock: 80,
        minimumStock: 300,
        maximumStock: 3000,
        reorderLevel: 500
      }
    ]
  });
  console.log('Created Medicines and Store Inventory.');

  // 7. Seed Appointments & Consultations (for Patient history and Referral flows)
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patientEntity.patientId,
      doctorId: doctorEntity.doctorId,
      departmentId: deptOrtho.departmentId,
      date: new Date(),
      time: '10:00',
      status: 'COMPLETED',
      priority: 'NORMAL',
      tokenNumber: 101,
      estimatedTime: 0,
      createdBy: 'doctor'
    }
  });

  const consultation = await prisma.consultation.create({
    data: {
      appointmentId: appointment.appointmentId,
      doctorId: doctorEntity.doctorId,
      symptoms: ['Knee joint stiffness', 'Pain on walking'],
      diagnosis: 'Mild Osteoarthritis Knee',
      notes: 'Advised lifestyle modifications and quad exercises.',
      followUpDate: new Date('2026-08-05')
    }
  });

  // Seed default referrals matching INITIAL_REFERRALS on frontend
  await prisma.referral.create({
    data: {
      consultationId: consultation.consultationId,
      referredHospital: 'Medanta - The Medicity, Gurugram',
      reason: 'Advanced Cardiac Ablation procedure not available at MH Jaipur',
      status: 'APPROVED',
      approvalOfficer: 'Command Medical Officer (HQ Western Command)',
      trackingNumber: 'MH-REF-2026-0091'
    }
  });

  await prisma.referral.create({
    data: {
      consultationId: consultation.consultationId,
      referredHospital: 'Fortis Hospital, Mohali',
      reason: 'Complex pediatric neurosurgery consultation',
      status: 'PENDING',
      trackingNumber: 'MH-REF-2026-0105'
    }
  });

  console.log('Created Seeded Appointments, Consultations, and Referrals.');

  // 8. Seed sample in-app notifications for the patient user
  await prisma.notification.create({
    data: {
      userId: patientUser.id,
      type: 'APPOINTMENT',
      title: 'Appointment Confirmed',
      message: 'Your appointment (Token #101) on 2026-07-05 at 10:00 has been confirmed.',
      status: 'UNREAD'
    }
  });

  await prisma.notification.create({
    data: {
      userId: patientUser.id,
      type: 'REFERRAL',
      title: 'Referral Approved',
      message: 'Your referral to Medanta - The Medicity, Gurugram has been approved by Command Medical Officer (HQ Western Command).',
      status: 'UNREAD'
    }
  });

  console.log('Created Seeded Notifications for patient user.');

  // 9. Seed Lab Reports — one per status for full dashboard demo coverage
  await prisma.labReport.createMany({
    data: [
      {
        consultationId: consultation.consultationId,
        testName: 'Complete Blood Count (CBC)',
        status: 'COMPLETED',
        result: 'Hb: 13.2 g/dL | WBC: 7400/µL | Platelets: 2.1 L/µL — Within normal limits.',
        performedBy: 'Lab Tech Sgt. Amit Rathore'
      },
      {
        consultationId: consultation.consultationId,
        testName: 'X-Ray Knee (AP & Lateral)',
        status: 'COMPLETED',
        result: 'Mild joint space narrowing in medial compartment. Osteophytes noted. No fracture.',
        performedBy: 'Radiographer Cpl. Suresh Meena'
      },
      {
        consultationId: consultation.consultationId,
        testName: 'Liver Function Tests (LFT)',
        status: 'IN_PROGRESS',
        result: null,
        performedBy: 'Lab Tech L/Nk Pradeep Singh'
      },
      {
        consultationId: consultation.consultationId,
        testName: 'Urine Routine & Microscopy',
        status: 'PENDING',
        result: null,
        performedBy: null
      }
    ]
  });
  console.log('Created Seeded Lab Reports (CBC, X-Ray, LFT, Urine).');
  console.log('Seeding database completed successfully!');

}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
