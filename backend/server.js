const express = require('express');
const cors = require('cors');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ====================== DB ======================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ====================== JWT ======================
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123changeinproduction';

// ====================== LOGIN ======================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// ====================== AUTH ======================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ====================== HELPERS ======================
const BLUE = rgb(0.05, 0.64, 0.89); // vivid professional blue
const LIGHT_GRAY = rgb(0.93, 0.93, 0.93);
const WHITE = rgb(1, 1, 1);
const DARK = rgb(0.16, 0.16, 0.16);
const MID = rgb(0.45, 0.45, 0.45);

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 72;
const RIGHT = 72;
const CONTENT_W = PAGE_W - LEFT - RIGHT; // 468
const LABEL_W = 190;
const VALUE_W = CONTENT_W - LABEL_W;

function safeText(value) {
  return value === null || value === undefined ? '' : String(value);
}

function safeFilename(name) {
  return safeText(name)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function wrapText(font, text, size, maxWidth) {
  const raw = safeText(text).trim();
  if (!raw) return [];

  const words = raw.split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawSectionHeader(page, yTop, text, fontBold) {
  const h = 24;
  page.drawRectangle({
    x: LEFT,
    y: yTop - h,
    width: CONTENT_W,
    height: h,
    color: BLUE,
  });

  page.drawText(text, {
    x: LEFT + 10,
    y: yTop - 16,
    size: 11,
    font: fontBold,
    color: WHITE,
  });

  return yTop - h - 7;
}

function drawLabelValueRow(page, yTop, label, value, font, options = {}) {
  const h = options.height || 24;
  const labelFill = options.labelFill || LIGHT_GRAY;
  const valueFill = options.valueFill || WHITE;
  const valueColor = options.valueColor || DARK;
  const labelColor = options.labelColor || DARK;
  const valueSize = options.valueSize || 10;
  const labelSize = options.labelSize || 10;
  const borderColor = options.borderColor || LIGHT_GRAY;

  page.drawRectangle({
    x: LEFT,
    y: yTop - h,
    width: LABEL_W,
    height: h,
    color: labelFill,
  });

  page.drawRectangle({
    x: LEFT + LABEL_W,
    y: yTop - h,
    width: VALUE_W,
    height: h,
    color: valueFill,
    borderColor,
    borderWidth: 0.8,
  });

  page.drawText(safeText(label), {
    x: LEFT + 8,
    y: yTop - (h / 2) - (labelSize / 2) + 2,
    size: labelSize,
    font,
    color: labelColor,
  });

  const valueText = safeText(value);
  const valueY = yTop - (h / 2) - (valueSize / 2) + 2;

  page.drawText(valueText, {
    x: LEFT + LABEL_W + 8,
    y: valueY,
    size: valueSize,
    font,
    color: valueColor,
    maxWidth: VALUE_W - 16,
  });

  return yTop - h - 6;
}

function drawWrappedValueBox(page, yTop, label, text, font, fontBold, options = {}) {
  const labelH = options.labelH || 24;
  const boxMinH = options.boxMinH || 44;
  const fontSize = options.fontSize || 9.5;
  const lineGap = options.lineGap || 4;
  const maxLines = options.maxLines || 6;

  page.drawRectangle({
    x: LEFT,
    y: yTop - labelH,
    width: CONTENT_W,
    height: labelH,
    color: BLUE,
  });

  page.drawText(label, {
    x: LEFT + 10,
    y: yTop - 16,
    size: 11,
    font: fontBold,
    color: WHITE,
  });

  const lines = wrapText(font, text, fontSize, CONTENT_W - 16).slice(0, maxLines);
  const contentH = Math.max(boxMinH, lines.length * (fontSize + lineGap) + 8);

  page.drawRectangle({
    x: LEFT,
    y: yTop - labelH - contentH,
    width: CONTENT_W,
    height: contentH,
    color: WHITE,
    borderColor: LIGHT_GRAY,
    borderWidth: 0.8,
  });

  let y = yTop - labelH - 14;
  for (const line of lines) {
    page.drawText(line, {
      x: LEFT + 8,
      y,
      size: fontSize,
      font,
      color: DARK,
      maxWidth: CONTENT_W - 16,
    });
    y -= fontSize + lineGap;
  }

  return yTop - labelH - contentH - 7;
}

function drawCrossedCutleryLogo(page, x, y, size) {
  // Blue square
  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    color: BLUE,
  });

  // White inner circle
  const circleR = size * 0.34;
  page.drawCircle({
    x: x + size / 2,
    y: y + size / 2,
    size: circleR,
    color: WHITE,
  });

  const cx = x + size / 2;
  const cy = y + size / 2;

  // Fork handle (diagonal, slightly thicker)
  page.drawLine({
    start: { x: cx - 10, y: cy - 12 },
    end: { x: cx + 8, y: cy + 8 },
    thickness: 3.2,
    color: BLUE,
  });

  // Fork tines at top end
  const tineBaseX = cx + 8;
  const tineBaseY = cy + 8;
  const tineOffsets = [-4, -1, 2];

  for (const off of tineOffsets) {
    page.drawLine({
      start: { x: tineBaseX + off, y: tineBaseY + 1 },
      end: { x: tineBaseX + off + 4, y: tineBaseY + 5 },
      thickness: 1.4,
      color: BLUE,
    });
  }

  // Spoon handle opposite diagonal
  page.drawLine({
    start: { x: cx + 12, y: cy - 12 },
    end: { x: cx - 7, y: cy + 8 },
    thickness: 3.2,
    color: BLUE,
  });

  // Spoon bowl at top-left end
  page.drawCircle({
    x: cx - 7,
    y: cy + 8,
    size: 5.5,
    color: BLUE,
  });
}

function drawFooter(page, fontBold) {
  page.drawRectangle({
    x: LEFT,
    y: 56,
    width: CONTENT_W,
    height: 24,
    color: BLUE,
  });

  page.drawText('Comply 365.com', {
    x: LEFT + 170,
    y: 63,
    size: 13,
    font: fontBold,
    color: WHITE,
    italic: true,
  });
}

function formatDateTime(value) {
  if (value) return value;

  return new Date()
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

async function embedSignatureIfAny(pdfDoc, page, dataUrl, x, y, maxW, maxH) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes('base64')) return;

  try {
    const base64Data = dataUrl.split(',')[1];
    const bytes = Buffer.from(base64Data, 'base64');
    const img = await pdfDoc.embedPng(bytes);

    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const dims = img.scale(scale);

    page.drawImage(img, {
      x,
      y,
      width: dims.width,
      height: dims.height,
    });
  } catch (err) {
    console.error('Signature embed error:', err);
  }
}

// ====================== SUBMIT TRAINING ======================
app.post('/api/submit-training', authMiddleware, async (req, res) => {
  try {
    const {
      premisesName,
      traineeName,
      workLocation,
      trainingDate,
      trainerName,
      trainingLevel,
      subjectsCovered,
      satisfactory,
      certificateIssued,
      furtherTrainingRequired,
      comments,
      traineeSignature,
      traineeIp,
      traineeSignedAt,
      trainerSignature,
      trainerIp,
      trainerSignedAt,
    } = req.body;

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // ====================== SAVE TO DB ======================
    await pool.query(
      `
      INSERT INTO training_records
      (username, premises_name, trainee_name, work_location, training_date,
       trainer_name, training_level, subjects_covered,
       satisfactory, certificate_issued, further_training_required, comments,
       trainee_signature, trainee_ip, trainee_signed_at,
       trainer_signature, trainer_ip, trainer_signed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
      [
        req.user.username,
        premisesName,
        traineeName,
        workLocation,
        trainingDate,
        trainerName,
        trainingLevel,
        JSON.stringify(subjectsCovered || []),
        satisfactory,
        certificateIssued,
        furtherTrainingRequired,
        comments,
        traineeSignature,
        traineeIp || ip,
        traineeSignedAt,
        trainerSignature,
        trainerIp || ip,
        trainerSignedAt,
      ]
    );

    // ====================== GENERATE PDF ======================
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ====================== PAGE 1 ======================
    const page1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 56;

    // Header
    const headerBarX = LEFT + 88;
    const headerBarW = CONTENT_W - 88;
    const headerBarH = 86;
    const headerBarY = y - headerBarH;

    drawCrossedCutleryLogo(page1, LEFT, headerBarY, 86);

    page1.drawRectangle({
      x: headerBarX,
      y: headerBarY,
      width: headerBarW,
      height: headerBarH,
      color: BLUE,
    });

    page1.drawText('TRAINING RECORD', {
      x: headerBarX + 18,
      y: headerBarY + 31,
      size: 24,
      font: helveticaBold,
      color: WHITE,
    });

    page1.drawText('©', {
      x: headerBarX + headerBarW - 38,
      y: headerBarY + 30,
      size: 17,
      font: helveticaBold,
      color: WHITE,
    });

    y = headerBarY - 10;

    // Main content
    y = drawLabelValueRow(page1, y, 'Premises Name', premisesName, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawSectionHeader(page1, y, 'TRAINEE DETAILS', helveticaBold);

    y = drawLabelValueRow(page1, y, 'Name', traineeName, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawLabelValueRow(page1, y, 'Work - Location', workLocation, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawSectionHeader(page1, y, 'PERSON CONDUCTING TRAINING', helveticaBold);

    y = drawLabelValueRow(page1, y, 'Name', trainerName, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawLabelValueRow(page1, y, 'Training Level', trainingLevel, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawWrappedValueBox(
      page1,
      y,
      'SUBJECT(S) COVERED',
      Array.isArray(subjectsCovered) ? subjectsCovered.join(' • ') : safeText(subjectsCovered),
      helvetica,
      helveticaBold,
      {
        boxMinH: 58,
        fontSize: 9.5,
        maxLines: 5,
      }
    );

    y = drawSectionHeader(page1, y, 'TRAINING COURSE COMPLIANCE', helveticaBold);

    y = drawLabelValueRow(page1, y, 'Was training satisfactory', satisfactory, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawLabelValueRow(page1, y, 'Was Certificate issued', certificateIssued, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawLabelValueRow(page1, y, 'Is further training required', furtherTrainingRequired, helvetica, {
      height: 26,
      valueSize: 11,
    });

    y = drawSectionHeader(page1, y, 'COMMENTS', helveticaBold);

    page1.drawText('Provide Details:', {
      x: LEFT,
      y: y - 2,
      size: 9,
      font: helvetica,
      color: DARK,
    });

    y -= 15;

    const commentText = safeText(comments);
    const commentLines = wrapText(helvetica, commentText, 9.2, CONTENT_W - 16).slice(0, 6);
    const commentBoxH = Math.max(44, commentLines.length * 12 + 12);

    page1.drawRectangle({
      x: LEFT,
      y: y - commentBoxH,
      width: CONTENT_W,
      height: commentBoxH,
      color: WHITE,
      borderColor: LIGHT_GRAY,
      borderWidth: 0.8,
    });

    let cy = y - 13;
    for (const line of commentLines) {
      page1.drawText(line, {
        x: LEFT + 8,
        y: cy,
        size: 9,
        font: helvetica,
        color: DARK,
        maxWidth: CONTENT_W - 16,
      });
      cy -= 12;
    }

    y = y - commentBoxH - 8;

    drawFooter(page1, helveticaBold);

    // ====================== PAGE 2 ======================
    const page2 = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y2 = PAGE_H - 60;

    y2 = drawSectionHeader(page2, y2, 'AUTHORISING SIGNATURE', helveticaBold);

    y2 = drawLabelValueRow(page2, y2, 'Date - Time', formatDateTime(traineeSignedAt), helvetica, {
      height: 26,
      valueSize: 10.5,
    });

    // Trainee signature
    page2.drawRectangle({
      x: LEFT,
      y: y2 - 24,
      width: LABEL_W,
      height: 24,
      color: LIGHT_GRAY,
    });
    page2.drawText("Trainee's Signature", {
      x: LEFT + 8,
      y: y2 - 16,
      size: 10,
      font: helvetica,
      color: DARK,
    });

    const sigBoxH = 112;
    page2.drawRectangle({
      x: LEFT + LABEL_W,
      y: y2 - 24 - sigBoxH,
      width: VALUE_W,
      height: sigBoxH,
      color: WHITE,
      borderColor: LIGHT_GRAY,
      borderWidth: 0.8,
    });

    await embedSignatureIfAny(
      pdfDoc,
      page2,
      traineeSignature,
      LEFT + LABEL_W + 14,
      y2 - 24 - sigBoxH + 12,
      VALUE_W - 28,
      sigBoxH - 20
    );

    y2 = y2 - 24 - sigBoxH - 10;

    // Trainer signature
    page2.drawRectangle({
      x: LEFT,
      y: y2 - 24,
      width: LABEL_W,
      height: 24,
      color: LIGHT_GRAY,
    });
    page2.drawText("Trainer's Signature", {
      x: LEFT + 8,
      y: y2 - 16,
      size: 10,
      font: helvetica,
      color: DARK,
    });

    page2.drawRectangle({
      x: LEFT + LABEL_W,
      y: y2 - 24 - sigBoxH,
      width: VALUE_W,
      height: sigBoxH,
      color: WHITE,
      borderColor: LIGHT_GRAY,
      borderWidth: 0.8,
    });

    await embedSignatureIfAny(
      pdfDoc,
      page2,
      trainerSignature,
      LEFT + LABEL_W + 14,
      y2 - 24 - sigBoxH + 12,
      VALUE_W - 28,
      sigBoxH - 20
    );

    drawFooter(page2, helveticaBold);

    const pdfBytes = await pdfDoc.save();

    console.log('✅ PDF generated successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Training_Record_${safeFilename(traineeName) || 'Record'}.pdf`
    );

    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('🔥 FULL BACKEND ERROR:', error);
    res
      .status(500)
      .setHeader('Content-Type', 'text/plain')
      .send('PDF generation failed: ' + error.message);
  }
});

// ====================== START SERVER ======================
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log('Login: admin / admin123');
});