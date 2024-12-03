const config = {
  server: "DESKTOP-MAJ4LBL\\SQLEXPRESS",
  database: "Yazlab2",
  driver: "msnodesqlv8",
  user: "admin",
  password: "admin",
  options: {
    encrypt: false,
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

module.exports = config;
