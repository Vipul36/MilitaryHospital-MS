import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, getWsUrl } from './config/api';

import Login from './components/Login';
import { 
  Shield, 
  Activity, 
  Users, 
  UserCheck, 
  Calendar, 
  ClipboardList, 
  Package, 
  FileSymlink, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Clock, 
  Heart, 
  UserPlus, 
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  Bell,
  BellOff,
  FlaskConical,
  FileText,
  Users2,
  ShieldOff,
  ShieldCheck,
  KeyRound,
  Bed,
  BarChart3,
  Download,
  FileSpreadsheet,
  History
} from 'lucide-react';
import type { 
  Patient, 
  Doctor, 
  Appointment, 
  Medicine, 
  Referral, 
  UserRole,
  PriorityLevel
} from '@mhshms/types';

// ==========================================
// INITIAL MOCK DATA
// ==========================================

const INITIAL_PATIENTS: Patient[] = [
  {
    patientId: 'pat-1',
    userId: 'user-pat-1',
    defenceId: 'DEF-90812-M',
    bloodGroup: 'O+',
    dob: '1984-06-15',
    gender: 'MALE',
    unit: '12 Armoured Regiment',
    rank: 'Major',
    retired: false,
    dependentType: 'SELF',
    emergencyContact: { name: 'Sunita Dev', relation: 'SPOUSE', phone: '+919876543210' },
    address: 'Qtr 42B, Military Station, Jaipur',
    allergies: ['Penicillin'],
    currentHospital: 'Military Hospital Jaipur'
  },
  {
    patientId: 'pat-2',
    userId: 'user-pat-2',
    defenceId: 'DEF-34190-F',
    bloodGroup: 'A+',
    dob: '1992-11-20',
    gender: 'FEMALE',
    unit: 'HQ Southern Command',
    rank: 'Captain',
    retired: false,
    dependentType: 'SELF',
    emergencyContact: { name: 'Rajesh Nair', relation: 'SPOUSE', phone: '+919988776655' },
    address: 'Officer Mess, Southern Command, Pune',
    allergies: [],
    currentHospital: 'Command Hospital Pune'
  },
  {
    patientId: 'pat-3',
    userId: 'user-pat-3',
    defenceId: 'DEF-90812-D1',
    bloodGroup: 'O+',
    dob: '2016-04-02',
    gender: 'FEMALE',
    unit: '12 Armoured Regiment',
    rank: 'Daughter of Major Dev',
    retired: false,
    dependentType: 'DAUGHTER',
    emergencyContact: { name: 'Major Vikram Dev', relation: 'FATHER', phone: '+919876543212' },
    address: 'Qtr 42B, Military Station, Jaipur',
    allergies: ['Dust', 'Peanuts'],
    currentHospital: 'Military Hospital Jaipur'
  },
  {
    patientId: 'pat-4',
    userId: 'user-pat-4',
    defenceId: 'DEF-10023-R',
    bloodGroup: 'B-',
    dob: '1955-08-10',
    gender: 'MALE',
    unit: 'Retired EME',
    rank: 'Subedar Major (Retd)',
    retired: true,
    dependentType: 'SELF',
    emergencyContact: { name: 'Karan Singh', relation: 'SON', phone: '+918877665544' },
    address: 'VPO Badhra, Haryana',
    allergies: ['Sulfa Drugs'],
    currentHospital: 'Military Hospital Jaipur'
  }
];

const INITIAL_DOCTORS: Doctor[] = [
  {
    doctorId: 'doc-1',
    userId: 'user-doc-1',
    departmentId: 'dept-gen-med',
    specialization: 'General Medicine',
    qualification: 'MD (Medicine), AFMC',
    experience: 15,
    availableToday: true,
    roomNumber: 'Ophthalmology-102',
    licenseNumber: 'MCI-88910-A'
  },
  {
    doctorId: 'doc-2',
    userId: 'user-doc-2',
    departmentId: 'dept-ortho',
    specialization: 'Orthopedics',
    qualification: 'MS (Ortho), DNB',
    experience: 12,
    availableToday: true,
    roomNumber: 'Ortho-203',
    licenseNumber: 'MCI-12093-B'
  },
  {
    doctorId: 'doc-3',
    userId: 'user-doc-3',
    departmentId: 'dept-cardio',
    specialization: 'Cardiology',
    qualification: 'DM (Cardiology), AIIMS',
    experience: 20,
    availableToday: false,
    roomNumber: 'Cardio-Cardiac-Wing-1',
    licenseNumber: 'MCI-77382-C'
  }
];

const DOCTOR_NAMES: Record<string, string> = {
  'doc-1': 'Col. Dr. Rajesh Verma',
  'doc-2': 'Lt. Col. Dr. Vikram Dev',
  'doc-3': 'Col. Dr. A. K. Sharma'
};

const DEPT_NAMES: Record<string, string> = {
  'dept-gen-med': 'General Medicine',
  'dept-ortho': 'Orthopedics',
  'dept-cardio': 'Cardiology'
};

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    appointmentId: 'appt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    departmentId: 'dept-gen-med',
    date: '2026-07-03',
    time: '09:30',
    status: 'COMPLETED',
    priority: 'NORMAL',
    tokenNumber: 101,
    estimatedTime: 0,
    createdBy: 'reception-1'
  },
  {
    appointmentId: 'appt-2',
    patientId: 'pat-4',
    doctorId: 'doc-2',
    departmentId: 'dept-ortho',
    date: '2026-07-03',
    time: '10:45',
    status: 'IN_CONSULTATION',
    priority: 'SENIOR_CITIZEN',
    tokenNumber: 102,
    estimatedTime: 5,
    createdBy: 'reception-1'
  },
  {
    appointmentId: 'appt-3',
    patientId: 'pat-3',
    doctorId: 'doc-1',
    departmentId: 'dept-gen-med',
    date: '2026-07-03',
    time: '11:15',
    status: 'WAITING',
    priority: 'CHILD',
    tokenNumber: 103,
    estimatedTime: 15,
    createdBy: 'reception-1'
  },
  {
    appointmentId: 'appt-4',
    patientId: 'pat-2',
    doctorId: 'doc-2',
    departmentId: 'dept-ortho',
    date: '2026-07-03',
    time: '11:30',
    status: 'WAITING',
    priority: 'NORMAL',
    tokenNumber: 104,
    estimatedTime: 25,
    createdBy: 'reception-1'
  }
];

const INITIAL_MEDICINES: Medicine[] = [
  {
    medicineId: 'med-1',
    genericName: 'Paracetamol 650mg',
    brandName: 'Dolo-650',
    manufacturer: 'Micro Labs',
    strength: '650mg',
    unit: 'Tablet',
    expiryDate: '2027-12-31',
    batchNumber: 'B-DL8921'
  },
  {
    medicineId: 'med-2',
    genericName: 'Amoxicillin 500mg',
    brandName: 'Novamox 500',
    manufacturer: 'Cipla',
    strength: '500mg',
    unit: 'Capsule',
    expiryDate: '2026-10-15',
    batchNumber: 'B-NM2029'
  },
  {
    medicineId: 'med-3',
    genericName: 'Atorvastatin 10mg',
    brandName: 'Lipvas 10',
    manufacturer: 'Cipla',
    strength: '10mg',
    unit: 'Tablet',
    expiryDate: '2027-04-20',
    batchNumber: 'B-LP9021'
  },
  {
    medicineId: 'med-4',
    genericName: 'Pantoprazole 40mg',
    brandName: 'Pan-40',
    manufacturer: 'Alkem',
    strength: '40mg',
    unit: 'Tablet',
    expiryDate: '2028-02-15',
    batchNumber: 'B-PN1120'
  }
];

interface InventoryItem extends Medicine {
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  { ...INITIAL_MEDICINES[0], currentStock: 12000, minimumStock: 2000, maximumStock: 20000, reorderLevel: 3000 },
  { ...INITIAL_MEDICINES[1], currentStock: 450, minimumStock: 500, maximumStock: 5000, reorderLevel: 800 }, // Low Stock
  { ...INITIAL_MEDICINES[2], currentStock: 2500, minimumStock: 1000, maximumStock: 10000, reorderLevel: 1500 },
  { ...INITIAL_MEDICINES[3], currentStock: 80, minimumStock: 300, maximumStock: 3000, reorderLevel: 500 } // Critical Stock
];

const INITIAL_REFERRALS: Referral[] = [
  {
    referralId: 'ref-1',
    consultationId: 'cons-90',
    referredHospital: 'Medanta - The Medicity, Gurugram',
    reason: 'Advanced Cardiac Ablation procedure not available at MH Jaipur',
    status: 'APPROVED',
    approvalOfficer: 'Command Medical Officer (HQ Western Command)',
    documents: [],
    trackingNumber: 'MH-REF-2026-0091'
  },
  {
    referralId: 'ref-2',
    consultationId: 'cons-102',
    referredHospital: 'Fortis Hospital, Mohali',
    reason: 'Complex pediatric neurosurgery consultation',
    status: 'PENDING',
    documents: [],
    trackingNumber: 'MH-REF-2026-0105'
  }
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Navigation & Role Selection States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'doctors' | 'queue' | 'pharmacy' | 'referrals' | 'ai-triage' | 'audit' | 'lab-reports' | 'users' | 'beds' | 'analytics'>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');

  const handleLoginSuccess = (user: any, userToken: string) => {
    setCurrentUser(user);
    setToken(userToken);
    setUserRole(user.role);
    setIsAuthenticated(true);
    localStorage.setItem('mhshms_token', userToken);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('mhshms_token');
  };

  // Business Logic States
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);

  // Patient History States
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState<Patient | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [patientHistoryLogs, setPatientHistoryLogs] = useState<any[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token || token.startsWith('mock-')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setNotifications(data.data);
          setUnreadCount(data.data.filter((n: any) => n.status === 'UNREAD').length);
        }
      }
    } catch (err) {
      // silently fail — notifications are non-critical
    }
  }, [token]);

  const handleMarkAllRead = async () => {
    if (!token || token.startsWith('mock-')) {
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Mark all read failed:', err);
    }
  };

  const handleDismissNotification = async (notifId: string) => {
    if (!token || token.startsWith('mock-')) {
      setNotifications(prev => prev.filter(n => n.notificationId !== notifId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => {
        const updated = prev.filter(n => n.notificationId !== notifId);
        setUnreadCount(updated.filter(n => n.status === 'UNREAD').length);
        return updated;
      });
    } catch (err) {
      console.warn('Dismiss notification failed:', err);
    }
  };

  // AI Triage States
  const [triageSymptoms, setTriageSymptoms] = useState('');
  const [triageAge, setTriageAge] = useState(30);
  const [triageGender, setTriageGender] = useState('MALE');
  const [triageResult, setTriageResult] = useState<any>(null);
  const [triageDoctors, setTriageDoctors] = useState<any[]>([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Audit Log Viewer States (Milestone 9)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterEntity, setAuditFilterEntity] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [auditFilterUser, setAuditFilterUser] = useState('');

  // Mock audit data for offline fallback
  const MOCK_AUDIT_LOGS = [
    { auditId: 'audit-1', userId: 'user-1', username: 'admin', role: 'ADMIN', action: 'LOGIN', entity: 'USER', entityId: 'user-1', ipAddress: '192.168.1.10', timestamp: new Date(Date.now() - 120000).toISOString() },
    { auditId: 'audit-2', userId: 'user-1', username: 'admin', role: 'ADMIN', action: 'CREATE', entity: 'PATIENT', entityId: 'pat-1', ipAddress: '192.168.1.10', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { auditId: 'audit-3', userId: 'user-2', username: 'dr.sharma', role: 'DOCTOR', action: 'UPDATE', entity: 'DOCTOR', entityId: 'doc-1', ipAddress: '192.168.1.22', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { auditId: 'audit-4', userId: 'user-1', username: 'admin', role: 'ADMIN', action: 'CREATE', entity: 'APPOINTMENT', entityId: 'appt-1', ipAddress: '192.168.1.10', timestamp: new Date(Date.now() - 10800000).toISOString() },
    { auditId: 'audit-5', userId: 'user-3', username: 'pharmacist01', role: 'PHARMACIST', action: 'UPDATE', entity: 'INVENTORY', entityId: 'med-1', ipAddress: '192.168.1.30', timestamp: new Date(Date.now() - 14400000).toISOString() },
    { auditId: 'audit-6', userId: 'user-4', username: 'ref.officer', role: 'REFERRAL_OFFICER', action: 'APPROVE', entity: 'REFERRAL', entityId: 'ref-1', ipAddress: '192.168.1.40', timestamp: new Date(Date.now() - 18000000).toISOString() },
    { auditId: 'audit-7', userId: 'user-2', username: 'dr.sharma', role: 'DOCTOR', action: 'CREATE', entity: 'DOCTOR', entityId: 'doc-2', ipAddress: '192.168.1.22', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { auditId: 'audit-8', userId: 'user-1', username: 'admin', role: 'ADMIN', action: 'DELETE', entity: 'PATIENT', entityId: 'pat-old', ipAddress: '192.168.1.10', timestamp: new Date(Date.now() - 172800000).toISOString() },
  ];

  const MOCK_AUDIT_SUMMARY = {
    total: 8,
    byAction: [
      { action: 'LOGIN', count: 1 },
      { action: 'CREATE', count: 3 },
      { action: 'UPDATE', count: 2 },
      { action: 'DELETE', count: 1 },
      { action: 'APPROVE', count: 1 },
    ],
    recent: [
      { auditId: 'audit-1', username: 'admin', action: 'LOGIN', entity: 'USER', entityId: 'user-1', timestamp: new Date(Date.now() - 120000).toISOString() },
      { auditId: 'audit-2', username: 'admin', action: 'CREATE', entity: 'PATIENT', entityId: 'pat-1', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { auditId: 'audit-3', username: 'dr.sharma', action: 'UPDATE', entity: 'DOCTOR', entityId: 'doc-1', timestamp: new Date(Date.now() - 7200000).toISOString() },
    ]
  };

  const fetchAuditLogs = useCallback(async (page = 1, entity = '', action = '', userId = '') => {
    setAuditLoading(true);
    if (!token || token.startsWith('mock-')) {
      // Offline mock fallback — apply client-side filters
      let filtered = MOCK_AUDIT_LOGS;
      if (entity) filtered = filtered.filter(l => l.entity === entity.toUpperCase());
      if (action) filtered = filtered.filter(l => l.action === action.toUpperCase());
      setAuditLogs(filtered);
      setAuditSummary(MOCK_AUDIT_SUMMARY);
      setAuditTotal(filtered.length);
      setAuditTotalPages(1);
      setAuditLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (entity) params.set('entity', entity);
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/audit?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/audit/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        if (data.status === 'success') {
          setAuditLogs(data.data);
          setAuditTotal(data.meta.total);
          setAuditTotalPages(data.meta.totalPages);
        }
      }
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        if (sData.status === 'success') setAuditSummary(sData.data);
      }
    } catch (err) {
      // Fallback to mock on error
      setAuditLogs(MOCK_AUDIT_LOGS);
      setAuditSummary(MOCK_AUDIT_SUMMARY);
      setAuditTotal(MOCK_AUDIT_LOGS.length);
      setAuditTotalPages(1);
    } finally {
      setAuditLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditPage, auditFilterEntity, auditFilterAction, auditFilterUser);
    }
  }, [activeTab, auditPage]);

  // ── CSV Export: Pharmacy Inventory ────────────────────────────────────────
  const handleExportPharmacyCSV = useCallback(async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pharmacy_inventory_${dateStr}.csv`;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/inventory/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    // Offline / mock fallback — build CSV from current in-memory inventory state
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Medicine ID', 'Generic Name', 'Brand Name', 'Manufacturer',
      'Strength', 'Unit', 'Expiry Date', 'Current Stock',
      'Reorder Level', 'Batch Number', 'Status'
    ].map(h => `"${h}"`).join(',');

    const rows = inventory.map((item: any) => {
      const isLow = item.currentStock <= item.reorderLevel;
      const isCritical = item.currentStock < (item.minimumStock || 0);
      const status = isCritical ? 'CRITICAL STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';
      return [
        esc(item.medicineId), esc(item.genericName), esc(item.brandName),
        esc(item.manufacturer), esc(item.strength), esc(item.unit),
        esc(item.expiryDate), esc(item.currentStock), esc(item.reorderLevel),
        esc(item.locationBatch || item.batchNumber || ''), esc(status)
      ].join(',');
    });

    const csv = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [token, inventory]);

  // ── CSV Export: Audit Logs ────────────────────────────────────────────────
  const handleExportAuditCSV = useCallback(async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit_log_${dateStr}.csv`;

    // Build query string from active filters
    const params = new URLSearchParams();
    if (auditFilterEntity) params.set('entity', auditFilterEntity);
    if (auditFilterAction) params.set('action', auditFilterAction);
    if (auditFilterUser)   params.set('userId', auditFilterUser);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/audit/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    // Offline / mock fallback — build CSV from current auditLogs state
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Audit ID', 'Timestamp', 'Username', 'Role',
      'Action', 'Entity', 'Entity ID', 'IP Address'
    ].map(h => `"${h}"`).join(',');

    const rows = auditLogs.map((l: any) => [
      esc(l.auditId), esc(l.timestamp), esc(l.username || 'Unknown'),
      esc(l.role || 'UNKNOWN'), esc(l.action), esc(l.entity),
      esc(l.entityId), esc(l.ipAddress)
    ].join(','));

    const csv = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [token, auditLogs, auditFilterEntity, auditFilterAction, auditFilterUser]);

  // Mock Visit History Helper
  const getMockHistory = (patientId: string) => {
    return [
      {
        consultationId: 'cons-mock-1',
        appointment: { date: '2026-07-06T10:00:00.000Z' },
        doctor: { user: { username: 'Col. Rajesh Sharma' }, department: { departmentName: 'Cardiology' } },
        diagnosis: 'Mild hypertension & palpitations',
        symptoms: ['Chest tightness', 'Shortness of breath'],
        notes: 'Prescribed medication, advised low-sodium diet and follow-up in 2 weeks.',
        prescription: {
          items: [
            { medicine: { brandName: 'Amlodipine' }, dosage: '5mg', frequency: 'Once daily' }
          ]
        },
        labReports: [
          { testName: 'ECG (12-Lead)', status: 'COMPLETED' }
        ],
        referrals: [
          { referredHospital: 'Command Hospital (CC), Lucknow', status: 'APPROVED' }
        ]
      },
      {
        consultationId: 'cons-mock-2',
        appointment: { date: '2026-06-20T09:30:00.000Z' },
        doctor: { user: { username: 'Lt. Col. Vikram Aditya' }, department: { departmentName: 'Orthopedics' } },
        diagnosis: 'Acute knee strain',
        symptoms: ['Knee swelling', 'Joint stiffness'],
        notes: 'Advised rest, ice application, and knee brace usage.',
        prescription: {
          items: [
            { medicine: { brandName: 'Ibuprofen' }, dosage: '400mg', frequency: 'Twice daily' }
          ]
        },
        labReports: [],
        referrals: []
      }
    ];
  };

  // Fetch patient medical history
  const fetchPatientHistory = useCallback(async (patientId: string) => {
    setFetchingHistory(true);
    if (!token || token.startsWith('mock-')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPatientHistoryLogs(getMockHistory(patientId));
      setFetchingHistory(false);
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/patients/history?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const result = await resp.json();
        if (result.status === 'success') {
          setPatientHistoryLogs(result.data);
          return;
        }
      }
      throw new Error('API error');
    } catch (_) {
      setPatientHistoryLogs(getMockHistory(patientId));
    } finally {
      setFetchingHistory(false);
    }
  }, [token]);

  // Excel Export: Pharmacy Inventory
  const handleExportPharmacyXLSX = useCallback(async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pharmacy_inventory_${dateStr}.xlsx`;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/inventory/export-xlsx`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    alert("Demo Mode: Simulated Excel (.xlsx) download for Pharmacy Inventory. Real Excel workbook will download in connected database environment.");
  }, [token]);

  // Excel Export: Audit Logs
  const handleExportAuditXLSX = useCallback(async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit_log_${dateStr}.xlsx`;

    const params = new URLSearchParams();
    if (auditFilterEntity) params.set('entity', auditFilterEntity);
    if (auditFilterAction) params.set('action', auditFilterAction);
    if (auditFilterUser)   params.set('userId', auditFilterUser);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/audit/export-xlsx?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    alert("Demo Mode: Simulated Excel (.xlsx) download for Audit Logs. Real Excel workbook will download in connected database environment.");
  }, [token, auditFilterEntity, auditFilterAction, auditFilterUser]);

  // Patient History Export functions
  const handleExportPatientHistoryPDF = useCallback(async (patientId: string, defenceId: string) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `visit_history_${defenceId}_${dateStr}.pdf`;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/history/export-pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    alert(`Demo Mode: Simulated PDF download for Patient ${defenceId} medical history. Real PDF will download in connected database environment.`);
  }, [token]);

  const handleExportPatientHistoryCSV = useCallback(async (patientId: string, defenceId: string) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `visit_history_${defenceId}_${dateStr}.csv`;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/history/export-csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Date', 'Doctor', 'Department', 'Diagnosis', 'Symptoms', 'Notes', 'Prescriptions', 'Lab Reports', 'Referrals'].map(h => `"${h}"`).join(',');
    const rows = patientHistoryLogs.map((c: any) => {
      const dateVal = c.appointment?.date ? new Date(c.appointment.date).toISOString().split('T')[0] : '';
      const prescStr = (c.prescription?.items || []).map((i: any) => `${i.medicine?.brandName || ''} ${i.dosage || ''} ${i.frequency || ''}`).join('; ');
      const labStr = (c.labReports || []).map((l: any) => `${l.testName}: ${l.status}`).join('; ');
      const refStr = (c.referrals || []).map((r: any) => `${r.referredHospital}: ${r.status}`).join('; ');
      return [
        esc(dateVal), esc(c.doctor?.user?.username || ''), esc(c.doctor?.department?.departmentName || ''),
        esc(c.diagnosis || ''), esc((c.symptoms || []).join(', ')), esc(c.notes || ''),
        esc(prescStr), esc(labStr), esc(refStr)
      ].join(',');
    });

    const csv = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [token, patientHistoryLogs]);

  const handleExportPatientHistoryXLSX = useCallback(async (patientId: string, defenceId: string) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `visit_history_${defenceId}_${dateStr}.xlsx`;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/history/export-xlsx`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (_) { /* fallback below */ }

    alert(`Demo Mode: Simulated Excel (.xlsx) download for Patient ${defenceId} medical history. Real Excel workbook will download in connected database environment.`);
  }, [token]);

  // Lab Reports States (Milestone 10)
  const [labReports, setLabReports]           = useState<any[]>([]);
  const [labSummary, setLabSummary]           = useState<any>(null);
  const [labLoading, setLabLoading]           = useState(false);
  const [labFilterStatus, setLabFilterStatus] = useState('');
  const [labModal, setLabModal]               = useState<{ open: boolean; report: any | null }>({ open: false, report: null });
  const [labUpdateForm, setLabUpdateForm]     = useState({ status: '', result: '', performedBy: '' });
  const [labNewForm, setLabNewForm]           = useState({ testName: '', performedBy: '' });
  const [labNewModal, setLabNewModal]         = useState(false);

  const MOCK_LAB_REPORTS: any[] = [
    { testId: 'lab-1', consultationId: 'cons-1', testName: 'Complete Blood Count (CBC)', status: 'COMPLETED', result: 'Hb: 13.2 g/dL | WBC: 7400/uL | Platelets: 2.1 L/uL -- Within normal limits.', performedBy: 'Lab Tech Sgt. Amit Rathore', patientDefenceId: 'DEF-90812-M', patientRank: 'Major', doctorUsername: 'doctor', appointmentDate: '2026-07-06' },
    { testId: 'lab-2', consultationId: 'cons-1', testName: 'X-Ray Knee (AP & Lateral)', status: 'COMPLETED', result: 'Mild joint space narrowing in medial compartment. Osteophytes noted. No fracture.', performedBy: 'Radiographer Cpl. Suresh Meena', patientDefenceId: 'DEF-90812-M', patientRank: 'Major', doctorUsername: 'doctor', appointmentDate: '2026-07-06' },
    { testId: 'lab-3', consultationId: 'cons-1', testName: 'Liver Function Tests (LFT)', status: 'IN_PROGRESS', result: null, performedBy: 'Lab Tech L/Nk Pradeep Singh', patientDefenceId: 'DEF-90812-M', patientRank: 'Major', doctorUsername: 'doctor', appointmentDate: '2026-07-06' },
    { testId: 'lab-4', consultationId: 'cons-1', testName: 'Urine Routine & Microscopy', status: 'PENDING', result: null, performedBy: null, patientDefenceId: 'DEF-90812-M', patientRank: 'Major', doctorUsername: 'doctor', appointmentDate: '2026-07-06' },
    { testId: 'lab-5', consultationId: 'cons-1', testName: 'ECG (12-Lead)', status: 'PENDING', result: null, performedBy: null, patientDefenceId: 'DEF-34190-F', patientRank: 'Captain', doctorUsername: 'doctor', appointmentDate: '2026-07-05' },
    { testId: 'lab-6', consultationId: 'cons-2', testName: 'Serum Creatinine', status: 'CANCELLED', result: null, performedBy: null, patientDefenceId: 'DEF-34190-F', patientRank: 'Captain', doctorUsername: 'doctor', appointmentDate: '2026-07-04' },
  ];

  const MOCK_LAB_SUMMARY = {
    total: 6,
    byStatus: [
      { status: 'PENDING', count: 2 },
      { status: 'IN_PROGRESS', count: 1 },
      { status: 'COMPLETED', count: 2 },
      { status: 'CANCELLED', count: 1 },
    ]
  };

  const fetchLabReports = useCallback(async (statusFilter = '') => {
    setLabLoading(true);
    if (!token || token.startsWith('mock-')) {
      let filtered = MOCK_LAB_REPORTS;
      if (statusFilter) filtered = filtered.filter((r: any) => r.status === statusFilter.toUpperCase());
      setLabReports(filtered);
      setLabSummary(MOCK_LAB_SUMMARY);
      setLabLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const [reportsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/lab-reports?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/lab-reports/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (reportsRes.ok) { const d = await reportsRes.json(); if (d.status === 'success') setLabReports(d.data); }
      if (summaryRes.ok) { const s = await summaryRes.json(); if (s.status === 'success') setLabSummary(s.data); }
    } catch { setLabReports(MOCK_LAB_REPORTS); setLabSummary(MOCK_LAB_SUMMARY); }
    finally { setLabLoading(false); }
  }, [token]);

  const downloadLabReportPDF = async (testId: string) => {
    if (!token || token.startsWith('mock-')) {
      alert("Demo Mode: Simulated PDF download for Lab Report " + testId + ". Real PDF will download in connected database environment.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/lab-reports/${testId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lab-report-${testId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    }
  };

  useEffect(() => { if (activeTab === 'lab-reports') fetchLabReports(labFilterStatus); }, [activeTab]);

  const handleUpdateLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labModal.report) return;
    const id = labModal.report.testId;
    const applyLocal = () => setLabReports(prev => prev.map((r: any) =>
      r.testId === id
        ? { ...r, status: labUpdateForm.status || r.status, result: labUpdateForm.result || r.result, performedBy: labUpdateForm.performedBy || r.performedBy }
        : r
    ));
    if (!token || token.startsWith('mock-')) { applyLocal(); setLabModal({ open: false, report: null }); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lab-reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: labUpdateForm.status || undefined, result: labUpdateForm.result || undefined, performedBy: labUpdateForm.performedBy || undefined })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') setLabReports(prev => prev.map((r: any) => r.testId === id ? { ...r, ...data.data } : r));
      else applyLocal();
    } catch { applyLocal(); }
    setLabModal({ open: false, report: null });
  };

  const handleCreateLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labNewForm.testName.trim()) return;
    if (!token || token.startsWith('mock-')) {
      const newR = { testId: `lab-mock-${Date.now()}`, consultationId: 'cons-1', testName: labNewForm.testName, status: 'PENDING', result: null, performedBy: labNewForm.performedBy || null, patientDefenceId: null, patientRank: null, doctorUsername: null, appointmentDate: null };
      setLabReports(prev => [newR, ...prev]);
      setLabNewModal(false); setLabNewForm({ testName: '', performedBy: '' }); return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/lab-reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testName: labNewForm.testName, performedBy: labNewForm.performedBy || undefined })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') setLabReports(prev => [data.data, ...prev]);
    } catch (err) { console.warn('Create lab report failed:', err); }
    setLabNewModal(false); setLabNewForm({ testName: '', performedBy: '' });
  };

  // ─────────────────────────────────────────────────────────────────────
  // User Management States (Milestone 11)
  // ─────────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [usersSummary, setUsersSummary] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilterRole, setUsersFilterRole] = useState('');
  const [usersFilterStatus, setUsersFilterStatus] = useState('');
  const [userStatusModal, setUserStatusModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [userStatusForm, setUserStatusForm] = useState({ status: '', reason: '' });
  const [userNewModal, setUserNewModal] = useState(false);
  const [userNewForm, setUserNewForm] = useState({ username: '', password: '', email: '', phone: '', role: 'DOCTOR', serviceNumber: '' });

  const MOCK_USERS = [
    { id: 'user-1', username: 'admin', role: 'ADMIN', email: 'admin@militaryhospital.gov.in', phone: '+919999999999', status: 'ACTIVE', serviceNumber: 'SM-90001', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'user-2', username: 'doctor', role: 'DOCTOR', email: 'vikram.dev@militaryhospital.gov.in', phone: '+918888888888', status: 'ACTIVE', serviceNumber: 'SM-10042', createdAt: new Date(Date.now() - 28 * 86400000).toISOString() },
    { id: 'user-3', username: 'patient', role: 'PATIENT', email: 'sharma@militaryhospital.gov.in', phone: '+917777777777', status: 'ACTIVE', serviceNumber: 'DEF-90812-M', createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
    { id: 'user-4', username: 'pharmacist01', role: 'PHARMACIST', email: 'pharmacist01@militaryhospital.gov.in', phone: '+917777777888', status: 'ACTIVE', serviceNumber: 'SM-20188', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'user-5', username: 'labtech01', role: 'LAB_TECHNICIAN', email: 'labtech01@militaryhospital.gov.in', phone: '+917777777999', status: 'ACTIVE', serviceNumber: 'SM-20199', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: 'user-6', username: 'ref_officer', role: 'REFERRAL_OFFICER', email: 'ref_officer@militaryhospital.gov.in', phone: '+917777777111', status: 'SUSPENDED', serviceNumber: 'SM-20211', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  ];

  const MOCK_USERS_SUMMARY = {
    total: 6,
    byRole: [
      { role: 'ADMIN', count: 1 },
      { role: 'DOCTOR', count: 1 },
      { role: 'PATIENT', count: 1 },
      { role: 'PHARMACIST', count: 1 },
      { role: 'LAB_TECHNICIAN', count: 1 },
      { role: 'REFERRAL_OFFICER', count: 1 },
    ],
    byStatus: [
      { status: 'ACTIVE', count: 5 },
      { status: 'INACTIVE', count: 0 },
      { status: 'SUSPENDED', count: 1 },
    ]
  };

  const fetchUsers = useCallback(async (roleFilter = '', statusFilter = '') => {
    setUsersLoading(true);
    if (!token || token.startsWith('mock-')) {
      let filtered = MOCK_USERS;
      if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);
      if (statusFilter) filtered = filtered.filter(u => u.status === statusFilter);
      setUsers(filtered);
      setUsersSummary(MOCK_USERS_SUMMARY);
      setUsersLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const [usersRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/users?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/users/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (usersRes.ok) {
        const d = await usersRes.json();
        if (d.status === 'success') setUsers(d.data);
      }
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        if (s.status === 'success') setUsersSummary(s.data);
      }
    } catch {
      setUsers(MOCK_USERS);
      setUsersSummary(MOCK_USERS_SUMMARY);
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  // Dashboard Stats live integration (Milestone 12)
  const [liveStats, setLiveStats] = useState<{
    waiting: number;
    inConsult: number;
    completed: number;
    lowStock: number;
    pendingReferrals: number;
    activeDocs: number;
  } | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    if (!token || token.startsWith('mock-')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setLiveStats({
          waiting: result.data.waiting,
          inConsult: result.data.inConsultation,
          completed: result.data.completed || 0,
          lowStock: result.data.lowStock,
          pendingReferrals: result.data.pendingReferrals,
          activeDocs: result.data.activeDocs
        });
        console.log('Successfully fetched dashboard stats from backend database.');
      }
    } catch (err) {
      console.warn('Failed to fetch dashboard stats from backend, using computed values.', err);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token && !token.startsWith('mock-')) {
      fetchDashboardStats();
    }
  }, [appointments, inventory, referrals, doctors, fetchDashboardStats, isAuthenticated, token]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(usersFilterRole, usersFilterStatus);
  }, [activeTab, usersFilterRole, usersFilterStatus]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardStats();
  }, [activeTab, fetchDashboardStats]);

  // ─────────────────────────────────────────────────────────────────────
  // Real-time WebSocket Live Data Sync (Milestone 19)
  // ─────────────────────────────────────────────────────────────────────
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsTicker, setWsTicker]       = useState<string>('Connected to MHSHMS Live Data Feed');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWS = () => {
      try {
        const host = window.location.hostname || 'localhost';
        const wsUrl = getWsUrl();
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
          setWsTicker('Connected to MHSHMS Real-time Data Sync');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'BED_UPDATE') {
              setWsTicker(`Bed update: ${payload.data.bedId || 'Telemetry'} (${payload.data.status || 'Updated'})`);
              fetchDashboardStats();
            } else if (payload.type === 'SYSTEM_NOTIFICATION') {
              setWsTicker(payload.data.message || 'System event received');
            } else if (payload.type === 'APPOINTMENT_UPDATED') {
              setWsTicker(`Appointment update for Token #${payload.data.tokenNumber || 'N/A'}`);
              fetchDashboardStats();
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          setWsTicker('Live Data Sync Offline (Polling fallback)');
          reconnectTimer = setTimeout(connectWS, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (_) {
        setWsConnected(false);
      }
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [fetchDashboardStats]);

  // ─────────────────────────────────────────────────────────────────────
  // Bed Telemetry States (Milestone 13)
  // ─────────────────────────────────────────────────────────────────────
  const [beds, setBeds]                     = useState<any[]>([]);
  const [bedsSummary, setBedsSummary]       = useState<any>(null);
  const [bedsLoading, setBedsLoading]       = useState(false);
  const [selectedBed, setSelectedBed]       = useState<any | null>(null);
  const [bedFormPatient, setBedFormPatient] = useState('');
  const [bedFormRank, setBedFormRank]       = useState('Major');
  const [bedModalOpen, setBedModalOpen]     = useState(false);
  const [activeFloor, setActiveFloor]       = useState<number>(1);

  const MOCK_BEDS_TELEMETRY: any[] = [
    { bedId: 'BED-GEN-1', type: 'GENERAL', ward: 'Kargil General Ward', floor: 1, status: 'OCCUPIED', patientDefenceId: 'DEF-90812-M', patientRank: 'Major', admittedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
    { bedId: 'BED-GEN-2', type: 'GENERAL', ward: 'Kargil General Ward', floor: 1, status: 'VACANT' },
    { bedId: 'BED-GEN-3', type: 'GENERAL', ward: 'Kargil General Ward', floor: 1, status: 'OCCUPIED', patientDefenceId: 'DEF-34190-F', patientRank: 'Captain', admittedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { bedId: 'BED-GEN-4', type: 'GENERAL', ward: 'Siachen Acute Care Ward', floor: 1, status: 'MAINTENANCE' },
    { bedId: 'BED-GEN-5', type: 'GENERAL', ward: 'Siachen Acute Care Ward', floor: 1, status: 'VACANT' },
    { bedId: 'BED-ICU-1', type: 'ICU', ward: 'Rezang La ICU Wing', floor: 2, status: 'OCCUPIED', patientDefenceId: 'DEF-88190-M', patientRank: 'Havildar', admittedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { bedId: 'BED-ICU-2', type: 'ICU', ward: 'Rezang La ICU Wing', floor: 2, status: 'VACANT' },
    { bedId: 'BED-ICU-3', type: 'ICU', ward: 'Rezang La ICU Wing', floor: 2, status: 'MAINTENANCE' },
    { bedId: 'BED-GEN-6', type: 'GENERAL', ward: 'Tiger Hill Recovery Suite', floor: 3, status: 'VACANT' }
  ];

  const MOCK_BEDS_SUMMARY = {
    totalBeds: 450,
    icuTotal: 50,
    icuOccupied: 1,
    generalTotal: 400,
    generalOccupied: 2,
    maintenanceTotal: 2,
    vacancyTotal: 445
  };

  const fetchBedsTelemetry = useCallback(async () => {
    setBedsLoading(true);
    if (!token || token.startsWith('mock-')) {
      setBeds(MOCK_BEDS_TELEMETRY);
      setBedsSummary(MOCK_BEDS_SUMMARY);
      setBedsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/hospital/beds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setBeds(result.data.telemetry);
        setBedsSummary(result.data.summary);
      }
    } catch {
      setBeds(MOCK_BEDS_TELEMETRY);
      setBedsSummary(MOCK_BEDS_SUMMARY);
    } finally {
      setBedsLoading(false);
    }
  }, [token]);

  const downloadTelemetryPDF = async () => {
    if (!token || token.startsWith('mock-')) {
      alert("Demo Mode: Simulated PDF download for Bed Telemetry report. Real PDF will download in connected database environment.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/hospital/beds/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bed-telemetry-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'beds') fetchBedsTelemetry();
  }, [activeTab, fetchBedsTelemetry]);

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !bedFormPatient) return;
    const bedId = selectedBed.bedId;

    const applyLocal = () => setBeds(prev => prev.map(b =>
      b.bedId === bedId
        ? { ...b, status: 'OCCUPIED', patientDefenceId: bedFormPatient, patientRank: bedFormRank, admittedAt: new Date().toISOString() }
        : b
    ));

    if (!token || token.startsWith('mock-')) {
      applyLocal();
      setBedModalOpen(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hospital/beds/${bedId}/allocate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patientDefenceId: bedFormPatient, patientRank: bedFormRank })
      });
      if (res.ok) {
        fetchBedsTelemetry();
      } else {
        applyLocal();
      }
    } catch {
      applyLocal();
    }
    setBedModalOpen(false);
  };

  const handleReleaseBed = async (bedId: string) => {
    const applyLocal = () => setBeds(prev => prev.map(b => {
      if (b.bedId === bedId) {
        const { patientDefenceId, patientRank, admittedAt, ...rest } = b;
        return { ...rest, status: 'VACANT' };
      }
      return b;
    }));

    if (!token || token.startsWith('mock-')) {
      applyLocal();
      setBedModalOpen(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hospital/beds/${bedId}/release`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBedsTelemetry();
      } else {
        applyLocal();
      }
    } catch {
      applyLocal();
    }
    setBedModalOpen(false);
  };

  const handleToggleMaintenance = async (bedId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'MAINTENANCE' ? 'VACANT' : 'MAINTENANCE';
    const applyLocal = () => setBeds(prev => prev.map(b =>
      b.bedId === bedId ? { ...b, status: nextStatus } : b
    ));

    if (!token || token.startsWith('mock-')) {
      applyLocal();
      setBedModalOpen(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hospital/beds/${bedId}/maintenance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ underMaintenance: nextStatus === 'MAINTENANCE' })
      });
      if (res.ok) {
        fetchBedsTelemetry();
      } else {
        applyLocal();
      }
    } catch {
      applyLocal();
    }
    setBedModalOpen(false);
  };

  const handleUpdateUserStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userStatusModal.user) return;
    const id = userStatusModal.user.id;

    const applyLocal = () => setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: userStatusForm.status } : u
    ));

    if (!token || token.startsWith('mock-')) {
      applyLocal();
      setUserStatusModal({ open: false, user: null });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: userStatusForm.status, reason: userStatusForm.reason || undefined })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data.data } : u));
      } else {
        applyLocal();
      }
    } catch {
      applyLocal();
    }
    setUserStatusModal({ open: false, user: null });
  };

  const handleCreateStaffUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNewForm.username.trim() || !userNewForm.password.trim()) return;

    if (!token || token.startsWith('mock-')) {
      const newU = {
        id: `user-mock-${Date.now()}`,
        username: userNewForm.username,
        role: userNewForm.role,
        email: userNewForm.email,
        phone: userNewForm.phone,
        status: 'ACTIVE',
        serviceNumber: userNewForm.serviceNumber || null,
        createdAt: new Date().toISOString()
      };
      setUsers(prev => [newU, ...prev]);
      setUserNewModal(false);
      setUserNewForm({ username: '', password: '', email: '', phone: '', role: 'DOCTOR', serviceNumber: '' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userNewForm)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUsers(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.warn('Create user failed:', err);
    }
    setUserNewModal(false);
    setUserNewForm({ username: '', password: '', email: '', phone: '', role: 'DOCTOR', serviceNumber: '' });
  };




  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageSymptoms.trim()) return;

    setTriageLoading(true);
    setTriageError(null);
    setTriageResult(null);
    setTriageDoctors([]);

    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: [triageSymptoms],
          age: Number(triageAge),
          gender: triageGender
        })
      });

      if (!response.ok) throw new Error('Failed to retrieve triage response');
      const triageData = await response.json();
      setTriageResult(triageData);

      const docResponse = await fetch('http://localhost:8000/api/v1/ai/recommend-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: triageData.department,
          symptoms: [triageSymptoms]
        })
      });

      if (docResponse.ok) {
        const docData = await docResponse.json();
        setTriageDoctors(docData);
      }
    } catch (err: any) {
      console.warn('AI Service unreachable. Running local fallback.');
      const sym = triageSymptoms.toLowerCase();
      let department = 'General Medicine';
      let confidence = 0.65;
      let urgency = 'MEDIUM';
      let explanation = 'Based on symptoms, a general evaluation is recommended.';
      let mockDocs = [
        { doctorId: 'doc-gen-1', doctorName: 'Lt. Col. Dr. Rajesh Verma', matchScore: 0.90, reason: 'General Medicine specialist, immediate availability.' }
      ];

      if (sym.includes('chest pain') || sym.includes('heart') || sym.includes('palpitation')) {
        department = 'Cardiology';
        confidence = 0.95;
        urgency = 'EMERGENCY';
        explanation = 'Chest pain and cardiovascular symptoms require immediate evaluation by Cardiology.';
        mockDocs = [
          { doctorId: 'doc-cardio-1', doctorName: 'Col. Dr. A. K. Sharma', matchScore: 0.98, reason: 'Senior Cardiologist with 22 years experience, available in 15 mins.' }
        ];
      } else if (sym.includes('fracture') || sym.includes('bone') || sym.includes('knee') || sym.includes('joint') || sym.includes('back')) {
        department = 'Orthopedics';
        confidence = 0.88;
        urgency = 'MEDIUM';
        explanation = 'Joint/bone symptoms point toward musculoskeletal issues. Orthopedics consultation advised.';
        mockDocs = [
          { doctorId: 'doc-ortho-1', doctorName: 'Maj. Dr. Vikram Dev', matchScore: 0.94, reason: 'Specialist in sports injury, average queue time: 8 mins.' }
        ];
      }

      setTriageResult({ department, confidence, urgency, explanation });
      setTriageDoctors(mockDocs);
    } finally {
      setTriageLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (token.startsWith('mock-')) return;

    const fetchPatients = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          const normalizedPatients = result.data.map((p: any) => ({
            patientId: p.patientId,
            userId: p.userId,
            defenceId: p.defenceId,
            bloodGroup: p.bloodGroup,
            dob: p.dob ? p.dob.split('T')[0] : '',
            gender: p.gender,
            unit: p.unit,
            rank: p.rank,
            retired: p.retired,
            dependentType: p.dependentType,
            emergencyContact: {
              name: p.emergencyName || '',
              relation: p.emergencyRel || '',
              phone: p.emergencyPhone || ''
            },
            address: p.address,
            allergies: p.allergies || [],
            currentHospital: p.currentHospital || 'Military Hospital Jaipur'
          }));
          setPatients(normalizedPatients);
          console.log('Successfully fetched patients from backend database.');
        } else {
          console.warn('API returned error or role unauthorized for fetching patients. Falling back to mock data.');
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable. Falling back to mock data.', err);
      }
    };

    const fetchDoctors = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          const fetchedDoctors = result.data.map((d: any) => {
            // Dynamically populate DOCTOR_NAMES mapping with real backend names
            DOCTOR_NAMES[d.doctorId] = d.user?.username || 'Unknown Doctor';
            return {
              doctorId: d.doctorId,
              userId: d.userId,
              departmentId: d.departmentId,
              specialization: d.specialization,
              qualification: d.qualification,
              experience: d.experience,
              availableToday: d.availableToday,
              roomNumber: d.roomNumber,
              licenseNumber: d.licenseNumber
            };
          });
          setDoctors(fetchedDoctors);
          console.log('Successfully fetched doctors from backend database.');
        } else {
          console.warn('API returned error for fetching doctors. Using mock doctors.');
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable for doctors. Using mock doctors.', err);
      }
    };

    const fetchAppointments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/appointments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setAppointments(result.data);
          console.log('Successfully fetched appointments from backend database.');
        } else {
          console.warn('API returned error for fetching appointments. Using mock appointments.');
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable for appointments. Using mock appointments.', err);
      }
    };

    const fetchInventory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setInventory(result.data);
          console.log('Successfully fetched pharmacy inventory from backend database.');
        } else {
          console.warn('API returned error for fetching inventory. Using mock inventory.');
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable for inventory. Using mock inventory.', err);
      }
    };

    const fetchReferrals = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/referrals`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setReferrals(result.data);
          console.log('Successfully fetched referrals from backend database.');
        } else {
          console.warn('API returned error for fetching referrals. Using mock referrals.');
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable for referrals. Using mock referrals.', err);
      }
    };

    // Avoid calling GET /patients for PATIENT role as it is unauthorized (only Admin/Doctor/etc. have list rights)
    if (currentUser?.role && currentUser.role !== 'PATIENT') {
      fetchPatients();
    }
    fetchDoctors();
    fetchAppointments();
    fetchInventory();
    fetchReferrals();
    fetchNotifications();
    fetchDashboardStats();
  }, [isAuthenticated, token, currentUser, fetchNotifications, fetchDashboardStats]);

  // 30-second notification polling
  useEffect(() => {
    if (!isAuthenticated || !token || token.startsWith('mock-')) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Search & Filter States
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [pharmacySearch, setPharmacySearch] = useState('');

  // Modals States
  const [patientModal, setPatientModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: Patient | null }>({
    open: false,
    mode: 'add',
    data: null
  });
  const [doctorModal, setDoctorModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: Doctor | null }>({
    open: false,
    mode: 'add',
    data: null
  });
  const [appointmentModal, setAppointmentModal] = useState(false);
  const [inventoryModal, setInventoryModal] = useState<{ open: boolean; data?: InventoryItem | null }>({
    open: false,
    data: null
  });

  // Patient CRUD Form State
  const [patientForm, setPatientForm] = useState({
    defenceId: '',
    name: '',
    dob: '',
    gender: 'MALE' as Gender,
    bloodGroup: 'O+' as BloodGroup,
    rank: '',
    unit: '',
    dependentType: 'SELF' as DependentType,
    allergies: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRel: '',
    address: ''
  });

  // Doctor Form State
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    departmentId: 'dept-gen-med',
    specialization: '',
    qualification: '',
    experience: 5,
    roomNumber: '',
    licenseNumber: '',
    availableToday: true
  });

  // Appointment Form State
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    doctorId: 'doc-1',
    priority: 'NORMAL' as PriorityLevel
  });

  // Stock Edit Form State
  const [stockEditValue, setStockEditValue] = useState(0);

  // ==========================================
// BUSINESS LOGIC METHODS (CRUD & SIMULATIONS)
// ==========================================

  // Patient CRUD
  const handleOpenAddPatient = () => {
    setPatientForm({
      defenceId: '',
      name: '',
      dob: '1990-01-01',
      gender: 'MALE',
      bloodGroup: 'O+',
      rank: 'Lieutenant',
      unit: '6 Infantry Division',
      dependentType: 'SELF',
      allergies: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRel: '',
      address: 'Army Cantonment'
    });
    setPatientModal({ open: true, mode: 'add', data: null });
  };

  const handleOpenEditPatient = (pat: Patient) => {
    setPatientForm({
      defenceId: pat.defenceId,
      name: pat.dependentType === 'SELF' ? pat.rank + ' ' + pat.patientId : pat.patientId, // simplified name parsing from mock
      dob: pat.dob,
      gender: pat.gender,
      bloodGroup: pat.bloodGroup,
      rank: pat.rank,
      unit: pat.unit,
      dependentType: pat.dependentType,
      allergies: pat.allergies.join(', '),
      emergencyName: pat.emergencyContact.name,
      emergencyPhone: pat.emergencyContact.phone,
      emergencyRel: pat.emergencyContact.relation,
      address: pat.address
    });
    setPatientModal({ open: true, mode: 'edit', data: pat });
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core payload for Patient updates
    const patientPayload = {
      defenceId: patientForm.defenceId,
      bloodGroup: patientForm.bloodGroup,
      dob: patientForm.dob,
      gender: patientForm.gender,
      unit: patientForm.unit,
      rank: patientForm.rank,
      dependentType: patientForm.dependentType,
      emergencyName: patientForm.emergencyName,
      emergencyRel: patientForm.emergencyRel,
      emergencyPhone: patientForm.emergencyPhone,
      address: patientForm.address,
      allergies: patientForm.allergies || '',
      currentHospital: 'Military Hospital Jaipur'
    };

    let saveSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const url = patientModal.mode === 'add' 
          ? `${API_BASE_URL}/api/v1/patients`
          : `${API_BASE_URL}/api/v1/patients/${patientModal.data?.patientId}`;
        
        const response = await fetch(url, {
          method: patientModal.mode === 'add' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(patientPayload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          const p = result.data;
          const normalized = {
            patientId: p.patientId,
            userId: p.userId,
            defenceId: p.defenceId,
            bloodGroup: p.bloodGroup,
            dob: p.dob ? p.dob.split('T')[0] : '',
            gender: p.gender,
            unit: p.unit,
            rank: p.rank,
            retired: p.retired,
            dependentType: p.dependentType,
            emergencyContact: {
              name: p.emergencyName || '',
              relation: p.emergencyRel || '',
              phone: p.emergencyPhone || ''
            },
            address: p.address,
            allergies: p.allergies || [],
            currentHospital: p.currentHospital || 'Military Hospital Jaipur'
          };

          if (patientModal.mode === 'add') {
            setPatients([normalized, ...patients]);
          } else {
            setPatients(patients.map(item => item.patientId === normalized.patientId ? normalized : item));
          }
          saveSuccess = true;
          console.log(`Backend Patient ${patientModal.mode === 'add' ? 'registered' : 'updated'} successfully.`);
        } else {
          console.warn('API save returned an error. Falling back to local offline mock.');
        }
      } catch (err) {
        console.warn('Backend API save failed. Falling back to local offline mock.', err);
      }
    }

    // Offline / Mock Fallback if API was unreachable or failed
    if (!saveSuccess) {
      if (patientModal.mode === 'add') {
        const newPatient: Patient = {
          patientId: `pat-${patients.length + 1}`,
          userId: `user-pat-${patients.length + 1}`,
          defenceId: patientForm.defenceId,
          bloodGroup: patientForm.bloodGroup,
          dob: patientForm.dob,
          gender: patientForm.gender,
          unit: patientForm.unit,
          rank: patientForm.rank,
          retired: patientForm.rank.toLowerCase().includes('retd'),
          dependentType: patientForm.dependentType,
          emergencyContact: {
            name: patientForm.emergencyName,
            relation: patientForm.emergencyRel,
            phone: patientForm.emergencyPhone
          },
          address: patientForm.address,
          allergies: patientForm.allergies ? patientForm.allergies.split(',').map(s => s.trim()) : [],
          currentHospital: 'Military Hospital Jaipur'
        };
        setPatients([newPatient, ...patients]);
      } else if (patientModal.mode === 'edit' && patientModal.data) {
        const updated = patients.map(p => {
          if (p.patientId === patientModal.data?.patientId) {
            return {
              ...p,
              defenceId: patientForm.defenceId,
              bloodGroup: patientForm.bloodGroup,
              dob: patientForm.dob,
              gender: patientForm.gender,
              unit: patientForm.unit,
              rank: patientForm.rank,
              dependentType: patientForm.dependentType,
              emergencyContact: {
                name: patientForm.emergencyName,
                relation: patientForm.emergencyRel,
                phone: patientForm.emergencyPhone
              },
              address: patientForm.address,
              allergies: patientForm.allergies ? patientForm.allergies.split(',').map(s => s.trim()) : []
            };
          }
          return p;
        });
        setPatients(updated);
      }
    }

    setPatientModal({ open: false, mode: 'add', data: null });
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm("Are you sure you want to remove this patient file?")) {
      return;
    }

    let deleteSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setPatients(patients.filter(p => p.patientId !== id));
          deleteSuccess = true;
          console.log('Backend Patient file deleted successfully.');
        } else {
          console.warn('API delete returned an error. Falling back to local offline mock.');
        }
      } catch (err) {
        console.warn('Backend API delete failed. Falling back to local offline mock.', err);
      }
    }

    if (!deleteSuccess) {
      setPatients(patients.filter(p => p.patientId !== id));
    }
  };


  // Doctor CRUD
  const handleOpenAddDoctor = () => {
    setDoctorForm({
      name: '',
      departmentId: 'dept-gen-med',
      specialization: 'Internal Medicine',
      qualification: 'MBBS, MD',
      experience: 8,
      roomNumber: 'Ophthalmology-104',
      licenseNumber: `MCI-${Math.floor(10000 + Math.random() * 90000)}-D`,
      availableToday: true
    });
    setDoctorModal({ open: true, mode: 'add', data: null });
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core payload for doctor creation
    const usernameClean = doctorForm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const doctorPayload = {
      name: doctorForm.name,
      email: `${usernameClean}@militaryhospital.gov.in`,
      phone: '+918888888888',
      departmentId: doctorForm.departmentId,
      specialization: doctorForm.specialization,
      qualification: doctorForm.qualification,
      experience: Number(doctorForm.experience),
      roomNumber: doctorForm.roomNumber,
      licenseNumber: doctorForm.licenseNumber,
      availableToday: doctorForm.availableToday
    };

    let saveSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(doctorPayload)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          const d = result.data;
          const normalized = {
            doctorId: d.doctorId,
            userId: d.userId,
            departmentId: d.departmentId,
            specialization: d.specialization,
            qualification: d.qualification,
            experience: d.experience,
            availableToday: d.availableToday,
            roomNumber: d.roomNumber,
            licenseNumber: d.licenseNumber
          };
          DOCTOR_NAMES[d.doctorId] = d.user?.username || doctorForm.name;
          setDoctors([...doctors, normalized]);
          saveSuccess = true;
          console.log('Backend Doctor registered successfully.');
        } else {
          console.warn('API save doctor returned an error. Using local mock fallback.');
        }
      } catch (err) {
        console.warn('Backend API save doctor failed. Using local mock fallback.', err);
      }
    }

    if (!saveSuccess) {
      const newDocId = `doc-${doctors.length + 1}`;
      const newDoctor: Doctor = {
        doctorId: newDocId,
        userId: `user-doc-${doctors.length + 1}`,
        departmentId: doctorForm.departmentId,
        specialization: doctorForm.specialization,
        qualification: doctorForm.qualification,
        experience: Number(doctorForm.experience),
        availableToday: doctorForm.availableToday,
        roomNumber: doctorForm.roomNumber,
        licenseNumber: doctorForm.licenseNumber
      };
      DOCTOR_NAMES[newDocId] = doctorForm.name;
      setDoctors([...doctors, newDoctor]);
    }

    setDoctorModal({ open: false, mode: 'add', data: null });
  };

  const toggleDoctorAvailability = async (id: string) => {
    const targetDoc = doctors.find(d => d.doctorId === id);
    if (!targetDoc) return;

    let toggleSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            availableToday: !targetDoc.availableToday
          })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          const d = result.data;
          const normalized = {
            doctorId: d.doctorId,
            userId: d.userId,
            departmentId: d.departmentId,
            specialization: d.specialization,
            qualification: d.qualification,
            experience: d.experience,
            availableToday: d.availableToday,
            roomNumber: d.roomNumber,
            licenseNumber: d.licenseNumber
          };
          setDoctors(doctors.map(item => item.doctorId === id ? normalized : item));
          toggleSuccess = true;
          console.log('Backend Doctor availability toggled successfully.');
        } else {
          console.warn('API toggle doctor availability returned an error. Using local mock.');
        }
      } catch (err) {
        console.warn('Backend API toggle doctor availability failed. Using local mock.', err);
      }
    }

    if (!toggleSuccess) {
      setDoctors(doctors.map(d => d.doctorId === id ? { ...d, availableToday: !d.availableToday } : d));
    }
  };


  // Queue and Appointment Handling (With Priority Queue Logic)
  const sortedQueue = useMemo(() => {
    const priorityWeight: Record<PriorityLevel, number> = {
      EMERGENCY: 100,
      SENIOR_CITIZEN: 90,
      PREGNANT: 85,
      DISABLED: 80,
      CHILD: 70,
      NORMAL: 50
    };

    return [...appointments]
      .filter(a => a.status === 'WAITING' || a.status === 'IN_CONSULTATION')
      .sort((a, b) => {
        // Active consultation always stays at top
        if (a.status === 'IN_CONSULTATION' && b.status !== 'IN_CONSULTATION') return -1;
        if (b.status === 'IN_CONSULTATION' && a.status !== 'IN_CONSULTATION') return 1;
        
        // Then sort by priority weight
        const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (diff !== 0) return diff;
        
        // FIFO fallback (token number ascending)
        return a.tokenNumber - b.tokenNumber;
      });
  }, [appointments]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPat = patients.find(p => p.patientId === appointmentForm.patientId);
    if (!selectedPat) return;

    const selectedDoc = doctors.find(d => d.doctorId === appointmentForm.doctorId);
    if (!selectedDoc) return;

    const bookingPayload = {
      patientId: appointmentForm.patientId,
      doctorId: appointmentForm.doctorId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      priority: appointmentForm.priority
    };

    let bookingSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bookingPayload)
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setAppointments([...appointments, result.data]);
          bookingSuccess = true;
          console.log('Appointment booked on backend successfully.');
        } else {
          console.warn('API booking returned an error. Using local mock fallback.');
        }
      } catch (err) {
        console.warn('Backend API booking failed. Using local mock fallback.', err);
      }
    }

    if (!bookingSuccess) {
      const tokenNum = 100 + appointments.length + 1;
      const waitingCount = appointments.filter(a => a.status === 'WAITING' && a.doctorId === selectedDoc.doctorId).length;
      const estWait = (waitingCount + (appointments.some(a => a.status === 'IN_CONSULTATION' && a.doctorId === selectedDoc.doctorId) ? 1 : 0)) * 12;

      const newAppt: Appointment = {
        appointmentId: `appt-${appointments.length + 1}`,
        patientId: appointmentForm.patientId,
        doctorId: appointmentForm.doctorId,
        departmentId: selectedDoc.departmentId,
        date: bookingPayload.date,
        time: bookingPayload.time,
        status: 'WAITING',
        priority: appointmentForm.priority,
        tokenNumber: tokenNum,
        estimatedTime: estWait,
        createdBy: 'admin-portal'
      };
      setAppointments([...appointments, newAppt]);
    }

    setAppointmentModal(false);
  };

  const handleCallNext = async () => {
    const currentInConsult = appointments.find(a => a.status === 'IN_CONSULTATION');
    const nextInQueue = sortedQueue.find(a => a.status === 'WAITING');

    let apiSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const promises = [];
        if (currentInConsult) {
          promises.push(
            fetch(`${API_BASE_URL}/api/v1/appointments/${currentInConsult.appointmentId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'COMPLETED' })
            }).then(r => r.json())
          );
        }
        if (nextInQueue) {
          promises.push(
            fetch(`${API_BASE_URL}/api/v1/appointments/${nextInQueue.appointmentId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'IN_CONSULTATION' })
            }).then(r => r.json())
          );
        }

        const results = await Promise.all(promises);
        const allOk = results.every(res => res.status === 'success');

        if (allOk) {
          const updatedMap = appointments.map(appt => {
            if (currentInConsult && appt.appointmentId === currentInConsult.appointmentId) {
              return { ...appt, status: 'COMPLETED' as AppointmentStatus };
            }
            if (nextInQueue && appt.appointmentId === nextInQueue.appointmentId) {
              return { ...appt, status: 'IN_CONSULTATION' as AppointmentStatus };
            }
            return appt;
          });
          setAppointments(updatedMap);
          apiSuccess = true;
          console.log('Backend queue state advanced successfully.');
        } else {
          console.warn('API call next returned an error. Using local mock fallback.');
        }
      } catch (err) {
        console.warn('Backend API call next failed. Using local mock fallback.', err);
      }
    }

    if (!apiSuccess) {
      const updated = appointments.map(appt => {
        if (appt.status === 'IN_CONSULTATION') {
          return { ...appt, status: 'COMPLETED' as AppointmentStatus };
        }
        return appt;
      });

      if (nextInQueue) {
        const finalized = updated.map(appt => {
          if (appt.appointmentId === nextInQueue.appointmentId) {
            return { ...appt, status: 'IN_CONSULTATION' as AppointmentStatus };
          }
          return appt;
        });
        setAppointments(finalized);
      } else {
        setAppointments(updated);
        alert("All active appointments have been cleared!");
      }
    }
  };

  // Simulating rapid triage or emergency walk-in
  const simulateEmergencyWalkIn = () => {
    // Generate a random patient
    const randPat = patients[Math.floor(Math.random() * patients.length)];
    const randDoc = doctors.find(d => d.availableToday) || doctors[0];
    const token = 900 + Math.floor(Math.random() * 100);

    const emergencyAppt: Appointment = {
      appointmentId: `appt-emergency-${Date.now()}`,
      patientId: randPat.patientId,
      doctorId: randDoc.doctorId,
      departmentId: randDoc.departmentId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'WAITING',
      priority: 'EMERGENCY',
      tokenNumber: token,
      estimatedTime: 0,
      createdBy: 'emergency-sos'
    };

    // Alert system
    setAppointments(prev => [...prev, emergencyAppt]);
    setActiveTab('queue');
  };

  // Pharmacy Inventory Stock Adjustment
  const handleOpenEditStock = (item: InventoryItem) => {
    setStockEditValue(item.currentStock);
    setInventoryModal({ open: true, data: item });
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryModal.data) return;

    let updateSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${inventoryModal.data.medicineId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentStock: Number(stockEditValue)
          })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          const d = result.data;
          setInventory(inventory.map(item => item.medicineId === d.medicineId ? d : item));
          updateSuccess = true;
          console.log('Stock level updated on backend successfully.');
        } else {
          console.warn('API update stock returned an error. Using local mock fallback.');
        }
      } catch (err) {
        console.warn('Backend API update stock failed. Using local mock fallback.', err);
      }
    }

    if (!updateSuccess) {
      setInventory(inventory.map(item => {
        if (item.medicineId === inventoryModal.data?.medicineId) {
          return { ...item, currentStock: Number(stockEditValue) };
        }
        return item;
      }));
    }

    setInventoryModal({ open: false, data: null });
  };

  const handleApproveReferral = async (id: string) => {
    let updateSuccess = false;

    if (isAuthenticated && token && !token.startsWith('mock-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/referrals/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'APPROVED',
            approvalOfficer: 'Col. Dr. Suresh K. (Director Command Hospital)'
          })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          const d = result.data;
          setReferrals(referrals.map(ref => ref.referralId === id ? d : ref));
          updateSuccess = true;
          console.log('Referral approved on backend successfully.');
        } else {
          console.warn('API update referral returned an error. Using local mock fallback.');
        }
      } catch (err) {
        console.warn('Backend API update referral failed. Using local mock fallback.', err);
      }
    }

    if (!updateSuccess) {
      setReferrals(referrals.map(ref => {
        if (ref.referralId === id) {
          return { 
            ...ref, 
            status: 'APPROVED', 
            approvalOfficer: 'Col. Dr. Suresh K. (Director Command Hospital)' 
          };
        }
        return ref;
      }));
    }
  };

  // ==========================================
// RENDER HELPERS & STATS
// ==========================================

  // Dashboard Stats Calculations (Milestone 12)
  const stats = useMemo(() => {
    if (liveStats) {
      return liveStats;
    }

    const waiting = appointments.filter(a => a.status === 'WAITING').length;
    const inConsult = appointments.filter(a => a.status === 'IN_CONSULTATION').length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const lowStock = inventory.filter(i => i.currentStock <= i.reorderLevel).length;
    const pendingReferrals = referrals.filter(r => r.status === 'PENDING').length;
    const activeDocs = doctors.filter(d => d.availableToday).length;

    return {
      waiting,
      inConsult,
      completed,
      lowStock,
      pendingReferrals,
      activeDocs
    };
  }, [liveStats, appointments, inventory, referrals, doctors]);

  // Filtering
  const filteredPatients = patients.filter(p => {
    const searchLower = patientSearch.toLowerCase();
    return (
      p.defenceId.toLowerCase().includes(searchLower) ||
      p.unit.toLowerCase().includes(searchLower) ||
      p.rank.toLowerCase().includes(searchLower)
    );
  });

  const filteredDoctors = doctors.filter(d => {
    const searchLower = doctorSearch.toLowerCase();
    const name = DOCTOR_NAMES[d.doctorId] || '';
    return (
      name.toLowerCase().includes(searchLower) ||
      d.specialization.toLowerCase().includes(searchLower) ||
      d.roomNumber.toLowerCase().includes(searchLower)
    );
  });

  const filteredInventory = inventory.filter(item => {
    const searchLower = pharmacySearch.toLowerCase();
    return (
      item.genericName.toLowerCase().includes(searchLower) ||
      item.brandName.toLowerCase().includes(searchLower) ||
      item.batchNumber.toLowerCase().includes(searchLower)
    );
  });

  // ── Command Palette State ─────────────────────────────────────────────
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState('');
  const [sidebarExpanded, setSidebarExpanded] = React.useState(true);
  const commandInputRef = React.useRef<HTMLInputElement>(null);

  // Command palette keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        setCommandQuery('');
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
        setCommandQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  React.useEffect(() => {
    if (commandPaletteOpen && commandInputRef.current) {
      setTimeout(() => commandInputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Helper utilities
  const priorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'priority-emergency badge';
      case 'SENIOR_CITIZEN': return 'priority-senior badge';
      case 'PREGNANT': return 'priority-pregnant badge';
      case 'DISABLED': return 'priority-disabled badge';
      case 'CHILD': return 'priority-child badge';
      default: return 'priority-normal badge';
    }
  };

  const bedStatusColor = (status: string) => {
    if (status === 'OCCUPIED') return 'bed-occupied bed-tile';
    if (status === 'MAINTENANCE') return 'bed-maintenance bed-tile';
    return 'bed-vacant bed-tile';
  };

  const stockPercent = (item: any) => {
    const max = Math.max(item.reorderLevel * 2, item.currentStock, 1);
    return Math.min(100, Math.round((item.currentStock / max) * 100));
  };

  const stockClass = (item: any) => {
    if (item.currentStock < (item.minimumStock || 0)) return 'stock-bar-critical';
    if (item.currentStock <= item.reorderLevel) return 'stock-bar-low';
    return 'stock-bar-ok';
  };

  // Mission Readiness Score
  const readinessScore = React.useMemo(() => {
    let score = 100;
    const totalBeds = bedsSummary?.totalBeds || 450;
    const occupiedBeds = (bedsSummary?.generalOccupied || 0) + (bedsSummary?.icuOccupied || 0);
    const occupancyPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
    if (occupancyPct > 90) score -= 20;
    else if (occupancyPct > 75) score -= 10;
    const icuTotal = bedsSummary?.icuTotal || 50;
    const icuOccupied = bedsSummary?.icuOccupied || 0;
    const icuAvailPct = icuTotal > 0 ? ((icuTotal - icuOccupied) / icuTotal) * 100 : 100;
    if (icuAvailPct < 20) score -= 20;
    else if (icuAvailPct < 40) score -= 10;
    if (stats.lowStock > 5) score -= 20;
    else if (stats.lowStock > 2) score -= 10;
    else if (stats.lowStock > 0) score -= 5;
    if (!wsConnected) score -= 5;
    return Math.max(0, score);
  }, [bedsSummary, stats, wsConnected]);

  const readinessColor = readinessScore >= 80 ? 'var(--success)' : readinessScore >= 60 ? 'var(--warning)' : 'var(--critical)';
  const readinessLabel = readinessScore >= 80 ? 'OPERATIONAL' : readinessScore >= 60 ? 'CAUTION' : 'CRITICAL';

  // Nav items definition
  const navItems = [
    { id: 'dashboard', label: 'Command Dashboard', icon: Activity, badge: null, roles: null },
    { id: 'patients', label: 'Patient Registry', icon: Users, badge: null, roles: null },
    { id: 'doctors', label: 'Medical Officers', icon: UserCheck, badge: null, roles: null },
    { id: 'queue', label: 'OPD Queue Control', icon: Calendar, badge: stats.waiting > 0 ? stats.waiting : null, badgeType: 'warning', roles: null },
    { id: 'pharmacy', label: 'Pharmacy Intel', icon: Package, badge: stats.lowStock > 0 ? stats.lowStock : null, badgeType: 'critical', roles: null },
    { id: 'referrals', label: 'Referral Board', icon: FileSymlink, badge: stats.pendingReferrals > 0 ? stats.pendingReferrals : null, badgeType: 'info', roles: null },
    { id: 'lab-reports', label: 'Diagnostics Lab', icon: FlaskConical, badge: labSummary?.byStatus?.find((s: any) => s.status === 'PENDING')?.count || null, badgeType: 'warning', roles: ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'LAB_TECHNICIAN'] },
    { id: 'beds', label: 'Bed Telemetry', icon: Bed, badge: null, roles: ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'] },
    { id: 'ai-triage', label: 'AI Triage', icon: Activity, badge: null, roles: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'users', label: 'User Accounts', icon: Users2, badge: null, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList, badge: null, roles: ['ADMIN', 'SUPER_ADMIN'] },
  ] as const;

  const visibleNavItems = navItems.filter(item =>
    !item.roles || item.roles.includes(userRole as any)
  );

  // Command palette filtered results
  const paletteResults = React.useMemo(() => {
    const q = commandQuery.toLowerCase().trim();
    if (!q) return {
      actions: [
        { label: 'Register New Patient', action: () => { handleOpenAddPatient(); setCommandPaletteOpen(false); }, icon: UserPlus },
        { label: 'Book OPD Appointment', action: () => { setAppointmentModal(true); setCommandPaletteOpen(false); }, icon: Calendar },
        { label: 'Call Next Patient', action: () => { handleCallNext(); setCommandPaletteOpen(false); }, icon: ChevronRight },
        { label: 'Trigger Emergency SOS', action: () => { simulateEmergencyWalkIn(); setCommandPaletteOpen(false); }, icon: AlertTriangle },
      ],
      nav: visibleNavItems.map(n => ({ ...n, action: () => { setActiveTab(n.id as any); setCommandPaletteOpen(false); } })),
      patients: [],
    };
    return {
      actions: [
        { label: 'Register New Patient', action: () => { handleOpenAddPatient(); setCommandPaletteOpen(false); }, icon: UserPlus },
        { label: 'Book OPD Appointment', action: () => { setAppointmentModal(true); setCommandPaletteOpen(false); }, icon: Calendar },
        { label: 'Call Next Patient', action: () => { handleCallNext(); setCommandPaletteOpen(false); }, icon: ChevronRight },
        { label: 'Trigger Emergency SOS', action: () => { simulateEmergencyWalkIn(); setCommandPaletteOpen(false); }, icon: AlertTriangle },
      ].filter(a => a.label.toLowerCase().includes(q)),
      nav: visibleNavItems
        .filter(n => n.label.toLowerCase().includes(q))
        .map(n => ({ ...n, action: () => { setActiveTab(n.id as any); setCommandPaletteOpen(false); } })),
      patients: patients.filter(p =>
        p.defenceId.toLowerCase().includes(q) ||
        p.rank.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [commandQuery, patients, visibleNavItems, stats]);



  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const currentDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════
          COMMAND PALETTE OVERLAY
          ══════════════════════════════════════════════════════════════════ */}
      {commandPaletteOpen && (
        <div className="palette-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="palette-panel" onClick={e => e.stopPropagation()} style={{ maxHeight: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Search style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={commandInputRef}
                className="palette-input"
                placeholder="Search patients, commands, navigation..."
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
                style={{ padding: '0', border: 'none', borderBottom: 'none', fontSize: 14 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>ESC</span>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {paletteResults.actions.length > 0 && (
                <>
                  <div className="palette-section-label">QUICK ACTIONS</div>
                  {paletteResults.actions.map((item, i) => (
                    <div key={i} className="palette-item" onClick={item.action}>
                      <item.icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                      {item.label}
                      <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 5px', color: 'var(--text-disabled)' }}>↵</span>
                    </div>
                  ))}
                </>
              )}

              {paletteResults.patients.length > 0 && (
                <>
                  <div className="palette-section-label">PATIENTS</div>
                  {paletteResults.patients.map(p => (
                    <div key={p.patientId} className="palette-item" onClick={() => { setActiveTab('patients'); setCommandPaletteOpen(false); }}>
                      <Users style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{p.rank} · {p.defenceId}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.unit} · {p.bloodGroup}</div>
                      </div>
                      <ChevronRight style={{ marginLeft: 'auto', width: 12, height: 12, color: 'var(--text-disabled)' }} />
                    </div>
                  ))}
                </>
              )}

              {paletteResults.nav.length > 0 && (
                <>
                  <div className="palette-section-label">NAVIGATION</div>
                  {paletteResults.nav.map((item, i) => (
                    <div key={i} className="palette-item" onClick={item.action}>
                      <item.icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                      {item.label}
                      <ChevronRight style={{ marginLeft: 'auto', width: 12, height: 12, color: 'var(--text-disabled)' }} />
                    </div>
                  ))}
                </>
              )}

              {paletteResults.actions.length === 0 && paletteResults.nav.length === 0 && paletteResults.patients.length === 0 && commandQuery && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: 13 }}>
                  No results for "{commandQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          COMMAND RAIL — SIDEBAR NAVIGATION
          ══════════════════════════════════════════════════════════════════ */}
      <aside style={{
        width: sidebarExpanded ? 240 : 64,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        zIndex: 10,
      }}>
        {/* Brand Header */}
        <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} />
          </div>
          {sidebarExpanded && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>MHSHMS</div>
              <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Defence Medical</div>
            </div>
          )}
          <button
            onClick={() => setSidebarExpanded(p => !p)}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', flexShrink: 0, display: 'flex' }}
            title={sidebarExpanded ? 'Collapse' : 'Expand'}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronRight style={{ width: 14, height: 14, transform: sidebarExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px' }}>
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                style={{ width: '100%', marginBottom: 2, justifyContent: sidebarExpanded ? 'flex-start' : 'center', padding: sidebarExpanded ? '9px 12px' : '9px 0', position: 'relative' }}
                title={!sidebarExpanded ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {sidebarExpanded && (
                  <>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9999,
                        background: item.badgeType === 'critical' ? 'var(--critical-bg)' : item.badgeType === 'warning' ? 'var(--warning-bg)' : 'var(--info-bg)',
                        color: item.badgeType === 'critical' ? 'var(--critical)' : item.badgeType === 'warning' ? 'var(--warning)' : 'var(--info)',
                        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid',
                        borderColor: item.badgeType === 'critical' ? 'rgba(255,93,93,0.3)' : item.badgeType === 'warning' ? 'rgba(245,180,0,0.3)' : 'rgba(90,169,255,0.3)'
                      }}>{item.badge}</span>
                    )}
                  </>
                )}
                {!sidebarExpanded && item.badge && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: item.badgeType === 'critical' ? 'var(--critical)' : item.badgeType === 'warning' ? 'var(--warning)' : 'var(--info)', border: '1px solid var(--bg-secondary)' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
          {sidebarExpanded && (
            <div style={{ marginBottom: 8 }}>
              <label className="label" style={{ paddingLeft: 4 }}>Acting Role</label>
              <select
                value={userRole}
                onChange={e => setUserRole(e.target.value as UserRole)}
                style={{ width: '100%', fontSize: 12, padding: '6px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-secondary)' }}
                aria-label="Acting Role"
              >
                <option value="ADMIN">Hospital Admin</option>
                <option value="DOCTOR">Doctor</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="REFERRAL_OFFICER">Referral Officer</option>
                <option value="LAB_TECHNICIAN">Lab Technician</option>
              </select>
            </div>
          )}
          <button
            onClick={simulateEmergencyWalkIn}
            style={{
              width: '100%', background: 'var(--critical-bg)', border: '1px solid var(--border-critical)',
              color: 'var(--critical)', borderRadius: 8, padding: sidebarExpanded ? '8px 12px' : '8px 0',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
              animation: 'pulse-emergency 3s ease-in-out infinite'
            }}
            aria-label="Trigger Emergency SOS"
          >
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
            {sidebarExpanded && 'EMERGENCY SOS'}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN WORKSPACE
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP COMMAND BAR */}
        <header style={{
          height: 56, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0, zIndex: 10
        }}>
          {/* Left: Hospital identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: readinessColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>MH JAIPUR HQ</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, letterSpacing: '0.07em', textTransform: 'uppercase',
              background: readinessScore >= 80 ? 'var(--success-bg)' : readinessScore >= 60 ? 'var(--warning-bg)' : 'var(--critical-bg)',
              color: readinessScore >= 80 ? 'var(--success)' : readinessScore >= 60 ? 'var(--warning)' : 'var(--critical)',
              border: `1px solid ${readinessScore >= 80 ? 'rgba(22,199,132,0.25)' : readinessScore >= 60 ? 'rgba(245,180,0,0.25)' : 'rgba(255,93,93,0.3)'}`,
            }}>
              {readinessLabel} · {readinessScore}/100
            </span>
          </div>

          {/* Centre: Command palette trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              flex: 1, maxWidth: 360, height: 32, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
              cursor: 'pointer', color: 'var(--text-disabled)', fontSize: 12, transition: 'all 150ms ease'
            }}
            aria-label="Open command palette (Ctrl+K)"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
          >
            <Search style={{ width: 13, height: 13 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search, navigate, take action...</span>
            <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', fontFamily: 'monospace' }}>⌘K</span>
          </button>

          {/* Right: Status + Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            {/* Critical alerts */}
            {stats.lowStock > 0 && (
              <button
                onClick={() => setActiveTab('pharmacy')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--critical-bg)', border: '1px solid var(--border-critical)', borderRadius: 9999, padding: '4px 10px', cursor: 'pointer', animation: 'pulse-emergency 2.5s ease-in-out infinite' }}
              >
                <AlertTriangle style={{ width: 12, height: 12, color: 'var(--critical)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--critical)' }}>{stats.lowStock} CRITICAL</span>
              </button>
            )}

            {/* WS Status */}
            <div className={`sync-badge ${wsConnected ? 'sync-connected' : 'sync-disconnected'}`} title={wsTicker}>
              <span className={`status-dot ${wsConnected ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </div>

            {/* Time */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{currentTime}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{currentDate}</div>
            </div>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notifPanelRef}>
              <button
                onClick={() => setNotifPanelOpen(prev => !prev)}
                className="btn-icon"
                style={{ position: 'relative' }}
                aria-label="Notifications"
              >
                {unreadCount > 0 ? <Bell style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} /> : <BellOff style={{ width: 16, height: 16 }} />}
                {unreadCount > 0 && (
                  <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* Notification Panel */}
              {notifPanelOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, width: 360, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 12, zIndex: 30, overflow: 'hidden',
                  animation: 'scale-in 150ms ease', boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notification Centre</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <BellOff style={{ width: 32, height: 32, color: 'var(--text-disabled)', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notifications</p>
                        <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>System is monitoring in real-time</p>
                      </div>
                    ) : notifications.map(notif => (
                      <div key={notif.notificationId} style={{
                        display: 'flex', gap: 12, padding: '12px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: notif.status === 'UNREAD' ? 'rgba(0,200,255,0.04)' : 'transparent',
                        transition: 'background 120ms'
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: notif.status === 'UNREAD' ? 'var(--accent-primary)' : 'var(--text-disabled)', flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: notif.status === 'UNREAD' ? 600 : 400, color: 'var(--text-primary)', marginBottom: 2 }}>{notif.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{notif.message}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 4 }}>
                            {new Date(notif.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                        <button onClick={() => handleDismissNotification(notif.notificationId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 2, flexShrink: 0 }}>
                          <X style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser?.username || 'User'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentUser?.role}</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>
                {(currentUser?.username || 'U').substring(0, 2).toUpperCase()}
              </div>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} aria-label="Sign out">
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* MODULE CONTENT AREA */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }} role="main">

          {/* ══════════════════════════════════════════════════════════════
              MODULE: COMMAND DASHBOARD
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-up 200ms ease' }}>

              {/* Mission Readiness Header */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Shield style={{ width: 20, height: 20, color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Mission Readiness Index</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: readinessColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{readinessScore}</span>
                    <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 300 }}>/100</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: readinessColor, background: readinessScore >= 80 ? 'var(--success-bg)' : readinessScore >= 60 ? 'var(--warning-bg)' : 'var(--critical-bg)', padding: '2px 8px', borderRadius: 9999 }}>{readinessLabel}</span>
                  </div>
                  <div className="readiness-bar" style={{ marginTop: 12, maxWidth: 400 }}>
                    <div className="readiness-fill" style={{ width: `${readinessScore}%`, background: readinessScore >= 80 ? 'var(--success)' : readinessScore >= 60 ? 'var(--warning)' : 'var(--critical)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`status-dot ${wsConnected ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
                    {wsConnected ? 'API Live' : 'API Offline'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="status-dot status-dot-success status-dot-pulse" />
                    Database OK
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="status-dot" style={{ background: stats.lowStock === 0 ? 'var(--success)' : 'var(--critical)' }} />
                    {stats.lowStock === 0 ? 'Stock Adequate' : `${stats.lowStock} Critical SKUs`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="status-dot status-dot-success" />
                    Auth System OK
                  </div>
                </div>
              </div>

              {/* Operations Status Row — 6 metric tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {[
                  { label: 'Queue Waiting', value: stats.waiting, sub: 'OPD patients', color: stats.waiting > 10 ? 'var(--warning)' : 'var(--text-primary)', tab: 'queue' },
                  { label: 'In Consultation', value: stats.inConsult, sub: 'Active now', color: 'var(--success)', tab: 'queue' },
                  { label: 'Completed Today', value: stats.completed, sub: 'Cleared', color: 'var(--text-primary)', tab: 'queue' },
                  { label: 'Officers On Duty', value: stats.activeDocs, sub: `of ${doctors.length} total`, color: 'var(--accent-primary)', tab: 'doctors' },
                  { label: 'Critical Stock', value: stats.lowStock, sub: 'Items below level', color: stats.lowStock > 0 ? 'var(--critical)' : 'var(--success)', tab: 'pharmacy' },
                  { label: 'Pending Referrals', value: stats.pendingReferrals, sub: 'Awaiting approval', color: stats.pendingReferrals > 0 ? 'var(--warning)' : 'var(--text-primary)', tab: 'referrals' },
                ].map((tile, i) => (
                  <div key={i} className="metric-tile stagger-item" onClick={() => setActiveTab(tile.tab as any)} style={{ cursor: 'pointer' }}>
                    <span className="metric-tile-label">{tile.label}</span>
                    <span className="metric-tile-value" style={{ color: tile.color }}>{tile.value}</span>
                    <span className="metric-tile-sub">{tile.sub}</span>
                  </div>
                ))}
              </div>

              {/* Intelligence Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

                {/* Live OPD Queue */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="section-header">
                    <div>
                      <div className="section-title">Live OPD Queue</div>
                      <div className="section-sub">Priority-sorted real-time patient queue</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleCallNext} className="btn btn-primary btn-sm" aria-label="Call next patient">
                        <Check style={{ width: 13, height: 13 }} /> Call Next
                      </button>
                      <button onClick={() => setActiveTab('queue')} className="btn btn-secondary btn-sm">
                        Full Board
                      </button>
                    </div>
                  </div>
                  {sortedQueue.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <CheckCircle style={{ width: 36, height: 36, color: 'var(--success)', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Queue Clear</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All patients attended · Queue is operational</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Defence ID</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedQueue.slice(0, 8).map((appt) => {
                          const pat = patients.find(p => p.patientId === appt.patientId);
                          return (
                            <tr key={appt.appointmentId} style={appt.priority === 'EMERGENCY' ? { borderLeft: '3px solid var(--critical)', background: 'rgba(255,93,93,0.03)' } : appt.priority === 'SENIOR_CITIZEN' ? { borderLeft: '3px solid var(--warning)' } : {}}>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>#{appt.tokenNumber}</span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{pat?.defenceId || appt.patientId}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pat?.rank}</div>
                              </td>
                              <td>
                                <span className={priorityBadgeStyle(appt.priority)}>{appt.priority.replace('_', ' ')}</span>
                              </td>
                              <td>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: appt.status === 'IN_CONSULTATION' ? 'var(--success)' : 'var(--warning)' }}>
                                  <span className={`status-dot ${appt.status === 'IN_CONSULTATION' ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
                                  {appt.status === 'IN_CONSULTATION' ? 'In Consult' : 'Waiting'}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{DEPT_NAMES[appt.departmentId]}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Right Panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Critical Alerts */}
                  <div className="card">
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle style={{ width: 13, height: 13, color: 'var(--critical)' }} /> Critical Alerts
                    </div>
                    {stats.lowStock === 0 && stats.pendingReferrals === 0 ? (
                      <div style={{ padding: '12px 0', textAlign: 'center' }}>
                        <CheckCircle style={{ width: 28, height: 28, color: 'var(--success)', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>All Systems Normal</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stats.lowStock > 0 && (
                          <div style={{ background: 'var(--critical-bg)', border: '1px solid var(--border-critical)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
                            <AlertTriangle style={{ width: 14, height: 14, color: 'var(--critical)', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--critical)' }}>{stats.lowStock} Critical Stock Items</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Restock required immediately</div>
                            </div>
                          </div>
                        )}
                        {stats.pendingReferrals > 0 && (
                          <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,180,0,0.25)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
                            <Clock style={{ width: 14, height: 14, color: 'var(--warning)', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>{stats.pendingReferrals} Referrals Pending</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Awaiting approval</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="card">
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => { setAppointmentForm({ patientId: patients[0]?.patientId || '', doctorId: doctors[0]?.doctorId || '', priority: 'NORMAL' }); setAppointmentModal(true); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 8 }}>
                        <Calendar style={{ width: 13, height: 13 }} /> Book OPD Appointment
                      </button>
                      <button onClick={handleOpenAddPatient} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 8 }}>
                        <UserPlus style={{ width: 13, height: 13 }} /> Register New Patient
                      </button>
                      <button onClick={() => setActiveTab('pharmacy')} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 8 }}>
                        <Package style={{ width: 13, height: 13 }} /> View Pharmacy Intel
                      </button>
                      <button onClick={() => setActiveTab('beds')} className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: 8 }}>
                        <Bed style={{ width: 13, height: 13 }} /> Bed Telemetry Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Analytics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Department Distribution */}
                <div className="card">
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <div>
                      <div className="section-title" style={{ fontSize: 14 }}>Department Utilisation</div>
                      <div className="section-sub">Appointment distribution by specialty</div>
                    </div>
                  </div>
                  {Object.entries(DEPT_NAMES).map(([id, name]) => {
                    const count = appointments.filter(a => a.departmentId === id).length;
                    const total = Math.max(appointments.length, 1);
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={id} className="analytics-bar">
                        <span className="analytics-bar-label">{name}</span>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent-primary)' }} />
                        </div>
                        <span className="analytics-bar-value">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Operations Timeline */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <div>
                      <div className="section-title" style={{ fontSize: 14 }}>Operations Timeline</div>
                      <div className="section-sub">Recent system activity</div>
                    </div>
                  </div>
                  {[
                    { time: '14:32', user: currentUser?.username || 'admin', action: 'Dashboard accessed', entity: 'SYSTEM' },
                    { time: '14:10', user: 'pharmacist01', action: 'Stock inventory reviewed', entity: 'PHARMACY' },
                    { time: '13:47', user: 'doctor', action: 'Consultation completed', entity: 'QUEUE' },
                    { time: '13:22', user: 'admin', action: 'Referral approved', entity: 'REFERRAL' },
                    { time: '12:55', user: 'labtech01', action: 'Lab report updated', entity: 'LAB' },
                    { time: '12:30', user: 'admin', action: 'Patient file registered', entity: 'PATIENT' },
                  ].map((row, i) => (
                    <div key={i} className="ops-timeline-row">
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-disabled)', flexShrink: 0, width: 36 }}>{row.time}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', flexShrink: 0, width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.user}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{row.action}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-disabled)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{row.entity}</span>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('audit')} style={{ marginTop: 12, width: '100%', fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', fontWeight: 500 }}>
                    View Full Audit Log →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: PATIENT REGISTRY
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'patients' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Patient Registry</h1>
                  <p className="section-sub">Military medical personnel and dependents — {patients.length} registered</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleOpenAddPatient} className="btn btn-primary" aria-label="Register new patient">
                    <UserPlus style={{ width: 14, height: 14 }} /> Register Patient
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by Defence ID, rank, unit..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 36, height: 36 }}
                    aria-label="Search patients"
                  />
                </div>
              </div>

              {/* Patient Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filteredPatients.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <Users style={{ width: 48, height: 48, color: 'var(--text-disabled)', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No Patients Found</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{patientSearch ? `No records match "${patientSearch}"` : 'Register the first patient to get started'}</p>
                    <button onClick={handleOpenAddPatient} className="btn btn-primary" style={{ marginTop: 16 }}>
                      <UserPlus style={{ width: 14, height: 14 }} /> Register Patient
                    </button>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Defence ID</th>
                        <th>Rank & Unit</th>
                        <th>Blood Group</th>
                        <th>Category</th>
                        <th>Allergies</th>
                        <th>Hospital</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((pat, i) => (
                        <tr key={pat.patientId} className="stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{pat.defenceId}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pat.gender} · {pat.dob}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{pat.rank}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pat.unit}</div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'var(--critical-bg)', color: 'var(--critical)', border: '1px solid var(--border-critical)' }}>{pat.bloodGroup}</span>
                          </td>
                          <td>
                            <span className={`badge ${pat.retired ? 'badge-muted' : 'badge-success'}`}>
                              {pat.dependentType === 'SELF' ? (pat.retired ? 'Retired' : 'Active Service') : pat.dependentType}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: pat.allergies.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {pat.allergies.length > 0 ? `⚠ ${pat.allergies.join(', ')}` : '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pat.currentHospital}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setSelectedHistoryPatient(pat); fetchPatientHistory(pat.patientId); setHistoryModalOpen(true); }}
                                className="btn-icon" title="View Medical History" aria-label="View medical history"
                                style={{ color: 'var(--accent-primary)' }}
                              >
                                <History style={{ width: 14, height: 14 }} />
                              </button>
                              <button onClick={() => handleOpenEditPatient(pat)} className="btn-icon" title="Edit Patient" aria-label="Edit patient">
                                <Edit3 style={{ width: 14, height: 14 }} />
                              </button>
                              <button onClick={() => handleDeletePatient(pat.patientId)} className="btn-icon" title="Delete Patient" aria-label="Delete patient" style={{ color: 'var(--critical)' }}>
                                <Trash2 style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: MEDICAL OFFICERS
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'doctors' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Medical Officers</h1>
                  <p className="section-sub">{stats.activeDocs} of {doctors.length} specialists on duty today</p>
                </div>
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <button onClick={handleOpenAddDoctor} className="btn btn-primary">
                    <Plus style={{ width: 14, height: 14 }} /> Add Officer
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                  <input type="text" placeholder="Search by name, specialization, room..." value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} style={{ paddingLeft: 36, maxWidth: 400, height: 36 }} aria-label="Search doctors" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {filteredDoctors.length === 0 ? (
                  <div className="card" style={{ gridColumn: '1/-1', padding: '60px 20px', textAlign: 'center' }}>
                    <UserCheck style={{ width: 48, height: 48, color: 'var(--text-disabled)', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No Officers Found</p>
                  </div>
                ) : filteredDoctors.map((doc, i) => {
                  const name = DOCTOR_NAMES[doc.doctorId] || 'Medical Officer';
                  const deptAppts = appointments.filter(a => a.doctorId === doc.doctorId && a.status !== 'COMPLETED').length;
                  return (
                    <div key={doc.doctorId} className="doctor-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: doc.availableToday ? 'var(--success-bg)' : 'var(--bg-elevated)', border: `1px solid ${doc.availableToday ? 'rgba(22,199,132,0.25)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: doc.availableToday ? 'var(--success)' : 'var(--text-muted)' }}>
                          {name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.specialization}</div>
                        </div>
                        <span className={`badge ${doc.availableToday ? 'badge-success' : 'badge-muted'}`}>
                          {doc.availableToday ? '● Available' : '○ Unavailable'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ color: 'var(--text-disabled)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Queue</div>
                          <div style={{ fontWeight: 700, color: deptAppts > 5 ? 'var(--warning)' : 'var(--text-primary)' }}>{deptAppts} patients</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ color: 'var(--text-disabled)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Room</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-primary)' }}>{doc.roomNumber}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        {doc.qualification} · {doc.experience}y exp · Lic: {doc.licenseNumber}
                      </div>

                      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                          <button onClick={() => { setDoctorForm({ name, departmentId: doc.departmentId, specialization: doc.specialization, qualification: doc.qualification, experience: doc.experience, roomNumber: doc.roomNumber, licenseNumber: doc.licenseNumber, availableToday: doc.availableToday }); setDoctorModal({ open: true, mode: 'edit', data: doc }); }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                            <Edit3 style={{ width: 12, height: 12 }} /> Edit
                          </button>
                          <button onClick={() => handleDeleteDoctor(doc.doctorId)} className="btn btn-danger btn-sm" aria-label="Delete doctor">
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: OPD QUEUE CONTROL
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'queue' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>OPD Queue Control</h1>
                  <p className="section-sub">Live priority queue · {stats.waiting} waiting · {stats.inConsult} in consultation</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCallNext} className="btn btn-primary">
                    <Check style={{ width: 14, height: 14 }} /> Call Next Patient
                  </button>
                  <button onClick={() => { setAppointmentForm({ patientId: patients[0]?.patientId || '', doctorId: doctors[0]?.doctorId || '', priority: 'NORMAL' }); setAppointmentModal(true); }} className="btn btn-secondary">
                    <Plus style={{ width: 14, height: 14 }} /> Book Appointment
                  </button>
                </div>
              </div>

              {/* Queue Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Waiting', value: stats.waiting, color: 'var(--warning)' },
                  { label: 'In Consultation', value: stats.inConsult, color: 'var(--success)' },
                  { label: 'Completed', value: stats.completed, color: 'var(--text-muted)' },
                  { label: 'Emergency', value: appointments.filter(a => a.priority === 'EMERGENCY' && a.status !== 'COMPLETED').length, color: 'var(--critical)' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Queue Board */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Token</th>
                      <th>Patient</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Doctor</th>
                      <th>Est. Wait</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.filter(a => a.status !== 'COMPLETED').length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                          <CheckCircle style={{ width: 40, height: 40, color: 'var(--success)', margin: '0 auto 12px' }} />
                          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Queue is clear</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All patients have been attended</p>
                        </td>
                      </tr>
                    ) : appointments.filter(a => a.status !== 'COMPLETED').sort((a, b) => {
                      const p: Record<string, number> = { EMERGENCY: 0, PREGNANT: 1, SENIOR_CITIZEN: 2, DISABLED: 3, CHILD: 4, NORMAL: 5 };
                      return (p[a.priority] ?? 5) - (p[b.priority] ?? 5);
                    }).map(appt => {
                      const pat = patients.find(p => p.patientId === appt.patientId);
                      const doc = doctors.find(d => d.doctorId === appt.doctorId);
                      return (
                        <tr key={appt.appointmentId}
                          className={appt.priority === 'EMERGENCY' ? 'queue-row-emergency' : appt.priority === 'SENIOR_CITIZEN' ? 'queue-row-senior' : ''}
                          style={{ border: 'none' }}
                        >
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', fontSize: 14 }}>#{appt.tokenNumber}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{pat?.defenceId || appt.patientId}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pat?.rank} · {pat?.unit}</div>
                          </td>
                          <td><span className={priorityBadgeStyle(appt.priority)}>{appt.priority.replace('_', ' ')}</span></td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: appt.status === 'IN_CONSULTATION' ? 'var(--success)' : 'var(--warning)' }}>
                              <span className={`status-dot ${appt.status === 'IN_CONSULTATION' ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
                              {appt.status === 'IN_CONSULTATION' ? 'In Consultation' : 'Waiting'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>{DEPT_NAMES[appt.departmentId]}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{DOCTOR_NAMES[appt.doctorId] || 'TBD'}</td>
                          <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{appt.estimatedTime} min</td>
                          <td>
                            <button onClick={handleCallNext} className="btn btn-ghost btn-sm" aria-label="Call next">
                              <ChevronRight style={{ width: 13, height: 13 }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: PHARMACY INTELLIGENCE
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'pharmacy' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Pharmacy Intelligence</h1>
                  <p className="section-sub">Inventory health · {inventory.length} SKUs · {stats.lowStock} critical</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleExportPharmacyCSV} className="btn btn-secondary btn-sm">
                    <Download style={{ width: 13, height: 13 }} /> CSV
                  </button>
                  <button onClick={handleExportPharmacyXLSX} className="btn btn-secondary btn-sm">
                    <FileSpreadsheet style={{ width: 13, height: 13 }} /> Excel
                  </button>
                </div>
              </div>

              {/* Stock health overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total SKUs', value: inventory.length, color: 'var(--text-primary)' },
                  { label: 'Critical / Low Stock', value: inventory.filter(i => i.currentStock <= i.reorderLevel).length, color: inventory.some(i => i.currentStock <= i.reorderLevel) ? 'var(--critical)' : 'var(--success)' },
                  { label: 'Adequate Stock', value: inventory.filter(i => i.currentStock > i.reorderLevel).length, color: 'var(--success)' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search medicine, brand, batch..." value={pharmacySearch} onChange={e => setPharmacySearch(e.target.value)} style={{ paddingLeft: 36, height: 36, width: '100%' }} aria-label="Search pharmacy inventory" />
              </div>

              {/* Inventory Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredInventory.sort((a, b) => {
                  const aLow = a.currentStock <= a.reorderLevel;
                  const bLow = b.currentStock <= b.reorderLevel;
                  if (aLow && !bLow) return -1;
                  if (!aLow && bLow) return 1;
                  return 0;
                }).map((item, i) => {
                  const isCritical = item.currentStock < (item.minimumStock || 0);
                  const isLow = item.currentStock <= item.reorderLevel;
                  const pct = stockPercent(item);
                  const statusClass = stockClass(item);
                  return (
                    <div key={item.medicineId} className="card stagger-item" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, borderLeft: isCritical ? '3px solid var(--critical)' : isLow ? '3px solid var(--warning)' : '3px solid transparent', animationDelay: `${i * 20}ms` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.brandName}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({item.genericName})</span>
                          {isCritical && <span className="badge badge-critical">CRITICAL</span>}
                          {!isCritical && isLow && <span className="badge badge-warning">LOW STOCK</span>}
                          {!isLow && <span className="badge badge-success">ADEQUATE</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {item.manufacturer} · {item.strength} {item.unit} · Batch: {item.batchNumber} · Exp: {item.expiryDate}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={`stock-bar ${statusClass}`} style={{ flex: 1 }}>
                            <div className="stock-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isCritical ? 'var(--critical)' : isLow ? 'var(--warning)' : 'var(--success)', flexShrink: 0 }}>{item.currentStock} / {item.reorderLevel} min</span>
                        </div>
                      </div>
                      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'PHARMACIST') && (
                        <button onClick={() => handleOpenEditStock(item)} className="btn btn-secondary btn-sm" aria-label="Update stock">
                          <Edit3 style={{ width: 12, height: 12 }} /> Adjust Stock
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: REFERRAL COMMAND BOARD (KANBAN)
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'referrals' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Referral Command Board</h1>
                  <p className="section-sub">Enterprise Kanban workflow · {referrals.length} total referrals</p>
                </div>
              </div>

              {/* Kanban Board */}
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                {(['PENDING', 'REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map(status => {
                  const statusRefs = referrals.filter(r => r.status === status);
                  const statusColors: Record<string, string> = {
                    PENDING: 'var(--warning)', REVIEW: 'var(--info)',
                    APPROVED: 'var(--success)', REJECTED: 'var(--critical)', COMPLETED: 'var(--text-muted)'
                  };
                  return (
                    <div key={status} className="kanban-col" style={{ minWidth: 220, flex: '0 0 220px' }}>
                      <div className="kanban-col-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="status-dot" style={{ background: statusColors[status] }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{status}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 9999, padding: '2px 7px' }}>{statusRefs.length}</span>
                      </div>
                      <div style={{ padding: '4px 0', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                        {statusRefs.length === 0 ? (
                          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)' }}>
                            No {status.toLowerCase()} referrals
                          </div>
                        ) : statusRefs.map(ref => (
                          <div key={ref.referralId} className="kanban-card">
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 6 }}>{ref.trackingNumber}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{ref.referredHospital}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{ref.reason}</div>
                            {status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'REFERRAL_OFFICER') && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => handleApproveReferral(ref.referralId)} className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: '4px 8px', flex: 1 }} aria-label="Approve referral">
                                  Approve
                                </button>
                                <button onClick={() => handleRejectReferral(ref.referralId)} className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '4px 8px', flex: 1 }} aria-label="Reject referral">
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: DIAGNOSTICS LAB
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'lab-reports' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Diagnostics Laboratory</h1>
                  <p className="section-sub">Lab report lifecycle tracker · {labReports.length} reports</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setLabNewModal(true)} className="btn btn-primary">
                    <Plus style={{ width: 14, height: 14 }} /> New Report
                  </button>
                </div>
              </div>

              {/* Status summary tabs */}
              {labSummary && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[{ label: 'All', value: '' }, ...(labSummary.byStatus || []).map((s: any) => ({ label: `${s.status} (${s.count})`, value: s.status }))].map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => { setLabFilterStatus(tab.value); fetchLabReports(tab.value); }}
                      className={`btn btn-sm ${labFilterStatus === tab.value ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 11 }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {labLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
                </div>
              ) : labReports.length === 0 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <FlaskConical style={{ width: 48, height: 48, color: 'var(--text-disabled)', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No Lab Reports</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Create a new diagnostic report to get started</p>
                  <button onClick={() => setLabNewModal(true)} className="btn btn-primary" style={{ marginTop: 16 }}>
                    <Plus style={{ width: 13, height: 13 }} /> Create Report
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {labReports.map((report: any, i: number) => {
                    const statusColors: Record<string, string> = { PENDING: 'var(--warning)', IN_PROGRESS: 'var(--info)', COMPLETED: 'var(--success)', CANCELLED: 'var(--text-disabled)' };
                    const statusBadge: Record<string, string> = { PENDING: 'badge-warning', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-success', CANCELLED: 'badge-muted' };
                    return (
                      <div key={report.testId} className="card stagger-item" style={{ padding: '16px 20px', borderLeft: `3px solid ${statusColors[report.status] || 'var(--border)'}`, animationDelay: `${i * 25}ms` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{report.testName}</span>
                              <span className={`badge ${statusBadge[report.status] || ''}`}>{report.status.replace('_', ' ')}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                              Patient: <span style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{report.patientDefenceId || 'N/A'}</span> · {report.patientRank} · Doctor: {report.doctorUsername}
                            </div>
                            {report.result && (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600 }}>Result: </span>{report.result}
                              </div>
                            )}
                            {report.performedBy && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Performed by: {report.performedBy}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => { setLabModal({ open: true, report }); setLabUpdateForm({ status: report.status, result: report.result || '', performedBy: report.performedBy || '' }); }} className="btn btn-secondary btn-sm" aria-label="Update lab report">
                              <Edit3 style={{ width: 12, height: 12 }} /> Update
                            </button>
                            <button onClick={() => downloadLabReportPDF(report.testId)} className="btn btn-secondary btn-sm" aria-label="Download PDF">
                              <Download style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: BED TELEMETRY
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'beds' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Bed Telemetry Map</h1>
                  <p className="section-sub">Interactive ward occupancy · {(bedsSummary?.generalOccupied || 0) + (bedsSummary?.icuOccupied || 0)} occupied of {bedsSummary?.totalBeds || 450} total</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={downloadTelemetryPDF} className="btn btn-secondary btn-sm">
                    <Download style={{ width: 13, height: 13 }} /> Telemetry PDF
                  </button>
                </div>
              </div>

              {/* Bed Summary Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Beds', value: bedsSummary?.totalBeds || 450, color: 'var(--text-primary)' },
                  { label: 'Occupied', value: (bedsSummary?.generalOccupied || 0) + (bedsSummary?.icuOccupied || 0), color: 'var(--critical)' },
                  { label: 'ICU Occupied', value: bedsSummary?.icuOccupied || 0, color: 'var(--warning)' },
                  { label: 'Under Maintenance', value: bedsSummary?.maintenanceTotal || 0, color: 'var(--info)' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Floor Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {[1, 2, 3].map(floor => (
                  <button
                    key={floor}
                    onClick={() => setActiveFloor(floor)}
                    className={`btn btn-sm ${activeFloor === floor ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Floor {floor} {floor === 1 ? '— General' : floor === 2 ? '— ICU' : '— Recovery'}
                  </button>
                ))}
              </div>

              {bedsLoading ? (
                <div className="card"><div className="skeleton" style={{ height: 200, borderRadius: 8 }} /></div>
              ) : (
                <div className="card">
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
                    {[{ color: 'var(--critical)', label: 'Occupied' }, { color: 'var(--success)', label: 'Vacant' }, { color: 'var(--warning)', label: 'Maintenance' }].map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                        <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {beds.filter((b: any) => b.floor === activeFloor).map((bed: any) => (
                      <div
                        key={bed.bedId}
                        className={bedStatusColor(bed.status)}
                        onClick={() => { setSelectedBed(bed); setBedModalOpen(true); setBedFormPatient(''); setBedFormRank('Major'); }}
                        title={`${bed.bedId} — ${bed.status}${bed.patientDefenceId ? ` — ${bed.patientRank} ${bed.patientDefenceId}` : ''}`}
                        role="button"
                        aria-label={`Bed ${bed.bedId}: ${bed.status}`}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}>{bed.bedId.split('-').pop()}</span>
                        <span style={{ fontSize: 8 }}>
                          {bed.status === 'OCCUPIED' ? '●' : bed.status === 'MAINTENANCE' ? '⚙' : '○'}
                        </span>
                      </div>
                    ))}
                    {beds.filter((b: any) => b.floor === activeFloor).length === 0 && (
                      <div style={{ padding: '40px 20px', textAlign: 'center', width: '100%', color: 'var(--text-disabled)', fontSize: 13 }}>
                        No beds on this floor in the current data
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: AI TRIAGE
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'ai-triage' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>AI Symptom Triage</h1>
                  <p className="section-sub">Clinical decision support · AI-powered department routing</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Triage Form */}
                <div className="card">
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Patient Symptom Input</h2>
                  <form onSubmit={handleRunTriage}>
                    <div className="input-group">
                      <label className="label">Symptoms Description</label>
                      <textarea
                        value={triageSymptoms}
                        onChange={e => setTriageSymptoms(e.target.value)}
                        placeholder="e.g., chest pain, shortness of breath, fatigue since 2 days..."
                        rows={4}
                        required
                        style={{ width: '100%', resize: 'vertical' }}
                        aria-label="Describe symptoms"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="input-group">
                        <label className="label">Patient Age</label>
                        <input type="number" min={1} max={120} value={triageAge} onChange={e => setTriageAge(Number(e.target.value))} aria-label="Patient age" />
                      </div>
                      <div className="input-group">
                        <label className="label">Gender</label>
                        <select value={triageGender} onChange={e => setTriageGender(e.target.value)} aria-label="Patient gender">
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" disabled={triageLoading} className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
                      {triageLoading ? 'Running AI Analysis...' : 'Run AI Triage →'}
                    </button>
                    {triageError && <p style={{ color: 'var(--critical)', fontSize: 12, marginTop: 8 }}>{triageError}</p>}
                  </form>
                </div>

                {/* Triage Result */}
                <div>
                  {triageResult ? (
                    <div className="card" style={{ borderLeft: `3px solid ${triageResult.urgency === 'EMERGENCY' ? 'var(--critical)' : triageResult.urgency === 'HIGH' ? 'var(--warning)' : 'var(--success)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <CheckCircle style={{ width: 18, height: 18, color: 'var(--success)' }} />
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Triage Result</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px' }}>
                          <div className="label">Department</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)' }}>{triageResult.department}</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px' }}>
                          <div className="label">Urgency</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: triageResult.urgency === 'EMERGENCY' ? 'var(--critical)' : triageResult.urgency === 'HIGH' ? 'var(--warning)' : 'var(--success)' }}>{triageResult.urgency}</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px' }}>
                          <div className="label">Confidence</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((triageResult.confidence || 0) * 100)}%</div>
                        </div>
                      </div>
                      {triageResult.explanation && (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px', marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {triageResult.explanation}
                        </div>
                      )}
                      {triageDoctors.length > 0 && (
                        <div>
                          <div className="label" style={{ marginBottom: 8 }}>Recommended Officers</div>
                          {triageDoctors.map((doc: any, i: number) => (
                            <div key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.doctorName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.reason}</div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>{Math.round((doc.matchScore || 0) * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <Activity style={{ width: 48, height: 48, color: 'var(--text-disabled)', margin: '0 auto 16px' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>AI Triage Standby</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Submit symptoms for AI-powered clinical routing</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: HOSPITAL ANALYTICS
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Operational Analytics</h1>
                  <p className="section-sub">Hospital intelligence — operational efficiency overview</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Queue Analytics */}
                <div className="card">
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Queue Analytics</h2>
                  {[
                    { label: 'Total Appointments', value: appointments.length, max: appointments.length, color: 'var(--accent-primary)' },
                    { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, max: appointments.length, color: 'var(--success)' },
                    { label: 'Waiting', value: appointments.filter(a => a.status === 'WAITING').length, max: appointments.length, color: 'var(--warning)' },
                    { label: 'In Consultation', value: appointments.filter(a => a.status === 'IN_CONSULTATION').length, max: appointments.length, color: 'var(--info)' },
                    { label: 'Emergency Cases', value: appointments.filter(a => a.priority === 'EMERGENCY').length, max: appointments.length, color: 'var(--critical)' },
                  ].map((item, i) => (
                    <div key={i} className="analytics-bar">
                      <span className="analytics-bar-label">{item.label}</span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar-fill" style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`, background: item.color }} />
                      </div>
                      <span className="analytics-bar-value" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Inventory Analytics */}
                <div className="card">
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Pharmacy Intelligence</h2>
                  {[
                    { label: 'Total SKUs', value: inventory.length, max: inventory.length, color: 'var(--accent-primary)' },
                    { label: 'Adequate Stock', value: inventory.filter(i => i.currentStock > i.reorderLevel).length, max: inventory.length, color: 'var(--success)' },
                    { label: 'Low Stock', value: inventory.filter(i => i.currentStock <= i.reorderLevel && i.currentStock > 0).length, max: inventory.length, color: 'var(--warning)' },
                    { label: 'Critical Stock', value: inventory.filter(i => i.currentStock < (i.minimumStock || 0)).length, max: inventory.length, color: 'var(--critical)' },
                  ].map((item, i) => (
                    <div key={i} className="analytics-bar">
                      <span className="analytics-bar-label">{item.label}</span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar-fill" style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`, background: item.color }} />
                      </div>
                      <span className="analytics-bar-value" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Referral Pipeline */}
                <div className="card">
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Referral Pipeline</h2>
                  {(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map((s, i) => {
                    const count = referrals.filter(r => r.status === s).length;
                    const colors: Record<string, string> = { PENDING: 'var(--warning)', APPROVED: 'var(--success)', REJECTED: 'var(--critical)', COMPLETED: 'var(--text-muted)' };
                    return (
                      <div key={i} className="analytics-bar">
                        <span className="analytics-bar-label">{s}</span>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${referrals.length > 0 ? (count / referrals.length) * 100 : 0}%`, background: colors[s] }} />
                        </div>
                        <span className="analytics-bar-value" style={{ color: colors[s] }}>{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Doctor Stats */}
                <div className="card">
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Medical Officers</h2>
                  {[
                    { label: 'Total Officers', value: doctors.length, max: doctors.length, color: 'var(--accent-primary)' },
                    { label: 'On Duty Today', value: doctors.filter(d => d.availableToday).length, max: doctors.length, color: 'var(--success)' },
                    { label: 'Unavailable', value: doctors.filter(d => !d.availableToday).length, max: doctors.length, color: 'var(--warning)' },
                    { label: 'Total Patients', value: patients.length, max: Math.max(patients.length, 1), color: 'var(--info)' },
                  ].map((item, i) => (
                    <div key={i} className="analytics-bar">
                      <span className="analytics-bar-label">{item.label}</span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar-fill" style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`, background: item.color }} />
                      </div>
                      <span className="analytics-bar-value" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: USER MANAGEMENT
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>User Accounts</h1>
                  <p className="section-sub">System access management · {users.length} accounts</p>
                </div>
                <button onClick={() => setUserNewModal(true)} className="btn btn-primary">
                  <Plus style={{ width: 14, height: 14 }} /> Create Account
                </button>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={usersFilterRole} onChange={e => { setUsersFilterRole(e.target.value); fetchUsers(e.target.value, usersFilterStatus); }} style={{ height: 36, fontSize: 12 }} aria-label="Filter by role">
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="LAB_TECHNICIAN">Lab Technician</option>
                  <option value="REFERRAL_OFFICER">Referral Officer</option>
                  <option value="PATIENT">Patient</option>
                </select>
                <select value={usersFilterStatus} onChange={e => { setUsersFilterStatus(e.target.value); fetchUsers(usersFilterRole, e.target.value); }} style={{ height: 36, fontSize: 12 }} aria-label="Filter by status">
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {usersLoading ? (
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Contact</th>
                        <th>Service No.</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any, i: number) => (
                        <tr key={u.id} className="stagger-item" style={{ animationDelay: `${i * 25}ms` }}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                          </td>
                          <td><span className="badge badge-info" style={{ fontSize: 10 }}>{u.role}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.phone}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-primary)' }}>{u.serviceNumber || '—'}</td>
                          <td>
                            <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : u.status === 'SUSPENDED' ? 'badge-critical' : 'badge-muted'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td>
                            <button onClick={() => { setUserStatusModal({ open: true, user: u }); setUserStatusForm({ status: u.status, reason: '' }); }} className="btn btn-ghost btn-sm" aria-label="Change user status">
                              <KeyRound style={{ width: 13, height: 13 }} /> Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MODULE: AUDIT LOG
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <div style={{ animation: 'slide-up 200ms ease' }}>
              <div className="section-header">
                <div>
                  <h1 className="section-title" style={{ fontSize: 20 }}>Audit Event Log</h1>
                  <p className="section-sub">Immutable system audit trail · {auditTotal} total events</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleExportAuditCSV} className="btn btn-secondary btn-sm">
                    <Download style={{ width: 13, height: 13 }} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Audit Summary */}
              {auditSummary && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {auditSummary.byAction?.map((a: any) => (
                    <span key={a.action} className="badge badge-info">{a.action}: {a.count}</span>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={auditFilterEntity} onChange={e => { setAuditFilterEntity(e.target.value); fetchAuditLogs(1, e.target.value, auditFilterAction, auditFilterUser); }} style={{ height: 36, fontSize: 12 }} aria-label="Filter by entity">
                  <option value="">All Entities</option>
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="APPOINTMENT">Appointment</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="USER">User</option>
                </select>
                <select value={auditFilterAction} onChange={e => { setAuditFilterAction(e.target.value); fetchAuditLogs(1, auditFilterEntity, e.target.value, auditFilterUser); }} style={{ height: 36, fontSize: 12 }} aria-label="Filter by action">
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="LOGIN">Login</option>
                  <option value="APPROVE">Approve</option>
                </select>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {auditLoading ? (
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Entity ID</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any, i: number) => (
                        <tr key={log.auditId} className="stagger-item" style={{ animationDelay: `${i * 20}ms` }}>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{log.username || '—'}</td>
                          <td><span className="badge badge-info" style={{ fontSize: 10 }}>{log.role || '—'}</span></td>
                          <td>
                            <span className={`badge ${log.action === 'DELETE' ? 'badge-critical' : log.action === 'CREATE' ? 'badge-success' : log.action === 'LOGIN' ? 'badge-info' : 'badge-muted'}`}>{log.action}</span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.entity}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{log.entityId}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{log.ipAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {auditTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="btn btn-secondary btn-sm">Prev</button>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '0 8px' }}>Page {auditPage} of {auditTotalPages}</span>
                    <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages} className="btn btn-secondary btn-sm">Next</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════════════════════════ */}

      {/* Patient History Modal */}
      {historyModalOpen && selectedHistoryPatient && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
          <div className="modal-panel" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h2 id="history-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Medical History</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedHistoryPatient.rank} · {selectedHistoryPatient.defenceId} · {selectedHistoryPatient.bloodGroup}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleExportPatientHistoryPDF(selectedHistoryPatient.patientId, selectedHistoryPatient.defenceId)} className="btn btn-secondary btn-sm">
                  <Download style={{ width: 12, height: 12 }} /> PDF
                </button>
                <button onClick={() => handleExportPatientHistoryCSV(selectedHistoryPatient.patientId, selectedHistoryPatient.defenceId)} className="btn btn-secondary btn-sm">
                  <Download style={{ width: 12, height: 12 }} /> CSV
                </button>
                <button onClick={() => setHistoryModalOpen(false)} className="btn-icon" aria-label="Close">
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
            <div className="modal-body">
              {fetchingHistory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 10 }} />)}
                </div>
              ) : patientHistoryLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <FileText style={{ width: 40, height: 40, color: 'var(--text-disabled)', margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No visit history found</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {patientHistoryLogs.map((cons: any, i: number) => (
                    <div key={cons.consultationId} className="timeline-item">
                      <div className="timeline-dot">
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-primary)' }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{cons.doctor?.department?.departmentName}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{cons.doctor?.user?.username}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cons.appointment?.date ? new Date(cons.appointment.date).toLocaleDateString('en-IN') : '—'}</span>
                        </div>
                        {cons.diagnosis && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{cons.diagnosis}</p>}
                        {cons.notes && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{cons.notes}</p>}
                        {cons.prescription?.items?.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            💊 {cons.prescription.items.map((rx: any) => `${rx.medicine?.brandName} ${rx.dosage}`).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Add/Edit Modal */}
      {patientModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="patient-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {patientModal.mode === 'add' ? 'Register New Patient' : 'Edit Patient Record'}
              </h2>
              <button onClick={() => setPatientModal({ open: false, mode: 'add', data: null })} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSavePatient}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="input-group">
                  <label className="label">Defence ID</label>
                  <input value={patientForm.defenceId} onChange={e => setPatientForm({ ...patientForm, defenceId: e.target.value })} placeholder="DEF-90812-M" required aria-label="Defence ID" />
                </div>
                <div className="input-group">
                  <label className="label">Rank</label>
                  <input value={patientForm.rank} onChange={e => setPatientForm({ ...patientForm, rank: e.target.value })} placeholder="Major" required aria-label="Rank" />
                </div>
                <div className="input-group">
                  <label className="label">Unit</label>
                  <input value={patientForm.unit} onChange={e => setPatientForm({ ...patientForm, unit: e.target.value })} placeholder="6 Infantry Division" required aria-label="Unit" />
                </div>
                <div className="input-group">
                  <label className="label">Date of Birth</label>
                  <input type="date" value={patientForm.dob} onChange={e => setPatientForm({ ...patientForm, dob: e.target.value })} required aria-label="Date of birth" />
                </div>
                <div className="input-group">
                  <label className="label">Gender</label>
                  <select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value as any })} aria-label="Gender">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Blood Group</label>
                  <select value={patientForm.bloodGroup} onChange={e => setPatientForm({ ...patientForm, bloodGroup: e.target.value as any })} aria-label="Blood group">
                    {(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Category</label>
                  <select value={patientForm.dependentType} onChange={e => setPatientForm({ ...patientForm, dependentType: e.target.value as any })} aria-label="Category">
                    <option value="SELF">Self (Service Person)</option>
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Allergies (comma-separated)</label>
                  <input value={patientForm.allergies} onChange={e => setPatientForm({ ...patientForm, allergies: e.target.value })} placeholder="Penicillin, NSAIDs..." aria-label="Allergies" />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Address</label>
                  <input value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} placeholder="Army Cantonment, Jaipur" aria-label="Address" />
                </div>
                <div className="input-group">
                  <label className="label">Emergency Contact Name</label>
                  <input value={patientForm.emergencyName} onChange={e => setPatientForm({ ...patientForm, emergencyName: e.target.value })} placeholder="Name" aria-label="Emergency contact name" />
                </div>
                <div className="input-group">
                  <label className="label">Emergency Phone</label>
                  <input value={patientForm.emergencyPhone} onChange={e => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })} placeholder="+91..." aria-label="Emergency phone" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setPatientModal({ open: false, mode: 'add', data: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{patientModal.mode === 'add' ? 'Register Patient' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Add/Edit Modal */}
      {doctorModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="doctor-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="doctor-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {doctorModal.mode === 'add' ? 'Add Medical Officer' : 'Edit Officer Record'}
              </h2>
              <button onClick={() => setDoctorModal({ open: false, mode: 'add', data: null })} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSaveDoctor}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="input-group" style={{ gridColumn: '1/-1' }}>
                  <label className="label">Full Name & Rank</label>
                  <input value={doctorForm.name} onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })} placeholder="Col. Dr. Rajesh Sharma" required aria-label="Doctor name" />
                </div>
                <div className="input-group">
                  <label className="label">Department</label>
                  <select value={doctorForm.departmentId} onChange={e => setDoctorForm({ ...doctorForm, departmentId: e.target.value })} aria-label="Department">
                    {Object.entries(DEPT_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Specialization</label>
                  <input value={doctorForm.specialization} onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })} placeholder="Cardiology" required aria-label="Specialization" />
                </div>
                <div className="input-group">
                  <label className="label">Qualification</label>
                  <input value={doctorForm.qualification} onChange={e => setDoctorForm({ ...doctorForm, qualification: e.target.value })} placeholder="MBBS, MD" required aria-label="Qualification" />
                </div>
                <div className="input-group">
                  <label className="label">Experience (years)</label>
                  <input type="number" value={doctorForm.experience} onChange={e => setDoctorForm({ ...doctorForm, experience: Number(e.target.value) })} min={0} aria-label="Experience in years" />
                </div>
                <div className="input-group">
                  <label className="label">Room Number</label>
                  <input value={doctorForm.roomNumber} onChange={e => setDoctorForm({ ...doctorForm, roomNumber: e.target.value })} placeholder="Cardiology-201" aria-label="Room number" />
                </div>
                <div className="input-group">
                  <label className="label">License Number</label>
                  <input value={doctorForm.licenseNumber} onChange={e => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })} placeholder="MCI-XXXXX-D" aria-label="License number" />
                </div>
                <div className="input-group" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="availableToday" checked={doctorForm.availableToday} onChange={e => setDoctorForm({ ...doctorForm, availableToday: e.target.checked })} style={{ width: 16, height: 16 }} />
                  <label htmlFor="availableToday" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>Available for duty today</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setDoctorModal({ open: false, mode: 'add', data: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{doctorModal.mode === 'add' ? 'Add Officer' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {appointmentModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="appointment-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Book OPD Appointment</h2>
              <button onClick={() => setAppointmentModal(false)} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSaveAppointment}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="label">Select Patient</label>
                  <select value={appointmentForm.patientId} onChange={e => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })} required aria-label="Select patient">
                    <option value="">-- Select Patient --</option>
                    {patients.map(p => <option key={p.patientId} value={p.patientId}>{p.rank} · {p.defenceId}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Assign Doctor</label>
                  <select value={appointmentForm.doctorId} onChange={e => setAppointmentForm({ ...appointmentForm, doctorId: e.target.value })} required aria-label="Assign doctor">
                    {doctors.filter(d => d.availableToday).map(d => <option key={d.doctorId} value={d.doctorId}>{DOCTOR_NAMES[d.doctorId] || d.doctorId} — {d.specialization}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Priority Level</label>
                  <select value={appointmentForm.priority} onChange={e => setAppointmentForm({ ...appointmentForm, priority: e.target.value as PriorityLevel })} aria-label="Priority level">
                    <option value="NORMAL">Normal</option>
                    <option value="SENIOR_CITIZEN">Senior Citizen</option>
                    <option value="PREGNANT">Pregnant</option>
                    <option value="CHILD">Child</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setAppointmentModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Book Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab Report Update Modal */}
      {labModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="lab-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Update Lab Report</h2>
              <button onClick={() => setLabModal({ open: false, report: null })} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleUpdateLabReport}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{labModal.report?.testName}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Patient: {labModal.report?.patientDefenceId} · {labModal.report?.patientRank}</p>
                </div>
                <div className="input-group">
                  <label className="label">Status</label>
                  <select value={labUpdateForm.status} onChange={e => setLabUpdateForm({ ...labUpdateForm, status: e.target.value })} aria-label="Lab report status">
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Performed By</label>
                  <input value={labUpdateForm.performedBy} onChange={e => setLabUpdateForm({ ...labUpdateForm, performedBy: e.target.value })} placeholder="Lab Technician name" aria-label="Performed by" />
                </div>
                <div className="input-group">
                  <label className="label">Result / Findings</label>
                  <textarea value={labUpdateForm.result} onChange={e => setLabUpdateForm({ ...labUpdateForm, result: e.target.value })} placeholder="Enter clinical findings, values, notes..." rows={3} style={{ width: '100%' }} aria-label="Lab result" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setLabModal({ open: false, report: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Update Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lab Report Modal */}
      {labNewModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lab-new-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="lab-new-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Lab Report</h2>
              <button onClick={() => setLabNewModal(false)} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleCreateLabReport}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="label">Test Name</label>
                  <input value={labNewForm.testName} onChange={e => setLabNewForm({ ...labNewForm, testName: e.target.value })} placeholder="e.g., Complete Blood Count (CBC)" required aria-label="Test name" />
                </div>
                <div className="input-group">
                  <label className="label">Performed By (optional)</label>
                  <input value={labNewForm.performedBy} onChange={e => setLabNewForm({ ...labNewForm, performedBy: e.target.value })} placeholder="Lab Technician name" aria-label="Performed by" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setLabNewModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Detail Modal */}
      {bedModalOpen && selectedBed && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bed-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <div>
                <h2 id="bed-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Bed Operations</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{selectedBed.bedId} · {selectedBed.ward} · Floor {selectedBed.floor}</p>
              </div>
              <button onClick={() => setBedModalOpen(false)} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className={`badge ${selectedBed.status === 'OCCUPIED' ? 'badge-critical' : selectedBed.status === 'MAINTENANCE' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: 12 }}>
                  {selectedBed.status}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedBed.type} bed · {selectedBed.ward}</span>
              </div>

              {selectedBed.status === 'OCCUPIED' && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {selectedBed.patientRank} · {selectedBed.patientDefenceId}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Admitted: {selectedBed.admittedAt ? new Date(selectedBed.admittedAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
              )}

              {selectedBed.status === 'VACANT' && (
                <form onSubmit={handleAllocateBed}>
                  <div className="input-group">
                    <label className="label">Patient Defence ID</label>
                    <input value={bedFormPatient} onChange={e => setBedFormPatient(e.target.value)} placeholder="DEF-XXXXX-M" required aria-label="Patient defence ID" />
                  </div>
                  <div className="input-group">
                    <label className="label">Patient Rank</label>
                    <input value={bedFormRank} onChange={e => setBedFormRank(e.target.value)} placeholder="Major" required aria-label="Patient rank" />
                  </div>
                  <div className="modal-footer" style={{ padding: '0', borderTop: 'none', marginTop: 8 }}>
                    <button type="button" onClick={() => setBedModalOpen(false)} className="btn btn-ghost">Cancel</button>
                    <button type="submit" className="btn btn-primary">Allocate Bed</button>
                  </div>
                </form>
              )}

              {selectedBed.status === 'OCCUPIED' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleReleaseBed(selectedBed.bedId)} className="btn btn-secondary" style={{ flex: 1 }}>Release Bed</button>
                  <button onClick={() => handleToggleMaintenance(selectedBed.bedId, selectedBed.status)} className="btn btn-danger" style={{ flex: 1 }}>Set Maintenance</button>
                </div>
              )}

              {selectedBed.status === 'MAINTENANCE' && (
                <button onClick={() => handleToggleMaintenance(selectedBed.bedId, selectedBed.status)} className="btn btn-secondary" style={{ width: '100%' }}>
                  Clear Maintenance / Mark Vacant
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Status Modal */}
      {userStatusModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-status-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="user-status-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Change Account Status</h2>
              <button onClick={() => setUserStatusModal({ open: false, user: null })} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleUpdateUserStatus}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{userStatusModal.user?.username}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{userStatusModal.user?.role} · {userStatusModal.user?.email}</p>
                </div>
                <div className="input-group">
                  <label className="label">New Status</label>
                  <select value={userStatusForm.status} onChange={e => setUserStatusForm({ ...userStatusForm, status: e.target.value })} aria-label="New status">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Reason (optional)</label>
                  <input value={userStatusForm.reason} onChange={e => setUserStatusForm({ ...userStatusForm, reason: e.target.value })} placeholder="Reason for status change..." aria-label="Reason" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setUserStatusModal({ open: false, user: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {userNewModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-new-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="user-new-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Staff Account</h2>
              <button onClick={() => setUserNewModal(false)} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleCreateStaffUser}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="input-group">
                  <label className="label">Username</label>
                  <input value={userNewForm.username} onChange={e => setUserNewForm({ ...userNewForm, username: e.target.value })} placeholder="dr.sharma" required aria-label="Username" />
                </div>
                <div className="input-group">
                  <label className="label">Password</label>
                  <input type="password" value={userNewForm.password} onChange={e => setUserNewForm({ ...userNewForm, password: e.target.value })} required aria-label="Password" />
                </div>
                <div className="input-group">
                  <label className="label">Role</label>
                  <select value={userNewForm.role} onChange={e => setUserNewForm({ ...userNewForm, role: e.target.value })} aria-label="Role">
                    <option value="ADMIN">Admin</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="REFERRAL_OFFICER">Referral Officer</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Service Number</label>
                  <input value={userNewForm.serviceNumber} onChange={e => setUserNewForm({ ...userNewForm, serviceNumber: e.target.value })} placeholder="SM-XXXXX" aria-label="Service number" />
                </div>
                <div className="input-group">
                  <label className="label">Email</label>
                  <input type="email" value={userNewForm.email} onChange={e => setUserNewForm({ ...userNewForm, email: e.target.value })} placeholder="officer@mil.gov.in" aria-label="Email" />
                </div>
                <div className="input-group">
                  <label className="label">Phone</label>
                  <input value={userNewForm.phone} onChange={e => setUserNewForm({ ...userNewForm, phone: e.target.value })} placeholder="+91..." aria-label="Phone" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setUserNewModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Edit Modal */}
      {inventoryModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="stock-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Adjust Stock Level</h2>
              <button onClick={() => setInventoryModal({ open: false, data: null })} className="btn-icon" aria-label="Close"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={handleSaveStock}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{inventoryModal.data?.brandName}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{inventoryModal.data?.genericName} · {inventoryModal.data?.strength} {inventoryModal.data?.unit}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Batch: {inventoryModal.data?.batchNumber} · Current: <strong style={{ color: 'var(--accent-primary)' }}>{inventoryModal.data?.currentStock}</strong> units</p>
                </div>
                <div className="input-group">
                  <label className="label">New Stock Count</label>
                  <input type="number" required min={0} value={stockEditValue} onChange={e => setStockEditValue(Number(e.target.value))} aria-label="New stock count" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setInventoryModal({ open: false, data: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Update Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
