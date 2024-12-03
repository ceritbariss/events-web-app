// Form alanları
const formAd = document.querySelector('input[name="e_ad"]');
const formKategori = document.querySelector('select[name="e_kategori"]');
const formKonum = document.querySelector('input[name="e_konum"]');
const formTarih = document.querySelector('input[name="e_tarih"]');
const formBasSaat = document.querySelector('input[name="e_bassaat"]');
const formFoto = document.querySelector('input[name="e_foto"]');
const formbitisTarih = document.querySelector('input[name="e_bitisTarih"]');
const formsonSaat = document.querySelector('input[name="e_sonSaat"]');

// Önizleme alanları
const previewAd = document.getElementById("etkinlik-adi");
const previewKategori = document.getElementById("etkinlik-kategori");
const previewKonum = document.getElementById("etkinlik-konum");
const previewBaslangic = document.getElementById("etkinlik-baslangic");
const previewBitis = document.getElementById("etkinlik-bitis");
const previewImage = document.getElementById("etkinlik-img");

formAd.addEventListener("input", () => {
  previewAd.textContent = formAd.value || "Etkinlik Adı";
});

formKategori.addEventListener("change", () => {
  previewKategori.textContent = formKategori.value || "Kategori";
});

formKonum.addEventListener("input", () => {
  previewKonum.textContent = formKonum.value || "Konum";
});

function updateBaslangic() {
  if (formTarih.value && formBasSaat.value) {
    const tarih = new Date(`${formTarih.value}T${formBasSaat.value}`);

    const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    previewBaslangic.textContent = tarihFormat.format(tarih);
  } else {
    previewBaslangic.textContent = "Başlangıç";
  }
}

function updateBitis() {
  if (formbitisTarih.value && formsonSaat.value) {
    const tarih = new Date(`${formbitisTarih.value}T${formsonSaat.value}`);

    const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    previewBitis.textContent = tarihFormat.format(tarih);
  } else {
    previewBitis.textContent = "Bitiş";
  }
}

function addEventListenerMulti(element, events, handler) {
  events
    .split(" ")
    .forEach((event) => element.addEventListener(event, handler));
}

addEventListenerMulti(formTarih, "input change", updateBaslangic);
addEventListenerMulti(formBasSaat, "input change", updateBaslangic);
addEventListenerMulti(formbitisTarih, "input change", updateBitis);
addEventListenerMulti(formsonSaat, "input change", updateBitis);

formFoto.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result; // Resim önizleme
    };
    reader.readAsDataURL(file);
  }
});
