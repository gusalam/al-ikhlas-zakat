import jsPDF from 'jspdf';
import { terbilang } from '@/lib/terbilang';
import logoImg from '@/assets/logo-masjid.webp';
import { KwitansiData, DetailZakatItem } from '@/components/KwitansiZakat';
import { toast } from 'sonner';

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function downloadKwitansiPdf(data: KwitansiData) {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148, 210] });
    const green = [39, 103, 73] as const;
    const lightGreen = [230, 245, 230] as const;

    const payments = getPaymentRows(data.details);
    const totalUang = payments.reduce((s, p) => s + p.uang, 0);
    const totalJiwa = data.details.find(d => d.jenis_zakat === 'Zakat Fitrah')?.jumlah_jiwa || 0;

    doc.setDrawColor(...green); doc.setLineWidth(1.5); doc.rect(5, 5, 200, 138);
    doc.setLineWidth(0.5); doc.rect(7, 7, 196, 134);
    doc.setFillColor(...lightGreen); doc.rect(10, 10, 40, 128, 'F');

    try {
      const img = await loadImage(logoImg);
      doc.addImage(img, 'PNG', 15, 15, 30, 30);
    } catch {
      // Logo load failed, continue without it
    }

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

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kwitansi-zakat-${data.nomor}.pdf`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Kwitansi PDF berhasil diunduh ✓');
  } catch (error) {
    console.error('Download kwitansi error:', error);
    toast.error('Gagal mengunduh kwitansi PDF. Silakan coba lagi.');
  }
}
