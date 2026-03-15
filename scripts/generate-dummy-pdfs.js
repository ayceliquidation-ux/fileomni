const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

async function createDummyPdfs() {
  // Setup directory
  if (!fs.existsSync('./test-pdfs')) {
    fs.mkdirSync('./test-pdfs');
  }

  // Create PDF 1
  const pdf1 = await PDFDocument.create();
  const page1 = pdf1.addPage([500, 500]);
  page1.drawText('This is Test PDF Number 1', {
    x: 50,
    y: 250,
    size: 30,
    color: rgb(0, 0.5, 0.8),
  });
  const pdfBytes1 = await pdf1.save();
  fs.writeFileSync('./test-pdfs/test1.pdf', pdfBytes1);
  console.log('Created test-pdfs/test1.pdf');

  // Create PDF 2
  const pdf2 = await PDFDocument.create();
  const page2 = pdf2.addPage([500, 500]);
  page2.drawText('This is Test PDF Number 2', {
    x: 50,
    y: 250,
    size: 30,
    color: rgb(0.8, 0.2, 0.1),
  });
  const pdfBytes2 = await pdf2.save();
  fs.writeFileSync('./test-pdfs/test2.pdf', pdfBytes2);
  console.log('Created test-pdfs/test2.pdf');
}

createDummyPdfs().catch(console.error);
