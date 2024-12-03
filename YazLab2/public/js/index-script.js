"use strict";

const giris = document.querySelector(".giris");
const kaplama = document.querySelector(".kaplama");
const girisKapat = document.querySelector(".giris-kapat");
const girisAc = document.querySelectorAll(".show-modal");
const kayit = document.querySelector(".kayit");
const kayitKapat = document.querySelector(".kayit-kapat");

window.addEventListener("DOMContentLoaded", function () {
  const errorMessage = document.getElementById("error-message");
  if (errorMessage) {
    giris.classList.remove("gizle");
    kaplama.classList.remove("gizle");

    closeGiris();
  }
});

const closeKayit = function () {
  kayitKapat.addEventListener("click", function () {
    kayit.classList.add("gizle");
    kaplama.classList.add("gizle");
  });
};

const closeGiris = function () {
  girisKapat.addEventListener("click", function () {
    giris.classList.add("gizle");
    kaplama.classList.add("gizle");
  });
};

for (let i = 0; i < 2; i++) {
  girisAc[i].addEventListener("click", function () {
    const islem = girisAc[i].firstChild.textContent;
    if (islem === "Kayıt Ol") {
      kayit.classList.remove("gizle");
      kaplama.classList.remove("gizle");
      closeKayit();
    }
    if (islem === "Giriş") {
      giris.classList.remove("gizle");
      kaplama.classList.remove("gizle");
      closeGiris();
    }
  });
}
