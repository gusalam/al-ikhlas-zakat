import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import { terbilang } from '@/lib/terbilang';
import jsPDF from 'jspdf';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';

export interface DetailZakatItem {
  jenis_zakat: string;
  jumlah_uang: number;
  jumlah_beras: number;
  jumlah_jiwa: number;
}

export interface KwitansiData {
  nomor: number;
  nama_muzakki: string;
  details: DetailZakatItem[];
  tanggal: string;
  penerima: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: KwitansiData | null;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const kgToLiter = (kg: number) => parseFloat((kg * 1.25).toFixed(2));
const fmtBeras = (kg: number) => `${kg} Kg / ${kgToLiter(kg)} Liter`;

function getPaymentRows(details: DetailZakatItem[]) {
  const map: Record<string, DetailZakatItem> = {};
  details.forEach(d => { map[d.jenis_zakat] = d; });
  return [
    { no: 1, name: 'Zakat Fitrah', uang: map['Zakat Fitrah']?.jumlah_uang || 0, beras: map['Zakat Fitrah']?.jumlah_beras || 0 },
    { no: 2, name: 'Zakat Mal', uang: map['Zakat Mal']?.jumlah_uang || 0, beras: 0 },
    { no: 3, name: 'Infaq', uang: (map['Infaq']?.jumlah_uang || 0) + (map['Shodaqoh']?.jumlah_uang || 0), beras: 0 },
    { no: 4, name: 'Fidyah', uang: map['Fidyah']?.jumlah_uang || 0, beras: map['Fidyah']?.jumlah_beras || 0 },
  ];
}

export default function KwitansiZakat({ open, onOpenChange, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const payments = getPaymentRows(data.details);
  const totalUang = payments.reduce((s, p) => s + p.uang, 0);
  const totalBeras = payments.reduce((s, p) => s + p.beras, 0);
  const totalJiwa = data.details.find(d => d.jenis_zakat === 'Zakat Fitrah')?.jumlah_jiwa || 0;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Kwitansi Zakat</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        ${printStyles}
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148, 210] });
    const green = [39, 103, 73] as const;
    const lightGreen = [230, 245, 230] as const;

    doc.setDrawColor(...green); doc.setLineWidth(1.5); doc.rect(5, 5, 200, 138);
    doc.setLineWidth(0.5); doc.rect(7, 7, 196, 134);
    doc.setFillColor(...lightGreen); doc.rect(10, 10, 40, 128, 'F');

    try {
      const img = new Image(); img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); img.src = logoImg; });
      doc.addImage(img, 'PNG', 15, 15, 30, 30);
    } catch { /* skip */ }

    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green);
    doc.text('BADAN AMIL', 30, 55, { align: 'center' }); doc.text('ZAKAT', 30, 60, { align: 'center' });
    doc.text('MASJID AL-IKHLAS', 30, 65, { align: 'center' }); doc.text('KEBON BARU', 30, 70, { align: 'center' });

    const contentX = 55;
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...green);
    doc.text('KWITANSI ZAKAT', 130, 18, { align: 'center' });
    doc.setDrawColor(...green); doc.line(80, 20, 180, 20);

    doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    let y = 30;
    const labelX = contentX, colonX = labelX + 35, valX = colonX + 5;

    doc.setFont('helvetica', 'normal'); doc.text('Nomor', labelX, y); doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold'); doc.text(String(data.nomor), valX, y);

    y += 10;
    doc.setFont('helvetica', 'normal'); doc.text('Nama Muzakki', labelX, y); doc.text(':', colonX, y);
    doc.setFont('helvetica', 'bold'); doc.text(data.nama_muzakki, valX, y);
    if (totalJiwa > 0) {
      doc.setFont('helvetica', 'normal'); doc.text('Jumlah Jiwa', 145, y); doc.text(':', 175, y);
      doc.setFont('helvetica', 'bold'); doc.text(`${totalJiwa} Orang`, 180, y);
    }

    y += 10;
    doc.setFont('helvetica', 'normal'); doc.text('Untuk Pembayaran :', labelX, y);
    y += 7;

    payments.forEach(p => {
      doc.setFont('helvetica', 'normal');
      doc.text(`${p.no}`, labelX + 3, y); doc.text(p.name, labelX + 10, y);
      doc.text('Uang  :', labelX + 40, y);
      if (p.uang > 0) { doc.setFont('helvetica', 'bold'); doc.text(`Rp    ${fmt(p.uang)}`, labelX + 58, y); }
      if (p.beras > 0) { doc.setFont('helvetica', 'normal'); doc.text(`Beras : ${fmtBeras(p.beras)}`, 145, y); }
      else if (p.no === 1) { doc.setFont('helvetica', 'normal'); doc.text('Beras :', 145, y); }
      y += 7;
    });

    y += 3;
    doc.setFont('helvetica', 'normal'); doc.text('Jumlah Total :', labelX + 20, y);
    doc.setFont('helvetica', 'bold'); doc.text(`Rp    ${fmt(totalUang)}`, labelX + 58, y);
    const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFont('helvetica', 'normal'); doc.text(`Jakarta,  ${dateStr}`, 145, y);

    y += 10;
    doc.setFont('helvetica', 'normal'); doc.text('Terbilang :', labelX, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const splitText = doc.splitTextToSize(terbilang(totalUang), 70);
    doc.text(splitText, labelX + 25, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Penerima,', 160, y);
    y += 15;
    doc.setFont('helvetica', 'bold'); doc.text(data.penerima, 165, y, { align: 'center' });

    doc.save(`kwitansi-zakat-${data.nomor}.pdf`);
    toast.success('Kwitansi PDF berhasil diunduh ✓');
  } catch (error) {
    console.error('Download kwitansi error:', error);
    toast.error('Gagal mengunduh kwitansi PDF. Silakan coba lagi.');
  }

  const dateStr = new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl p-2 md:p-6 overflow-auto max-h-[90vh]">
        <div className="flex gap-2 justify-end mb-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          <Button size="sm" onClick={handleDownloadPdf}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
        </div>

        <div ref={printRef}>
          <div style={{ border: '3px solid #276749', padding: '4px', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ border: '1px solid #276749', padding: '0', display: 'flex', minHeight: '320px' }}>
              <div style={{ width: '120px', minWidth: '120px', backgroundColor: '#e6f5e6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', borderRight: '1px solid #276749' }}>
                <img src={logoImg} alt="Logo" style={{ width: '70px', height: '70px', marginBottom: '12px' }} />
                <div style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '11px', lineHeight: '1.4' }}>
                  BADAN AMIL<br />ZAKAT<br />MASJID AL-IKHLAS<br />KEBON BARU
                </div>
              </div>
              <div style={{ flex: 1, padding: '12px 16px', fontSize: '13px' }}>
                <h2 style={{ textAlign: 'center', color: '#276749', fontWeight: 'bold', fontSize: '16px', borderBottom: '2px solid #276749', paddingBottom: '4px', marginBottom: '12px' }}>
                  KWITANSI ZAKAT
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '3px 0' }}>Nomor</td><td style={{ width: '10px' }}>:</td><td><strong style={{ border: '1px solid #ccc', padding: '1px 8px' }}>{data.nomor}</strong></td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Nama Muzakki</td><td>:</td><td><strong>{data.nama_muzakki}</strong></td>
                      {totalJiwa > 0 && <td style={{ textAlign: 'right' }}>Jumlah Jiwa : <strong style={{ border: '1px solid #ccc', padding: '1px 8px' }}>{totalJiwa}</strong> Orang</td>}
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ marginBottom: '4px' }}>Untuk Pembayaran :</div>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.no}>
                          <td style={{ width: '16px', padding: '2px 0' }}>{p.no}</td>
                          <td style={{ width: '90px' }}>{p.name}</td>
                          <td style={{ width: '50px' }}>Uang :</td>
                          <td style={{ width: '30px', fontWeight: 'bold' }}>{p.uang > 0 ? 'Rp' : ''}</td>
                          <td style={{ width: '80px', fontWeight: 'bold' }}>{p.uang > 0 ? fmt(p.uang) : ''}</td>
                          <td style={{ width: '50px' }}>{(p.no === 1 || p.no === 4) ? 'Beras :' : ''}</td>
                          <td>{(p.no === 1 || p.no === 4) ? (p.beras > 0 ? fmtBeras(p.beras) : '') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
                  <div><span>Jumlah Total : </span><strong style={{ marginLeft: '20px' }}>Rp    {fmt(totalUang)}</strong></div>
                  <div>Jakarta, {dateStr}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div><span>Terbilang : </span><strong style={{ fontSize: '13px' }}>{terbilang(totalUang)}</strong></div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div>Penerima,</div>
                    <div style={{ marginTop: '30px', fontWeight: 'bold' }}>{data.penerima}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const printStyles = `
  .kwitansi-wrapper { max-width: 700px; margin: 0 auto; }
  table { border-collapse: collapse; }
  img { max-width: 70px; }
`;
