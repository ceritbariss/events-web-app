const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const db = require("../data/db");
const sql = require("mssql/msnodesqlv8");
const fileUpload = require("express-fileupload");
const multer = require("multer");
const { user } = require("../config");
const upload = multer({ dest: "public/img/user" });
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.use(fileUpload());
router.use(bodyParser.urlencoded({ extended: true }));

function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/");
  }
  next();
}

//ETKİNLİK EKLE
router.get("/etkinlik-ekle", authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const userRequest = new sql.Request();
    const userResult = await userRequest
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM Kullanicilar WHERE kullaniciID = @userId");

    if (userResult.recordset.length > 0) {
      res.render("etkinlik-ekle", {
        user: userResult.recordset[0],
      });
    } else {
      res.redirect("/");
      res.status(404).send("Kullanıcı veya etkinlik bulunamadı.");
    }
  } catch (err) {
    console.error("Veritabanı hatası:", err);
    res.status(500).send("Sunucu hatası.");
  }
});

router.post("/etkinlik-ekle", authMiddleware, async (req, res) => {
  const {
    e_ad,
    e_kategori,
    e_tarih,
    e_bassaat,
    e_konum,
    e_bitisTarih,
    e_sonSaat,
  } = req.body;

  const e_foto = req.files?.e_foto;
  let kategori = e_kategori ? e_kategori.toLowerCase() : "";

  if (e_foto) {
    const filePath = `/img/etkinlik/${kategori}/${e_foto.name}`;
    console.log(filePath);
    await e_foto.mv(`./public${filePath}`);
  }

  try {
    const request = new sql.Request();

    await request
      .input("etkinlikAdi", sql.VarChar, e_ad)
      .input("etkinlikKategori", sql.VarChar, e_kategori)
      .input(
        "etkinlikFoto",
        sql.VarChar,
        e_foto ? `img/etkinlik/${kategori}/${e_foto.name}` : null
      )
      .input("etkinlikTarih", sql.Date, e_tarih)
      .input("etkinlikSaat", sql.Time, e_bassaat)
      .input("etkinlikKonum", sql.VarChar, e_konum)
      .input("etkinlikBitisTarih", sql.Date, e_bitisTarih)
      .input("etkinlikBitisSaat", sql.Time, e_sonSaat).query(`
        INSERT INTO Etkinlikler (
          etkinlikAdi,
          etkinlikKategori,
          etkinlikFoto,
          etkinlikTarih,
          etkinlikSaat,
          etkinlikKonum,
          etkinlikBitisTarih,
          etkinlikBitisSaat
        ) VALUES (
          @etkinlikAdi,
          @etkinlikKategori,
          @etkinlikFoto,
          @etkinlikTarih,
          @etkinlikSaat,
          @etkinlikKonum,
          @etkinlikBitisTarih,
          @etkinlikBitisSaat
        )
      `);

    res.redirect("/user-index");
  } catch (err) {
    console.error("Etkinlik eklenirken hata:", err);
    res.status(500).send("Etkinlik eklenirken bir hata oluştu.");
  }
});

//ETKİNLİK-DETAY-SAYFASI
router.get("/etkinlik-detay", authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const eventId = req.query.eventId;

  try {
    const userRequest = new sql.Request();
    const userResult = await userRequest
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM Kullanicilar WHERE kullaniciID = @userId");

    const eventRequest = new sql.Request();
    const eventResult = await eventRequest.input("eventId", sql.Int, eventId)
      .query(`
        SELECT 
          etkinlikID,
          etkinlikAdi,
          etkinlikKategori,
          etkinlikKonum,
          CONVERT(VARCHAR, etkinlikTarih, 104) AS etkinlikTarih,
          LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
          etkinlikFoto,
          etkinlikAciklama,
          CONVERT(VARCHAR, etkinlikBitisTarih, 104) AS etkinlikBitisTarih,
          LEFT(CONVERT(VARCHAR, etkinlikBitisSaat, 108), 5) AS etkinlikBitisSaat
        FROM Etkinlikler
        WHERE etkinlikID = @eventId
      `);

    const katilimSonucRequest = new sql.Request();
    const katilimSonuc = await katilimSonucRequest
      .input("userId", sql.Int, userId)
      .input("eventId", sql.Int, eventId).query(`
        SELECT * FROM Katilimcilar
        WHERE kullaniciID = @userId AND etkinlikID = @eventId
      `);

    const katildiMi = katilimSonuc.recordset.length > 0;

    const yorumlarRequest = new sql.Request();
    const yorumlarResult = await yorumlarRequest.input(
      "eventId",
      sql.Int,
      eventId
    ).query(`
        SELECT m.mesajMetin, m.mesajZaman, k.kullaniciAdi, k.kullaniciFoto
        FROM Mesajlar m
        INNER JOIN Kullanicilar k ON m.mesajGID = k.kullaniciID
        WHERE m.etkinlikID = @eventId
        ORDER BY m.mesajZaman DESC
      `);

    if (eventResult.recordset.length > 0 && userResult.recordset.length > 0) {
      res.render("etkinlik-detay", {
        event: eventResult.recordset[0],
        user: userResult.recordset[0],
        katildiMi: katildiMi,
        yorumlar: yorumlarResult.recordset,
      });
    } else {
      res.redirect("/");
      res.status(404).send("Kullanıcı veya etkinlik bulunamadı.");
    }
  } catch (err) {
    console.error("Veritabanı hatası:", err);
    res.status(500).send("Sunucu hatası.");
  }
});

router.get("/get-location-data", async (req, res) => {
  const userId = req.session.userId;
  const eventId = req.query.eventId;

  try {
    const userRequest = new sql.Request();
    const userResult = await userRequest
      .input("userId", sql.Int, userId)
      .query(
        "SELECT kullaniciKonum FROM Kullanicilar WHERE kullaniciID = @userId"
      );

    const eventRequest = new sql.Request();
    const eventResult = await eventRequest.input("eventId", sql.Int, eventId)
      .query(`
        SELECT etkinlikKonum FROM Etkinlikler WHERE etkinlikID = @eventId
      `);

    if (userResult.recordset.length > 0 && eventResult.recordset.length > 0) {
      res.json({
        userKonum: userResult.recordset[0].kullaniciKonum,
        eventKonum: eventResult.recordset[0].etkinlikKonum,
      });
    } else {
      res.status(404).json({ message: "Veri bulunamadı." });
    }
  } catch (err) {
    console.error("Veritabanı hatası:", err);
    res.status(500).send("Sunucu hatası.");
  }
});

router.post("/yorum-ekle", authMiddleware, async (req, res) => {
  const { mesajMetin } = req.body;
  const eventId = req.query.eventId;
  const userId = req.session.userId;

  try {
    const katilimKontrolRequest = new sql.Request();
    const katilimKontrol = await katilimKontrolRequest
      .input("kullaniciID", sql.Int, userId)
      .input("etkinlikID", sql.Int, eventId).query(`
        SELECT 1 FROM Katilimcilar
        WHERE kullaniciID = @kullaniciID AND etkinlikID = @etkinlikID
      `);

    if (katilimKontrol.recordset.length === 0) {
      return res.redirect(
        `/etkinlik-detay?userId=${userId}&eventId=${eventId}`
      );
    }

    const yeniYorumRequest = new sql.Request();
    const yeniYorumResult = await yeniYorumRequest
      .input("mesajGID", sql.Int, userId)
      .input("etkinlikID", sql.Int, eventId)
      .input("mesajMetin", sql.VarChar, mesajMetin)
      .input("mesajZaman", sql.DateTime, new Date()).query(`
        INSERT INTO Mesajlar (mesajGID, etkinlikID, mesajMetin, mesajZaman)
        VALUES (@mesajGID, @etkinlikID, @mesajMetin, @mesajZaman)
      `);

    res.redirect(`/etkinlik-detay?userId=${userId}&eventId=${eventId}`);
  } catch (err) {
    console.error("Hata:", err);
    res.status(500).send("Bir hata oluştu.");
  }
});

router.post("/etkinlik-katil", authMiddleware, async (req, res) => {
  const userId = req.query.userId;
  const eventId = req.query.eventId;

  try {
    const request = new sql.Request();
    await request
      .input("userId", sql.Int, userId)
      .input("eventId", sql.Int, eventId).query(`
        INSERT INTO Katilimcilar (kullaniciID, etkinlikID)
        VALUES (@userId, @eventId)
      `);

    const toplamEtkinlikRequest = new sql.Request();
    const toplamEtkinlikResult = await toplamEtkinlikRequest
      .input("userId", sql.Int, userId)
      .query(
        `SELECT COUNT(*) AS etkinlikSayisi FROM Katilimcilar WHERE kullaniciID = @userId`
      );

    let katilimPuan = 10;

    if (toplamEtkinlikResult.recordset[0].etkinlikSayisi === 1) {
      katilimPuan = 30;
    }

    const puanRequest = new sql.Request();
    await puanRequest
      .input("userId", sql.Int, userId)
      .input("eventId", sql.Int, eventId)
      .input("puan", sql.Int, katilimPuan)
      .input("puanKazandigiTarih", sql.DateTime, new Date()).query(`
      INSERT INTO Puanlar (kullaniciID, puan, puanKazanilanTarih)
      VALUES (@userId, @puan, @puanKazandigiTarih)
    `);

    const kullaniciPuanRequest = new sql.Request();
    await kullaniciPuanRequest
      .input("userId", sql.Int, userId)
      .input("katilimPuan", sql.Int, katilimPuan).query(`
      UPDATE Kullanicilar
      SET kullaniciPuan = kullaniciPuan + @katilimPuan
      WHERE kullaniciID = @userId
    `);

    res.redirect(`/etkinlik-detay?userId=${userId}&eventId=${eventId}`);
  } catch (err) {
    console.error("Hata:", err);
    res.status(500).send("Bir hata oluştu.");
  }
});

router.post("/etkinlik-sil", authMiddleware, async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    const request = new sql.Request();

    await request
      .input("userId", sql.Int, userId)
      .input("eventId", sql.Int, eventId).query(`
        DELETE FROM Katilimcilar
        WHERE kullaniciID = @userId AND etkinlikID = @eventId
      `);

    const toplamEtkinlikRequest = new sql.Request();
    const toplamEtkinlikResult = await toplamEtkinlikRequest
      .input("userId", sql.Int, userId)
      .query(
        `SELECT COUNT(*) AS etkinlikSayisi FROM Katilimcilar WHERE kullaniciID = @userId`
      );

    let bonusPuan = 0;
    if (toplamEtkinlikResult.recordset[0].etkinlikSayisi === 0) {
      bonusPuan = -20;
    }

    const katilimPuan = -10;

    const puanRequest = new sql.Request();
    await puanRequest
      .input("userId", sql.Int, userId)
      .input("eventId", sql.Int, eventId)
      .input("puan", sql.Int, katilimPuan + bonusPuan)
      .input("puanKazandigiTarih", sql.DateTime, new Date()).query(`
      INSERT INTO Puanlar (kullaniciID, puan, puanKazanilanTarih)
      VALUES (@userId, @puan, @puanKazandigiTarih)
    `);

    const kullaniciPuanRequest = new sql.Request();
    await kullaniciPuanRequest
      .input("userId", sql.Int, userId)
      .input("katilimPuan", sql.Int, katilimPuan + bonusPuan).query(`
        UPDATE Kullanicilar
        SET kullaniciPuan = kullaniciPuan + @katilimPuan
        WHERE kullaniciID = @userId
      `);

    res.redirect(`/user-page?id=${userId}`);
  } catch (err) {
    console.error("Silme işleminde hata:", err);
    res.status(500).send("Silme işlemi sırasında bir hata oluştu.");
  }
});

//USER-SAYFASI
router.get("/user-page", authMiddleware, async (req, res) => {
  const userId = req.session.userId;

  try {
    const resultRequest = new sql.Request();
    const result = await resultRequest
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM Kullanicilar WHERE kullaniciID = @userId");

    const eventsRequest = new sql.Request();
    const eventsResult = await eventsRequest.input("userId", sql.Int, userId)
      .query(`
        SELECT e.etkinlikAdi, e.etkinlikID 
        FROM Katilimcilar k
        INNER JOIN Etkinlikler e ON k.etkinlikID = e.etkinlikID
        WHERE k.kullaniciID = @userId
      `);

    if (result.recordset.length > 0) {
      res.render("user-page", {
        user: result.recordset[0],
        etkinlikler: eventsResult.recordset,
      });
    } else {
      res.redirect("/");
      res.status(404).send("Kullanıcı bulunamadı.");
    }
  } catch (err) {
    console.error("Veritabanı hatası:", err);
    res.status(500).send("Sunucu hatası.");
  }
});

router.post("/update-user", authMiddleware, async (req, res) => {
  const {
    kullaniciID,
    k_ad,
    k_soyad,
    k_kullaniciAdi,
    k_sifre,
    k_dt,
    k_cinsiyet,
    k_konum,
    k_eposta,
    k_telefon,
  } = req.body;

  const k_foto = req.files?.k_foto;
  if (k_foto) {
    const filePath = `/img/user/${k_foto.name}`;
    await k_foto.mv(`./public${filePath}`);
  }

  try {
    const request = new sql.Request();
    await request
      .input("kullaniciID", sql.Int, kullaniciID)
      .input("k_ad", sql.VarChar, k_ad)
      .input("k_soyad", sql.VarChar, k_soyad)
      .input("k_kullaniciAdi", sql.VarChar, k_kullaniciAdi)
      .input("k_sifre", sql.VarChar, k_sifre)
      .input("k_dt", sql.Date, k_dt)
      .input("k_cinsiyet", sql.VarChar, k_cinsiyet)
      .input("k_eposta", sql.VarChar, k_eposta)
      .input("k_konum", sql.VarChar, k_konum)
      .input("k_telefon", sql.VarChar, k_telefon)
      .input("k_foto", sql.VarChar, k_foto ? `img/user/${k_foto.name}` : null)
      .query(`
        UPDATE Kullanicilar 
        SET 
          kullaniciAd = @k_ad,
          kullaniciSoyad = @k_soyad,
          kullaniciAdi = @k_kullaniciAdi,
          kullaniciSifre = @k_sifre,
          kullaniciDt = @k_dt,
          kullaniciCinsiyet = @k_cinsiyet,
          kullaniciEposta = @k_eposta,
          kullaniciKonum = @k_konum,
          kullaniciTelefon = @k_telefon,
          kullaniciFoto = COALESCE(@k_foto, kullaniciFoto)
        WHERE kullaniciID = @kullaniciID
      `);

    res.redirect(`/user-page?id=${kullaniciID}`);
  } catch (err) {
    console.error("Güncelleme sırasında hata oluştu:", err);
    res.status(500).send("Güncelleme sırasında bir hata oluştu.");
  }
});

router.get("/user-index", authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const category = req.query.category;

  console.log(category);

  try {
    const request = new sql.Request();
    const result = await request
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM Kullanicilar WHERE kullaniciID = @userId");

    const user = result.recordset[0];
    const kullaniciIlgi = user.kullaniciIlgi
      ? user.kullaniciIlgi.split(",")
      : [];

    let eventQuery = `
      SELECT 
        etkinlikID,
        etkinlikAdi,
        etkinlikKategori,
        etkinlikKonum,
        CONVERT(VARCHAR, etkinlikTarih, 104) AS etkinlikTarih,
        LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
        etkinlikFoto
      FROM Etkinlikler
      WHERE onayliMi = 1
    `;

    if (category) {
      eventQuery += `AND etkinlikKategori = @category`;
      request.input("category", sql.VarChar, category);
    } else if (kullaniciIlgi.length > 0) {
      const ilgiler = kullaniciIlgi
        .map((_, index) => `@ilgi${index}`)
        .join(", ");
      eventQuery += ` AND etkinlikKategori IN (${ilgiler})`;

      kullaniciIlgi.forEach((ilgi, index) => {
        request.input(`ilgi${index}`, sql.VarChar, ilgi.trim());
      });
    }

    const eventResult = await request.query(eventQuery);

    if (result.recordset.length > 0) {
      res.render("user-index", {
        user: result.recordset[0],
        events: eventResult.recordset,
        category: category,
      });
    } else {
      res.redirect("/");
      res.status(404).send("Kullanıcı bulunamadı.");
    }
  } catch (err) {
    console.error("Veritabanı hatası:", err);
    res.status(500).send("Sunucu hatası.");
  }
});

//ADMİN SAYFASI
router.get("/admin-index", authMiddleware, async (req, res) => {
  try {
    const onaysizEtkinlikRequest = new sql.Request();
    const onaysizEtkinlikResult = await onaysizEtkinlikRequest.query(`
      SELECT etkinlikID, etkinlikAdi, etkinlikKategori, etkinlikKonum, etkinlikFoto, 
             CONVERT(VARCHAR, etkinlikTarih, 104) AS etkinlikTarih,
             LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
             CONVERT(VARCHAR, etkinlikBitisTarih, 104) AS etkinlikBitisTarih,
             LEFT(CONVERT(VARCHAR, etkinlikBitisSaat, 108), 5) AS etkinlikBitisSaat 
      FROM Etkinlikler 
      WHERE onayliMi = 0
    `);

    const onayliEtkinlikRequest = new sql.Request();
    const onayliEtkinlikResult = await onayliEtkinlikRequest.query(`
      SELECT etkinlikID, etkinlikAdi, etkinlikKategori, etkinlikKonum, etkinlikFoto, 
             CONVERT(VARCHAR(10), etkinlikTarih, 23) AS etkinlikTarih,
             LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
             CONVERT(VARCHAR(10), etkinlikBitisTarih, 23) AS etkinlikBitisTarih,
             LEFT(CONVERT(VARCHAR, etkinlikBitisSaat, 108), 5) AS etkinlikBitisSaat 
      FROM Etkinlikler 
      WHERE onayliMi = 1
    `);

    res.render("admin-index", {
      onaysizEtkinlikler: onaysizEtkinlikResult.recordset,
      onayliEtkinlikler: onayliEtkinlikResult.recordset,
    });
  } catch (err) {
    console.error("Etkinlikleri alırken hata:", err);
    res.status(500).send("Etkinlikler alınamadı.");
  }
});

router.post("/admin-index/guncelle", authMiddleware, async (req, res) => {
  const {
    etkinlikID,
    etkinlikAdi,
    etkinlikKategori,
    etkinlikKonum,
    etkinlikTarih,
    etkinlikSaat,
    etkinlikBitisTarih,
    etkinlikBitisSaat,
  } = req.body;

  const etkinlikFoto = req.files?.etkinlikFoto;
  if (etkinlikFoto) {
    const filePath = `/img/etkinlik/${etkinlikKategori}/${etkinlikFoto.name}`;
    await etkinlikFoto.mv(`./public${filePath}`);
  }

  try {
    const request = new sql.Request();
    await request
      .input("etkinlikID", sql.Int, etkinlikID)
      .input("etkinlikAdi", sql.NVarChar, etkinlikAdi)
      .input("etkinlikKategori", sql.NVarChar, etkinlikKategori)
      .input("etkinlikKonum", sql.NVarChar, etkinlikKonum)
      .input("etkinlikTarih", sql.Date, etkinlikTarih)
      .input("etkinlikSaat", sql.Time, etkinlikSaat)
      .input("etkinlikBitisTarih", sql.Date, etkinlikBitisTarih)
      .input("etkinlikBitisSaat", sql.Time, etkinlikBitisSaat)
      .input(
        "etkinlikFoto",
        sql.VarChar,
        etkinlikFoto
          ? `img/etkinlik/${etkinlikKategori}/${etkinlikFoto.name}`
          : null
      ).query(`
        UPDATE Etkinlikler 
        SET etkinlikAdi = @etkinlikAdi, 
            etkinlikKategori = @etkinlikKategori, 
            etkinlikKonum = @etkinlikKonum, 
            etkinlikTarih = @etkinlikTarih, 
            etkinlikSaat = @etkinlikSaat, 
            etkinlikBitisTarih = @etkinlikBitisTarih, 
            etkinlikBitisSaat = @etkinlikBitisSaat,
            etkinlikFoto = COALESCE(@etkinlikFoto, etkinlikFoto)
        WHERE etkinlikID = @etkinlikID
      `);

    res.redirect("/admin-index");
  } catch (err) {
    console.error("Etkinlik güncellenirken hata:", err);
    res.status(500).send("Etkinlik güncellenemedi.");
  }
});

router.post("/admin-index/onayla", authMiddleware, async (req, res) => {
  const { etkinlikID } = req.body;

  try {
    const request = new sql.Request();

    await request.input("etkinlikID", sql.Int, etkinlikID).query(`
        UPDATE Etkinlikler 
        SET onayliMi = 1 
        WHERE etkinlikID = @etkinlikID
      `);

    res.redirect("/admin-index");
  } catch (err) {
    console.error("Etkinlik onaylanırken hata:", err);
    res.status(500).send("Etkinlik onaylanamadı.");
  }
});

router.post("/admin-index/sil", authMiddleware, async (req, res) => {
  const { etkinlikID } = req.body;

  try {
    const request = new sql.Request();

    await request.input("etkinlikID", sql.Int, etkinlikID).query(`
        DELETE FROM Etkinlikler 
        WHERE etkinlikID = @etkinlikID
      `);

    res.redirect("/admin-index");
  } catch (err) {
    console.error("Etkinlik silinirken hata:", err);
    res.status(500).send("Etkinlik silinemedi.");
  }
});

// GİRİŞ SAYFASI
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const category = req.query.category;

  try {
    const request = new sql.Request();
    const result = await request
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, password)
      .query(
        "SELECT * FROM Kullanicilar WHERE kullaniciAdi = @username AND kullaniciSifre = @password"
      );

    let eventQuery = `
      SELECT 
        etkinlikID,
        etkinlikAdi,
        etkinlikKategori,
        etkinlikKonum,
        CONVERT(VARCHAR, etkinlikTarih, 104) AS etkinlikTarih,
        LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
        etkinlikFoto
      FROM Etkinlikler
      WHERE onayliMi = 1
    `;

    if (category) {
      eventQuery += ` WHERE etkinlikKategori = @category`;
      request.input("category", sql.VarChar, category);
    }

    const eventResult = await request.query(eventQuery);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const userId = user.kullaniciID;
      const isAdmin = user.adminMi;

      req.session.userId = userId;

      if (isAdmin === 1) {
        res.redirect(`/admin-index`);
      } else {
        res.redirect(`/user-index?id=${userId}`);
      }
    } else {
      console.log("Geçersiz kullanıcı adı veya şifre");
      res.render("index", {
        events: eventResult.recordset,
        category: category,
        errorMessage: "Hatalı kullanıcı adı veya şifre girdiniz.",
      });
    }
  } catch (err) {
    console.error("Giriş işlemi sırasında hata oluştu:", err);
    res.status(500).send("Giriş sırasında bir hata oluştu.");
  }
});

//ÇIKIŞ SAYFASI
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Oturum sonlandırılamadı:", err);
      return res.status(500).send("Çıkış sırasında bir hata oluştu.");
    }
    res.redirect("/");
  });
});

//KAYIT SAYFASI
router.post("/register", async (req, res) => {
  const {
    k_ad,
    k_soyad,
    k_kullaniciAdi,
    k_sifre,
    k_dt,
    k_cinsiyet,
    k_konum,
    k_eposta,
    k_telefon,
  } = req.body;
  const k_ilgi = req.body.k_ilgi || [];
  const k_foto = req.files?.k_foto;

  try {
    const request = new sql.Request();

    if (k_foto) {
      const filePath = `/img/user/${k_foto.name}`;
      await k_foto.mv(`./public${filePath}`);
    }

    await request
      .input("k_ad", sql.VarChar, k_ad)
      .input("k_soyad", sql.VarChar, k_soyad)
      .input("k_kullaniciAdi", sql.VarChar, k_kullaniciAdi)
      .input("k_sifre", sql.VarChar, k_sifre)
      .input("k_dt", sql.Date, k_dt)
      .input("k_cinsiyet", sql.VarChar, k_cinsiyet)
      .input("k_konum", sql.VarChar, k_konum)
      .input("k_eposta", sql.VarChar, k_eposta)
      .input("k_telefon", sql.VarChar, k_telefon)
      .input("k_ilgi", sql.VarChar, k_ilgi.join(","))
      .input("k_foto", sql.VarChar, k_foto ? `img/user/${k_foto.name}` : null)
      .query(`
        INSERT INTO Kullanicilar (kullaniciAd, kullaniciSoyad, kullaniciAdi, kullaniciSifre, kullaniciDt, kullaniciCinsiyet, kullaniciKonum ,kullaniciEposta, kullaniciTelefon, kullaniciIlgi, kullaniciFoto)
        VALUES (@k_ad, @k_soyad, @k_kullaniciAdi, @k_sifre, @k_dt, @k_cinsiyet, @k_konum ,@k_eposta, @k_telefon, @k_ilgi, @k_foto)
      `);

    res.redirect("/");
  } catch (err) {
    console.error("Kayıt sırasında hata:", err);
    res.status(500).send("Kayıt işlemi sırasında bir hata oluştu.");
  }
});

router.get("/", async (req, res) => {
  const category = req.query.category;

  try {
    const request = new sql.Request();

    let eventQuery = `
      SELECT 
        etkinlikID,
        etkinlikAdi,
        etkinlikKategori,
        etkinlikKonum,
        CONVERT(VARCHAR, etkinlikTarih, 104) AS etkinlikTarih,
        LEFT(CONVERT(VARCHAR, etkinlikSaat, 108), 5) AS etkinlikSaat,
        etkinlikFoto
      FROM Etkinlikler
      WHERE onayliMi = 1
    `;

    if (category) {
      eventQuery += `AND etkinlikKategori = @category`;
      request.input("category", sql.VarChar, category);
    }

    const eventResult = await request.query(eventQuery);

    res.render("index", {
      events: eventResult.recordset,
      category: category,
    }); // Etkinlik bilgilerini EJS dosyasına gönderin
  } catch (err) {
    console.error("Etkinlik bilgilerini alırken hata:", err);
    res.status(500).send("Etkinlik bilgilerini alırken bir hata oluştu.");
  }
});

module.exports = router;
