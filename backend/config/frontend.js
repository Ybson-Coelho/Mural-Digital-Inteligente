const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

const origens = FRONTEND_URL.split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const origensPermitidas = [];
for (const url of origens) {
  origensPermitidas.push(url);
  if (url.includes("localhost")) {
    origensPermitidas.push(url.replace("localhost", "127.0.0.1"));
  }
}

module.exports = {
  FRONTEND_URL,
  origensPermitidas: [...new Set(origensPermitidas)],
};
