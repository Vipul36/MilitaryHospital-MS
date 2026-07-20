import PDFDocument from 'pdfkit';
import { Response } from 'express';

export function generateLabReportPDF(report: any, res: Response) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream the PDF directly to the Express response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=lab-report-${report.testId}.pdf`);
  doc.pipe(res);

  // Draw military-style border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');

  // Title / Header
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1b2a4a')
     .text('MILITARY HOSPITAL SMART HEALTHCARE MANAGEMENT SYSTEM (MHSHMS)', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#475569')
     .text('DEPARTMENT OF PATHOLOGY & LABORATORY MEDICINE', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').fillColor('#64748b')
     .text('CONFIDENTIAL / MEDICAL OFFICER USE ONLY', { align: 'center' });
  doc.moveDown(1.5);

  // Divider Line
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#1b2a4a');
  doc.moveDown(1);

  // Patient Info section
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1b2a4a').text('PATIENT IDENTIFICATION / SERVICE RECORD');
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155');
  doc.text('Defence ID:', 50, startY);
  doc.text('Rank:', 50, startY + 15);
  doc.text('Patient Name:', 50, startY + 30);
  doc.text('Blood Group:', 50, startY + 45);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(report.patientDefenceId || 'N/A', 150, startY);
  doc.text(report.patientRank || 'N/A', 150, startY + 15);
  doc.text(report.consultation?.appointment?.patient?.user?.username || 'N/A', 150, startY + 30);
  
  // Format blood group back if it's enum
  let bloodGroupStr = report.consultation?.appointment?.patient?.bloodGroup || 'N/A';
  if (bloodGroupStr && bloodGroupStr.includes('_')) {
    bloodGroupStr = bloodGroupStr.replace('_POS', '+').replace('_NEG', '-');
  }
  doc.text(bloodGroupStr, 150, startY + 45);

  doc.font('Helvetica-Bold').fillColor('#334155');
  doc.text('Unit/Regiment:', 320, startY);
  doc.text('Gender:', 320, startY + 15);
  doc.text('DOB / Age:', 320, startY + 30);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(report.consultation?.appointment?.patient?.unit || 'N/A', 430, startY);
  doc.text(report.consultation?.appointment?.patient?.gender || 'N/A', 430, startY + 15);
  const dobVal = report.consultation?.appointment?.patient?.dob;
  doc.text(dobVal ? new Date(dobVal).toISOString().split('T')[0] : 'N/A', 430, startY + 30);

  doc.moveDown(4);

  // Divider Line
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#94a3b8');
  doc.moveDown(1);

  // Test Results Section
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1b2a4a').text('LABORATORY INVESTIGATION & DIAGNOSTICS');
  doc.moveDown(0.5);

  const testY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155');
  doc.text('Test Name:', 50, testY);
  doc.text('Test ID:', 50, testY + 15);
  doc.text('Order Date:', 50, testY + 30);
  doc.text('Status:', 50, testY + 45);
  doc.text('Requesting M.O.:', 50, testY + 60);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(report.testName || 'N/A', 160, testY);
  doc.text(report.testId || 'N/A', 160, testY + 15);
  doc.text(report.appointmentDate || 'N/A', 160, testY + 30);
  doc.text(report.status || 'N/A', 160, testY + 45);
  doc.text(report.doctorUsername || 'N/A', 160, testY + 60);

  doc.font('Helvetica-Bold').fillColor('#334155');
  doc.text('Performed By Tech:', 320, testY);
  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(report.performedBy || 'Awaiting Allocation', 440, testY);

  doc.moveDown(6);

  // Result box
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1b2a4a').text('FINDINGS / OBSERVATIONS');
  doc.moveDown(0.5);
  
  const resultText = report.result || 'No findings recorded. Diagnostic investigation pending completion.';
  const findingsY = doc.y;
  doc.rect(45, findingsY, doc.page.width - 90, 100).fillAndStroke('#f8fafc', '#cbd5e1');
  
  doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
  doc.text(resultText, 55, findingsY + 10, { width: doc.page.width - 110 });

  doc.y = findingsY + 110; // offset

  // Signatures
  doc.moveDown(2);
  const sigY = doc.y;
  doc.moveTo(50, sigY).lineTo(200, sigY).stroke('#94a3b8');
  doc.moveTo(350, sigY).lineTo(500, sigY).stroke('#94a3b8');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
  doc.text('LABORATORY TECHNICIAN', 50, sigY + 5, { align: 'left', width: 150 });
  doc.text('COMMAND MEDICAL OFFICER', 350, sigY + 5, { align: 'left', width: 150 });

  doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
  doc.text('Digital Signature Verified', 50, sigY + 18);
  doc.text('Authorized Signatory / Seal', 350, sigY + 18);

  // Footer page number
  doc.fontSize(8).fillColor('#94a3b8').text('Page 1 of 1', 50, doc.page.height - 50, { align: 'center' });

  doc.end();
}

export function generateTelemetryPDF(data: any, res: Response) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=bed-telemetry-report.pdf');
  doc.pipe(res);

  // Border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');

  // Title
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1b2a4a')
     .text('MILITARY HOSPITAL SMART HEALTHCARE MANAGEMENT SYSTEM (MHSHMS)', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#475569')
     .text(`BED TELEMETRY & WARD CONTROL SUMMARY - ${data.hospitalName.toUpperCase()}`, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica').fillColor('#64748b')
     .text(`REPORT GENERATED: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  // Divider Line
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#1b2a4a');
  doc.moveDown(1);

  // Summary widgets
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1b2a4a').text('HOSPITAL CAPACITY OVERVIEW');
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.rect(40, startY, 515, 60).fillAndStroke('#f8fafc', '#e2e8f0');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
  doc.text('TOTAL BEDS', 50, startY + 10);
  doc.text('VACANT BEDS', 135, startY + 10);
  doc.text('ICU TOTAL / OCCUPIED', 220, startY + 10);
  doc.text('GENERAL TOTAL / OCCUPIED', 350, startY + 10);
  doc.text('MAINTENANCE', 480, startY + 10);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(data.summary.totalBeds.toString(), 50, startY + 25);
  doc.text(data.summary.vacancyTotal.toString(), 135, startY + 25);
  doc.text(`${data.summary.icuTotal} / ${data.summary.icuOccupied}`, 220, startY + 25);
  doc.text(`${data.summary.generalTotal} / ${data.summary.generalOccupied}`, 350, startY + 25);
  doc.text(data.summary.maintenanceTotal.toString(), 480, startY + 25);

  doc.y = startY + 80;

  // Ward Wise Occupancies
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1b2a4a').text('WARD DISTRIBUTION SUMMARY');
  doc.moveDown(0.5);

  // Calculate ward occupancies dynamically
  const wards = Array.from(new Set(data.telemetry.map((b: any) => b.ward))) as string[];
  const wardData = wards.map(w => {
    const beds = data.telemetry.filter((b: any) => b.ward === w);
    const total = beds.length;
    const occupied = beds.filter((b: any) => b.status === 'OCCUPIED').length;
    const maintenance = beds.filter((b: any) => b.status === 'MAINTENANCE').length;
    const vacant = total - (occupied + maintenance);
    const floor = beds[0]?.floor || 1;
    return { name: w, floor, total, occupied, vacant, maintenance };
  });

  // Table header for Ward Summary
  const tableY = doc.y;
  doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('Ward Name', 50, tableY + 5);
  doc.text('Floor', 220, tableY + 5);
  doc.text('Total', 260, tableY + 5);
  doc.text('Occupied', 310, tableY + 5);
  doc.text('Vacant', 370, tableY + 5);
  doc.text('Maint.', 430, tableY + 5);
  doc.text('Occupancy', 490, tableY + 5);

  let currentY = tableY + 20;
  doc.font('Helvetica').fontSize(9).fillColor('#334155');
  wardData.forEach(w => {
    doc.rect(40, currentY, 515, 20).stroke('#f1f5f9');
    doc.text(w.name, 50, currentY + 5);
    doc.text(`FL-${w.floor}`, 220, currentY + 5);
    doc.text(w.total.toString(), 260, currentY + 5);
    doc.text(w.occupied.toString(), 310, currentY + 5);
    doc.text(w.vacant.toString(), 370, currentY + 5);
    doc.text(w.maintenance.toString(), 430, currentY + 5);
    const rate = Math.round((w.occupied / w.total) * 100);
    doc.font('Helvetica-Bold').text(`${rate}%`, 490, currentY + 5);
    doc.font('Helvetica');
    currentY += 20;
  });

  doc.y = currentY + 15;

  // Active Occupancy details
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1b2a4a').text('ACTIVE PATIENT BED ALLOCATIONS');
  doc.moveDown(0.5);

  const activeBeds = data.telemetry.filter((b: any) => b.status === 'OCCUPIED' || b.status === 'MAINTENANCE');
  
  if (activeBeds.length === 0) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b').text('No active allocations or maintenance status recorded.');
  } else {
    const listY = doc.y;
    doc.rect(40, listY, 515, 20).fill('#e2e8f0');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text('Bed ID', 50, listY + 5);
    doc.text('Ward Name', 120, listY + 5);
    doc.text('Bed Type', 250, listY + 5);
    doc.text('Patient/Status', 320, listY + 5);
    doc.text('Rank', 420, listY + 5);
    doc.text('Admitted Date', 470, listY + 5);

    let bedY = listY + 20;
    doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
    activeBeds.forEach((b: any) => {
      // Check if doc height is exceeded
      if (bedY > doc.page.height - 70) {
        doc.addPage();
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');
        // Redraw table headers on new page
        bedY = 40;
        doc.rect(40, bedY, 515, 20).fill('#e2e8f0');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text('Bed ID', 50, bedY + 5);
        doc.text('Ward Name', 120, bedY + 5);
        doc.text('Bed Type', 250, bedY + 5);
        doc.text('Patient/Status', 320, bedY + 5);
        doc.text('Rank', 420, bedY + 5);
        doc.text('Admitted Date', 470, bedY + 5);
        bedY += 20;
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      }

      doc.rect(40, bedY, 515, 20).stroke('#f1f5f9');
      doc.text(b.bedId, 50, bedY + 5);
      doc.text(b.ward, 120, bedY + 5);
      doc.text(b.type, 250, bedY + 5);
      
      if (b.status === 'OCCUPIED') {
        doc.text(b.patientDefenceId || 'N/A', 320, bedY + 5);
        doc.text(b.patientRank || 'N/A', 420, bedY + 5);
        const dateStr = b.admittedAt ? new Date(b.admittedAt).toISOString().split('T')[0] : 'N/A';
        doc.text(dateStr, 470, bedY + 5);
      } else {
        doc.font('Helvetica-Bold').fillColor('#ef4444').text('MAINTENANCE', 320, bedY + 5);
        doc.font('Helvetica').fillColor('#334155');
        doc.text('—', 420, bedY + 5);
        doc.text('—', 470, bedY + 5);
      }
      bedY += 20;
    });
  }

  // Footer page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');
    doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, { align: 'center' });
  }

  doc.end();
}
