# Whatsapp API Tutorial

Hi, this is the implementation example of <a href="https://github.com/pedroslopez/whatsapp-web.js">whatsapp-web.js</a>

Watch the tutorials:

- <a href="https://youtu.be/IRRiN2ZQDc8">Whatsapp API Tutorial: Part 1</a>
- <a href="https://youtu.be/hYpRQ_FE1JI">Whatsapp API Tutorial: Part 2</a>
- <a href="https://youtu.be/uBu7Zfba1zA">Whatsapp API Tutorial: Tips & Tricks</a>
- <a href="https://youtu.be/ksVBXF-6Jtc">Whatsapp API Tutorial: Sending Media File</a>
- <a href="https://youtu.be/uSzjbuaHexk">Whatsapp API Tutorial: Deploy to Heroku</a>
- <a href="https://youtu.be/5VfM9PvrYcE">Whatsapp API Tutorial: Multiple Device</a>
- <a href="https://youtu.be/Cq8ru8iKAVk">Whatsapp API Tutorial: Multiple Device | Part 2</a>
- <a href="https://youtu.be/bgxxUWqW6WU">Whatsapp API Tutorial: Fix Heroku Session</a>
- <a href="https://youtu.be/iode8kstDYQ">Whatsapp API Tutorial: Dynamic Message Reply</a>
- <a href="https://youtu.be/PF_MWklEQpM">Whatsapp API Tutorial: Fix Session & Support for Multi-Device Beta</a>

## Important thing!

As because Whatsapp regularly makes an update, so we needs to always **use the latest version of whatsapp-web.js**. Some errors may occurs with the old versions, so please try to update the library version before creating an issue.

### How to use?

- Clone or download this repo
- Enter to the project directory
- Run `npm install`
- Run `npm run start:dev`
- Open browser and go to address `http://localhost:8000`
- Scan the QR Code
- Enjoy!

### Send message to group

You can send the message to any group by using `chatID` or group `name`, chatID will used if you specify the `id` field in the form, so if you want to send by `name`, only use name.

**Paramaters:**

- `id` (optional if name given): the chat ID
- `name` (optional): group name
- `message`: the message

Here the endpoint: `/send-group-message`

Here the way to get the groups info (including ID & name):

- Send a message to the API number `!groups`
- The API will replying with the groups info
- Use the ID to send a message

### Downloading media

I add an example to downloading the message media if exists. Please check it in `on message` event!

We use `mime-types` package to get the file extension by it's mimetype, so we can download all of the type of media message.

And we decided (for this example) to use time as the filename, because the media filename is not certain exists.

## Support Me

You can make a support for this work by [DONATING](./DONATE.md). Thank you. (Note: DONATE.md has been removed for a cleaner repo, consider supporting the original author).

---

## Update dari Agustinus

Proyek ini telah mengalami beberapa pembaruan besar untuk meningkatkan struktur, transparansi, dan stabilitas:

### 1. Modularisasi Kode
Logika aplikasi telah dipisah menjadi beberapa modul di folder `modular/` dan `bot.js`. Hal ini membuat pemeliharaan kode menjadi jauh lebih mudah dan struktur aplikasi lebih bersih.

### 2. Sistem Logging & Monitoring
- **Automated Logs**: Sekarang setiap request dan aktivitas client dicatat otomatis ke dalam folder `logs/`.
- **Log Monitoring UI**: Tersedia endpoint `/logs` untuk memantau aktivitas sistem secara real-time langsung dari browser.

### 3. Dashboard Interaktif
Halaman utama (`/`) telah diperbarui dengan antarmuka yang modern untuk memudahkan navigasi ke endpoint API, dokumentasi Swagger, dan sistem log.

### 4. Prasyarat Host Linux (Headless)
Agar browser Chrome (Puppeteer) dapat berjalan lancar di lingkungan Linux tanpa GUI (headless), jalankan perintah ini terlebih dahulu untuk menginstal library sistem:

```bash
sudo apt update && sudo apt install -y libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libasound2t64 libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libnss3 libnspr4
```
*(Catatan: Jika Anda menggunakan Ubuntu versi sebelum 24.04, hapus akhiran `t64` pada nama paket di atas).*

### 5. Keamanan & Kebersihan Repo
- Penambahan `.gitignore` untuk memastikan data sensitif dan file build tidak masuk ke dalam repository.
- Pembersihan berkala file-file legacy yang tidak digunakan.

### 6. Docker Deployment (Portable Image)
Aplikasi ini dapat dijalankan dalam kontainer Docker untuk memastikan portabilitas tinggi dan kemudahan pemindahan antar server ("seperti disk").

**Cara Build Image:**
```bash
npm run docker:build
```

**Cara Simpan Image ke File (Untuk dipindah antar server):**
```bash
npm run docker:save
```
Perintah ini akan menghasilkan file `whatsapp-api-image.tar`.

**Cara Load & Jalankan di Server Baru:**
1. Pindahkan file `.tar` ke server baru.
2. Load image: `docker load < whatsapp-api-image.tar`
3. Jalankan kontainer dengan persistence (Volume):
   ```bash
   docker run -d \
     -p 8000:8000 \
     -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
     --name wa-api \
     whatsapp-api
   ```
   *Catatan: Mapping volume `-v` sangat penting agar sesi login WhatsApp tidak hilang saat kontainer direstart.*

### 7. Perbaikan Browser Launch (Bug Fix)
Kami telah memperbaiki masalah di mana browser Chrome gagal dijalankan pada beberapa environment Linux (khususnya saat dijalankan sebagai `root`). Perbaikan meliputi penambahan flag stabilitas Puppeteer: `--disable-namespace-sandbox`, `--no-zygote`, dll.
