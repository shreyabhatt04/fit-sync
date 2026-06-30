// backend/utils/invoicePdf.js — Batch 14 (guide feedback #9b)
//
// Streaming PDF generator for invoices. Built on pdfkit, which is a
// low-level "draw shapes/text by coordinates" API — verbose but no other
// runtime deps and produces clean, deterministic PDFs.
//
// Layout: standard A4, with a top banner indicating Customer or Owner copy.
// Owner copy adds an "Internal Notes" section and signature lines at the
// bottom. Both copies share the same gym info / customer info / line items.
//
// Usage:
//   const stream = createInvoicePdfStream({ payment, customer, company, copy })
//   stream.pipe(res)         // pdfkit instances are themselves Readable
//
// IMPORTANT: pdfkit's PDFDocument *is* a Readable stream. The caller pipes
// it directly into `res`. Do NOT call doc.end() on the caller side — this
// function calls it for you after writing the last element.

const PDFDocument = require('pdfkit')

// ─── Visual constants ────────────────────────────────────────────
// Keeping these at the top so the layout is easy to tweak in one place.
const PAGE_MARGIN = 50      // pt — pdfkit default is also 50, kept explicit
const TEAL        = '#10B981'
const DARK        = '#1f2937'
const MUTED       = '#6b7280'
const BORDER      = '#e5e7eb'
const LIGHT_BG    = '#f9fafb'

const formatINR = (n) =>
    `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
// ^ pdfkit's bundled fonts (Helvetica family) don't include the ₹ glyph,
// so we use "Rs." which renders cleanly without bundling a custom font.
// If you ever ship Noto Sans or DejaVu with the backend you can swap this.

const formatDateShort = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    }) : '—'

// ─── Section helpers ─────────────────────────────────────────────

const drawCopyBanner = (doc, copy) => {
    const isOwner = copy === 'owner'
    const text = isOwner ? 'OWNER COPY — INTERNAL RECORD' : 'CUSTOMER COPY'
    const fillColor = isOwner ? DARK : '#ecfdf5'
    const textColor = isOwner ? '#ffffff' : '#047857'

    doc.rect(PAGE_MARGIN, PAGE_MARGIN, doc.page.width - PAGE_MARGIN * 2, 22)
        .fill(fillColor)

    doc.fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(text, PAGE_MARGIN, PAGE_MARGIN + 6, {
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'center',
        })

    doc.fillColor(DARK)   // reset
    doc.y = PAGE_MARGIN + 22 + 16
}

const drawHeader = (doc, { company, payment }) => {
    const startY = doc.y
    const leftX = PAGE_MARGIN
    const rightX = doc.page.width / 2 + 30

    // Left column: gym info
    doc.font('Helvetica-Bold').fontSize(20).fillColor(DARK)
        .text(company?.name || 'Gym', leftX, startY)

    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    const address = [company?.address, company?.city, company?.state]
        .filter(Boolean).join(', ')
    if (address) doc.text(address, leftX, doc.y + 2)
    if (company?.gstNumber) doc.text(`GSTIN: ${company.gstNumber}`, leftX, doc.y + 1)
    const contact = [
        company?.phone ? `Ph: ${company.phone}` : null,
        company?.email ? company.email : null,
    ].filter(Boolean).join('  ·  ')
    if (contact) doc.text(contact, leftX, doc.y + 1)

    const leftEndY = doc.y

    // Right column: invoice meta — anchor to startY independently
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
        .text('INVOICE', rightX, startY, { width: 200, align: 'right' })

    doc.font('Helvetica-Bold').fontSize(14).fillColor(TEAL)
        .text(payment.invoiceNumber || '—', rightX, doc.y + 2,
            { width: 200, align: 'right' })

    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    doc.text(`Date:  ${formatDateShort(payment.paymentDate)}`,
        rightX, doc.y + 4, { width: 200, align: 'right' })
    if (payment.dueDate) {
        doc.text(`Due:   ${formatDateShort(payment.dueDate)}`,
            rightX, doc.y + 1, { width: 200, align: 'right' })
    }

    const rightEndY = doc.y
    doc.y = Math.max(leftEndY, rightEndY) + 18

    // Divider line
    doc.strokeColor(BORDER).lineWidth(1)
        .moveTo(PAGE_MARGIN, doc.y)
        .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
        .stroke()
    doc.y += 14
}

const drawSectionTitle = (doc, label) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
        .text(label.toUpperCase(), PAGE_MARGIN, doc.y, {
            characterSpacing: 1,
        })
    doc.y += 4
    doc.fillColor(DARK)
}

const drawBilledTo = (doc, { customer }) => {
    drawSectionTitle(doc, 'Billed To')

    const fullName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || '—'
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK)
        .text(fullName, PAGE_MARGIN, doc.y + 2)

    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    if (customer?.email)   doc.text(customer.email,   PAGE_MARGIN, doc.y + 1)
    if (customer?.phone)   doc.text(customer.phone,   PAGE_MARGIN, doc.y + 1)
    if (customer?.address) doc.text(customer.address, PAGE_MARGIN, doc.y + 1)
    doc.y += 16
}

const drawItemsTable = (doc, { payment }) => {
    drawSectionTitle(doc, 'Items')

    const tableTop = doc.y + 4
    const colDescX  = PAGE_MARGIN + 8
    const colModeX  = 320
    const colAmtX   = 460
    const tableW    = doc.page.width - PAGE_MARGIN * 2
    const rowH      = 22

    // Header row
    doc.rect(PAGE_MARGIN, tableTop, tableW, rowH).fill(LIGHT_BG)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
        .text('DESCRIPTION', colDescX, tableTop + 7)
        .text('MODE',        colModeX, tableTop + 7)
        .text('AMOUNT',      colAmtX,  tableTop + 7,
            { width: doc.page.width - PAGE_MARGIN - colAmtX, align: 'right' })

    // Single line item — gym memberships are billed as a single line.
    // If you ever support multiple line items (add-ons, PT sessions etc.)
    // you'd loop here.
    const itemY = tableTop + rowH
    doc.font('Helvetica').fontSize(11).fillColor(DARK)
        .text('Gym Membership', colDescX, itemY + 6)
        .text(payment.mode || '—', colModeX, itemY + 6)
        .text(formatINR(payment.amount), colAmtX, itemY + 6,
            { width: doc.page.width - PAGE_MARGIN - colAmtX, align: 'right' })

    // Bottom border on the row
    doc.strokeColor(BORDER).lineWidth(0.5)
        .moveTo(PAGE_MARGIN, itemY + rowH)
        .lineTo(doc.page.width - PAGE_MARGIN, itemY + rowH)
        .stroke()

    doc.y = itemY + rowH + 12
}

const drawTotalAndStatus = (doc, { payment }) => {
    const labelX = doc.page.width - PAGE_MARGIN - 240
    const valueX = doc.page.width - PAGE_MARGIN - 120
    const totalY = doc.y + 8

    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
        .text('Total Amount', labelX, totalY,
            { width: 100, align: 'right' })

    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK)
        .text(formatINR(payment.amount), valueX, totalY - 1,
            { width: 120, align: 'right' })

    // Status pill
    const status = (payment.status || 'paid').toUpperCase()
    const statusColors = {
        PAID:    { bg: '#dcfce7', fg: '#166534' },
        DUE:     { bg: '#fef3c7', fg: '#92400e' },
        OVERDUE: { bg: '#fee2e2', fg: '#991b1b' },
    }
    const c = statusColors[status] || statusColors.PAID
    const statusY = totalY + 28
    const pillW = 70
    const pillX = doc.page.width - PAGE_MARGIN - pillW
    doc.roundedRect(pillX, statusY, pillW, 18, 9).fill(c.bg)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(c.fg)
        .text(status, pillX, statusY + 5, { width: pillW, align: 'center' })

    doc.y = statusY + 32
}

const drawOwnerExtras = (doc, { payment, company }) => {
    drawSectionTitle(doc, 'Internal Notes')
    doc.font('Helvetica').fontSize(11).fillColor(DARK)
        .text(payment.notes || '—', PAGE_MARGIN, doc.y + 2,
            { width: doc.page.width - PAGE_MARGIN * 2 })
    doc.y += 30

    // Signature block — two columns
    const colW   = (doc.page.width - PAGE_MARGIN * 2 - 30) / 2
    const sigY   = doc.y + 30
    const leftX  = PAGE_MARGIN
    const rightX = PAGE_MARGIN + colW + 30

    doc.strokeColor(BORDER).lineWidth(0.7)
        .moveTo(leftX, sigY).lineTo(leftX + colW, sigY).stroke()
        .moveTo(rightX, sigY).lineTo(rightX + colW, sigY).stroke()

    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text('Received by (signature)', leftX, sigY + 6,
            { width: colW })
        .text(`Authorized signatory · ${company?.name || 'Gym'}`,
            rightX, sigY + 6, { width: colW })

    doc.y = sigY + 24
}

const drawFooter = (doc) => {
    // Footer pinned just above the bottom margin. Using lineBreak:false
    // prevents pdfkit from auto-paginating if the text would otherwise
    // overflow — without this, the first page ends up blank-ish and the
    // footer appears alone on a second page.
    const footerY = doc.page.height - PAGE_MARGIN - 12
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text('Generated by FitSync', PAGE_MARGIN, footerY, {
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'center',
            lineBreak: false,
        })
}

// ─── Main entry ──────────────────────────────────────────────────

const createInvoicePdfStream = ({ payment, customer, company, copy = 'customer' }) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE_MARGIN,
        info: {
            Title: `Invoice ${payment?.invoiceNumber || ''}`,
            Author: company?.name || 'FitSync',
            Subject: copy === 'owner' ? 'Owner Copy' : 'Customer Copy',
        },
    })

    drawCopyBanner(doc, copy)
    drawHeader(doc,    { company, payment })
    drawBilledTo(doc,  { customer })
    drawItemsTable(doc,{ payment })
    drawTotalAndStatus(doc, { payment })

    if (copy === 'owner') {
        drawOwnerExtras(doc, { payment, company })
    }

    drawFooter(doc)
    doc.end()
    return doc
}

module.exports = { createInvoicePdfStream }
