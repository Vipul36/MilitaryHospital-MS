export type UserRole = 
  | 'ADMIN' 
  | 'DOCTOR' 
  | 'PATIENT' 
  | 'RECEPTIONIST' 
  | 'LAB_TECHNICIAN' 
  | 'PHARMACIST' 
  | 'REFERRAL_OFFICER' 
  | 'COMMAND_MEDICAL_OFFICER' 
  | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  serviceNumber?: string; // Optional for non-military/dependents
  username: string;
  passwordHash: string;
  role: UserRole;
  email: string;
  phone: string;
  status: UserStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type DependentType = 'SELF' | 'SPOUSE' | 'SON' | 'DAUGHTER' | 'FATHER' | 'MOTHER' | 'OTHER';

export interface Patient {
  patientId: string;
  userId: string;
  defenceId: string; // Unique Military ID/Service ID
  bloodGroup: BloodGroup;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  unit: string; // e.g. "2 Mech Inf", "HQ Southern Command"
  rank: string; // e.g. "Captain", "Major", "Havildar"
  retired: boolean;
  dependentType: DependentType;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  address: string;
  allergies: string[];
  photo?: string;
  currentHospital: string;
}

export interface FamilyMember {
  familyId: string;
  patientId: string; // Refers to the main service member
  name: string;
  relation: DependentType;
  bloodGroup: BloodGroup;
  dob: string;
  gender: Gender;
  dependentCardNumber: string;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  command: 'SOUTHERN' | 'EASTERN' | 'WESTERN' | 'NORTHERN' | 'CENTRAL' | 'SOUTH_WESTERN' | 'TRAINING';
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  capacity: number;
  icuBeds: number;
  generalBeds: number;
}

export interface Department {
  departmentId: string;
  hospitalId: string;
  departmentName: string;
  floor: number;
  building: string;
  hod: string; // Doctor name or doctor ID
}

export interface Doctor {
  doctorId: string;
  userId: string;
  departmentId: string;
  specialization: string;
  qualification: string;
  experience: number; // in years
  availableToday: boolean;
  roomNumber: string;
  licenseNumber: string;
}

export interface DoctorSchedule {
  scheduleId: string;
  doctorId: string;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxPatients: number;
  leaveStatus: boolean;
}

export type AppointmentStatus = 
  | 'BOOKED' 
  | 'CHECKED_IN' 
  | 'WAITING' 
  | 'IN_CONSULTATION' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW';

export type PriorityLevel = 'NORMAL' | 'CHILD' | 'DISABLED' | 'PREGNANT' | 'SENIOR_CITIZEN' | 'EMERGENCY';

export interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  priority: PriorityLevel;
  tokenNumber: number;
  estimatedTime: number; // in minutes
  createdBy: string;
}

export interface Consultation {
  consultationId: string;
  appointmentId: string;
  doctorId: string;
  symptoms: string[];
  diagnosis: string;
  notes?: string;
  followUpDate?: string;
}

export interface PrescriptionItem {
  medicineId: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "1-0-1" or "TDS"
  duration: string; // e.g. "5 days"
  remarks?: string;
}

export interface Prescription {
  prescriptionId: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  date: string;
  items: PrescriptionItem[];
}

export interface Medicine {
  medicineId: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  strength: string;
  unit: string; // e.g. "Tablet", "Capsule", "Syrup"
  expiryDate: string;
  batchNumber: string;
}

export interface Inventory {
  inventoryId: string;
  medicineId: string;
  hospitalId: string;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
}

export interface LabReport {
  testId: string;
  consultationId: string;
  testName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  result?: string;
  reportURL?: string;
  performedBy?: string; // Lab tech ID or name
}

export type ReferralStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'TREATMENT_IN_PROGRESS' | 'CLOSED';

export interface Referral {
  referralId: string;
  consultationId: string;
  referredHospital: string;
  reason: string;
  status: ReferralStatus;
  approvalOfficer?: string;
  documents: string[]; // URLs
  trackingNumber: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: 'APPOINTMENT' | 'PRESCRIPTION' | 'REFERRAL' | 'SYSTEM' | 'QUEUE';
  title: string;
  message: string;
  status: 'READ' | 'UNREAD';
  createdAt: string;
}

export interface AuditLog {
  auditId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  ipAddress: string;
}
