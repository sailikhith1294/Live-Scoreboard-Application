const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const buildTournamentExcel = async (tournament, matches = [], leaderboard = []) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tournament Summary');

  ws.addRow(['Tournament', tournament.name]);
  ws.addRow(['Format', tournament.format]);
  ws.addRow(['Location', tournament.location]);
  ws.addRow([]);
  ws.addRow(['Matches']);
  ws.addRow(['Match No', 'Status', 'Scheduled', 'Home Team', 'Away Team']);

  matches.forEach((m) => {
    ws.addRow([m.matchNo, m.status, m.scheduledAt, m.homeTeamId?.name || '-', m.awayTeamId?.name || '-']);
  });

  ws.addRow([]);
  ws.addRow(['Leaderboard']);
  ws.addRow(['Team', 'Played', 'Won', 'Lost', 'Points', 'NRR']);
  leaderboard.forEach((r) => {
    ws.addRow([r.teamId?.name || '-', r.played, r.won, r.lost, r.points, r.netRunRate]);
  });

  return wb.xlsx.writeBuffer();
};

const buildMatchPdf = (match, scorecard, events = []) =>
  new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).text('Match Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Match: ${match.matchNo}`);
    doc.text(`Status: ${match.status}`);
    doc.text(`Score: ${scorecard?.runs || 0}/${scorecard?.wickets || 0} in ${scorecard?.overs || 0} overs`);
    doc.moveDown();
    doc.text('Recent Ball Events:');

    events.slice(-15).forEach((e) => {
      doc.text(`Over ${e.overNumber}.${e.ballNumber}: ${e.batsmanRuns}+${e.extras} ${e.isWicket ? '(W)' : ''}`);
    });

    doc.end();
  });

module.exports = { buildTournamentExcel, buildMatchPdf };
