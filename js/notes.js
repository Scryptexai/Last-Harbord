// ============ Jurnal Pelampung: catatan para pelaut yang tidak pulang ============
// 15 catatan — memori dunia. Ditemukan sebagai lembaran di pulau (node 'note'),
// tersimpan di save, kebaca kembali lewat modal JURNAL.
import { G } from './state.js';

export const NOTES = [
  { id: 'n01', title: 'Malam pertama seorang asing', text: 'Hari pertama. Dermaga kecil ini satu-satunya sisa rumah yang kupunya. Kalau kau membaca ini — berarti laut mengambil yang satu lagi.' },
  { id: 'n02', title: 'Pelita di tepian', text: 'Jangan percaya air yang tenang. Tenang itu hanya ingin mengantarmu sedikit lebih jauh dari dermaga, lalu membiarkanmu sendirian.' },
  { id: 'n03', title: 'Kegigihan', text: 'Palkaku sudah penuh, tapi tanganku belum selesai memungut. Ekstra satu kayu — dan aku terlambat satu napas. Malam tidak memberi toleransi.' },
  { id: 'n04', title: 'Momen', text: 'Fajar pertama yang kulihat di sini. Air turun seperti pintu yang nyaris tertutup. Kutulis catatan ini untukmu — jangan lupa berterima kasih pada pagi.' },
  { id: 'n05', title: 'Pulau Terlarang', text: 'Benar-benar terlarang, namanya tidak menyesatkan. Kalau lambungmu belum mampu, jangan datang kemari. Lambungku belum mampu. Aku datang kemari.' },
  { id: 'n06', title: 'Lari', text: 'Zombie cepat itu bukan yang paling menakutkan. Yang menakutkan adalah ia berhenti berlari ketika aku mulai berhenti bernapas.' },
  { id: 'n07', title: 'Pedoman', text: 'Peraturannya tiga: berlayar, kuras, pulang. Kalau kau mulai menambah-nambah peraturan keempat, air sudah tak peduli.' },
  { id: 'n08', title: 'Latar', text: 'Dengar deburan di belakang lentera? Bukan angin. Itu dermaga mengingatkanku. Pelita bisa padam — dermaga tetap di sini.' },
  { id: 'n09', title: 'Bekal', text: 'Bawa makanan, obat, dan solar. Kalau tiga hal itu sudah habis di laut, nyawalah yang mulai dihitung.' },
  { id: 'n10', title: 'Koin drif', text: 'Kumpulkan sampai berat. Warna pelita baru tidak menyelamatkanmu, tapi kau punya wajah sendiri di dermaga ini. Itu sesuatu.' },
  { id: 'n11', title: 'Tanda terdekat', text: 'Titik peta itu bukan direkomendasi. Kobarkan layar dan jangan lupa ukur jarak. Manusia meninggal di tengah perjalanan karena ukuran, bukan karena jauh.' },
  { id: 'n12', title: 'Luka', text: 'Setiap keretakan di lambungku adalah catatan. Aku tidak mau lupakan. Catatan inilah yang membuatku tahan mati.' },
  { id: 'n13', title: 'Mercusuar tanpa menara', text: 'Penjaga dermaga itu menetap, entah dibayar dengan apa. Jagai ia hangat. Ia satu-satunya pelita yang tinggal di sini.' },
  { id: 'n14', title: 'Awas pasang', text: 'Pasang pertama membuatmu berenang pulang. Pasang kedua membuatmu tidak sempat pulang sama sekali.' },
  { id: 'n15', title: 'Sampai bertemu', text: 'Kau tidak mengenalku, tapi kutulis ini supaya kau tahu: satu orang asing di dermaga ini bahagia. Kau masih hidup. Itu berarti cukup.' },
];
export const CEREMONY_NOTE = { id: 'n-dawn1', title: 'Fajar Pertamamu', text: 'Air turun seperti pintu yang nyaris tertutup. Aku menunggu. Dan kau pulang. Itu cukup.' };

export const allNotes = () => [...NOTES, CEREMONY_NOTE];
export const noteById = (id) => allNotes().find((n) => n.id === id) || null;
export function hasNote(id) { return (G.notes || []).includes(id); }
export function addNote(id) {
  if (!G.notes) G.notes = [];
  if (!noteById(id) || G.notes.includes(id)) return false;
  G.notes.push(id);
  G.saveDirty = true;
  return true;
}
export function notesForIsland(islId) {
  // 1 catatan unik per pulau; rotasi berdasar id pulau supaya koleksi berjalan
  return NOTES[islId % NOTES.length].id;
}
