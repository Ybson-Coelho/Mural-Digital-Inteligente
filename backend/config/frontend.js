const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

const origensPermitidas = [
  FRONTEND_URL,
  FRONTEND_URL.replace("localhost", "127.0.0.1"),
  FRONTEND_URL.replace("127.0.0.1", "localhost"),
].filter((url, index, arr) => arr.indexOf(url) === index);

module.exports = {
  FRONTEND_URL,
  origensPermitidas,
};
