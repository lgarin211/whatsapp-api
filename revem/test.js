const axios = require('axios');

// Ganti nomor tujuan di bawah (gunakan format internasional tanpa +, contoh: 628xxx)
const nomorTujuan = '082111424592';
const pesan = 'Halo! Ini adalah pesan percobaan dari script test.js';

// Port default adalah 8000 (cek index.js jika Anda mengubahnya)
const PORT = 8000;

async function kirimPesan() {
    try {
        const response = await axios.post(`http://localhost:${PORT}/send-message`, {
            number: nomorTujuan,
            message: pesan
        });

        console.log('Berhasil!');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Gagal mengirim pesan.');
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error('Error:', error.message);
        }
    }
}

kirimPesan();
